"""SPHEREx Level 2 spectral-image support for WiseView.

Data source: IRSA SIA (https://irsa.ipac.caltech.edu/SIA) plus the IRSA cutout
service. Nothing here requires credentials.

The public SPHEREx archive serves one multi-extension FITS file per detector per
visit. We download small cutouts (default 0.08 deg) instead of the full 70 MB
files, cache them on disk, and render one PNG per visit so the existing
WiseView canvas can blink them.
"""

from __future__ import annotations

import hashlib
import io
import math
import re
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import requests
from astropy.io import fits
from astropy.io.votable import parse_single_table
from astropy.wcs import WCS
import astropy.units as u
from PIL import Image

from wv import config

USER_AGENT = "WiseView-SPHEREx/1.0 (+https://github.com/backyardworlds/wiseview)"

DETECTOR_RE = re.compile(r"D([1-6])(?=[_-])")
VISIT_RE = re.compile(r"(?:^|_)D[1-6](?:[_-]|$)")

# Bump when the rendering algorithm changes so cached PNGs are rebuilt.
RENDER_VERSION = 2


def field_id(ra: float, dec: float) -> str:
    """Stable directory name for a sky position."""
    return f"ra{ra:.4f}_dec{dec:+.4f}".replace("+", "p").replace("-", "m")


def _session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": USER_AGENT})
    return s


def _request_with_retry(session: requests.Session, url: str, **kwargs) -> requests.Response:
    last_error: Exception | None = None
    for attempt in range(config.SPHEREX_RETRIES):
        try:
            resp = session.get(url, timeout=config.SPHEREX_HTTP_TIMEOUT, **kwargs)
            body = resp.content[:64].lstrip().lower()
            if resp.status_code == 200 and not body.startswith(b"server busy"):
                return resp
            last_error = RuntimeError(
                f"HTTP {resp.status_code} from {url}: "
                f"{resp.content[:120].decode('utf-8', 'replace')}"
            )
        except requests.RequestException as exc:  # network hiccup
            last_error = exc
        time.sleep(min(2 ** attempt, 30))
    raise RuntimeError(f"SPHEREx request failed after retries: {last_error}")


def query_sia(ra: float, dec: float, radius_deg: float,
              collection: str | None = None) -> list[dict[str, Any]]:
    """Return SIA rows for one sky position."""
    collection = collection or config.SPHEREX_COLLECTION
    params = {
        "POS": f"CIRCLE {ra:.6f} {dec:.6f} {max(radius_deg, 1e-4):.6f}",
        "COLLECTION": collection,
    }
    with _session() as s:
        resp = _request_with_retry(s, config.IRSA_SIA_URL, params=params)

    table = parse_single_table(io.BytesIO(resp.content)).to_table(use_names_over_ids=True)
    rows: list[dict[str, Any]] = []
    names = set(table.colnames)
    for row in table:
        rec = {name: row[name] for name in names}
        url = str(rec.get("access_url") or "")
        obs_id = str(rec.get("obs_id") or "")
        match = DETECTOR_RE.search(obs_id) or DETECTOR_RE.search(url)
        detector = f"D{match.group(1)}" if match else None
        rows.append({
            "obs_id": obs_id,
            "access_url": url,
            "detector": detector,
            "t_min": _as_float(rec.get("t_min")),
            "t_max": _as_float(rec.get("t_max")),
            "em_min": _as_float(rec.get("em_min")),
            "em_max": _as_float(rec.get("em_max")),
            "collection": str(rec.get("obs_collection") or collection),
            "facility": str(rec.get("facility_name") or "SPHEREx"),
        })
    return rows


def _as_float(value: Any) -> float | None:
    try:
        out = float(value)
    except (TypeError, ValueError):
        return None
    return out if math.isfinite(out) else None


def select_visits(rows: list[dict[str, Any]], detector: str,
                  limit: int | None = None) -> list[dict[str, Any]]:
    """Filter to one detector and return unique visits sorted by time."""
    seen: dict[str, dict[str, Any]] = {}
    for row in rows:
        if row.get("detector") != detector or not row.get("access_url"):
            continue
        key = row["obs_id"] or row["access_url"]
        if key in seen:
            continue
        # The IRSA cutout service expects MJD in t_min/t_max.
        mjd = row.get("t_min")
        if mjd is None:
            continue
        seen[key] = row
    visits = sorted(seen.values(), key=lambda r: r["t_min"])
    if limit:
        # Keep the earliest and latest plus an even sample in between.
        if len(visits) > limit:
            idx = np.linspace(0, len(visits) - 1, limit).round().astype(int)
            visits = [visits[i] for i in sorted(set(idx.tolist()))]
    return visits


def _safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", value)[:180]


def download_cutout(url: str, ra: float, dec: float, size_deg: float,
                    destination: Path) -> Path:
    """Download one IRSA cutout to disk. Cached by file existence."""
    if destination.exists() and destination.stat().st_size > 1024:
        return destination
    destination.parent.mkdir(parents=True, exist_ok=True)
    sep = "&" if "?" in url else "?"
    cutout_url = f"{url}{sep}center={ra:.6f},{dec:.6f}d&size={size_deg:.6f}"
    with _session() as s:
        resp = _request_with_retry(s, cutout_url)
    if not resp.content.startswith(b"SIMPLE"):
        raise RuntimeError(
            f"IRSA did not return FITS for {cutout_url}: "
            f"{resp.content[:120].decode('utf-8', 'replace')}"
        )
    tmp = destination.with_suffix(destination.suffix + ".part")
    tmp.write_bytes(resp.content)
    tmp.replace(destination)
    return destination


def prepare_visits(ra: float, dec: float, detector: str,
                   size_deg: float | None = None,
                   limit: int | None = None,
                   collection: str | None = None) -> dict[str, Any]:
    """Query IRSA and cache all cutouts for one field/detector."""
    size_deg = size_deg or config.SPHEREX_CUTOUT_SIZE_DEG
    limit = limit or config.SPHEREX_MAX_VISITS
    fid = field_id(ra, dec)
    field_dir = config.DATA_DIR / "spherex" / fid
    cutout_dir = field_dir / "cutouts"
    field_dir.mkdir(parents=True, exist_ok=True)

    manifest_path = field_dir / f"manifest_{detector}.json"
    existing = load_manifest(ra, dec, detector)
    if existing and _manifest_matches(existing, detector, size_deg, collection):
        # Reuse an existing field: avoids a new SIA query and new downloads on
        # every browser refresh.
        return existing

    rows = query_sia(ra, dec, radius_deg=size_deg / 2.0, collection=collection)
    visits = select_visits(rows, detector, limit=limit)
    if not visits:
        raise LookupError(
            f"No SPHEREx {detector} visits found at RA={ra:.5f}, Dec={dec:+.5f}. "
            "Try another field or detector."
        )

    cached = []
    failures = []

    def _fetch(visit):
        name = _safe_name(visit["obs_id"] or hashlib.md5(visit["access_url"].encode()).hexdigest())
        path = cutout_dir / f"{detector}_{name}.fits"
        try:
            download_cutout(visit["access_url"], ra, dec, size_deg, path)
            return visit, path, None
        except Exception as exc:
            return visit, path, exc

    # IRSA cutout requests are independent; a few workers keep first-run
    # latency reasonable without hammering the service.
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(_fetch, visits))

    for visit, path, error in results:
        if error is not None:
            failures.append(f"{visit['obs_id']}: {error}")
            continue
        cached.append({
            "obs_id": visit["obs_id"],
            "mjd": visit["t_min"],
            "mjd_min": visit.get("t_min"),
            "mjd_max": visit.get("t_max"),
            "detector": detector,
            "url": visit["access_url"],
            "file": path.relative_to(config.DATA_DIR).as_posix(),
            "collection": visit.get("collection"),
        })

    if len(cached) < 2:
        detail = "; ".join(failures[:3]) if failures else "no usable cutouts"
        raise RuntimeError(
            f"Only {len(cached)} SPHEREx cutout(s) could be downloaded for "
            f"{detector}. IRSA may be busy; retry in a minute. {detail}"
        )

    manifest = {
        "dataset": "SPHEREx Level 2 spectral image",
        "field_id": fid,
        "ra_deg": ra,
        "dec_deg": dec,
        "detector": detector,
        "cutout_size_deg": size_deg,
        "collection": collection or config.SPHEREX_COLLECTION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "visits": cached,
    }
    _write_json(manifest_path, manifest)
    # Also keep a convenience copy of the most recent manifest.
    _write_json(field_dir / "manifest.json", manifest)
    return manifest


def _manifest_matches(manifest: dict[str, Any], detector: str,
                      size_deg: float, collection: str | None) -> bool:
    if manifest.get("detector") != detector:
        return False
    stored_size = manifest.get("cutout_size_deg")
    if stored_size is None or abs(float(stored_size) - float(size_deg)) > 1e-6:
        return False
    if collection and manifest.get("collection") != collection:
        return False
    return bool(manifest.get("visits"))


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    import json
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def wavelength_grid(hdul: fits.HDUList, detector: str = "D2") -> np.ndarray | None:
    """Return a 2D wavelength map (microns) from the WCS-WAVE extension."""
    image_hdu = hdul["IMAGE"] if "IMAGE" in hdul else hdul[0]
    data = image_hdu.data
    if data is None:
        return None
    ny, nx = data.shape
    try:
        spectral = WCS(image_hdu.header, fobj=hdul, key="W")
        spectral.sip = None
        xx, yy = np.meshgrid(np.arange(nx), np.arange(ny))
        world = spectral.pixel_to_world(xx, yy)
        # WCS-WAVE is a tabular WCS: pixel_to_world returns
        # [wavelength, bandwidth].
        wave = world[0] if isinstance(world, (list, tuple)) else world
        if hasattr(wave, "to"):
            values = wave.to(u.micron).value
        else:
            values = np.asarray(wave, dtype=float)
        values = np.asarray(values, dtype=float)
        if values.shape != data.shape:
            values = np.broadcast_to(values, data.shape).copy()
        return values
    except Exception:
        # Older cutouts may not carry the alternate WCS. Fall back to a linear
        # ramp across the slow axis so the UI still works.
        lo, hi = config.DETECTORS.get(detector, (1.11, 1.64))
        return np.tile(np.linspace(lo, hi, ny)[:, None], (1, nx))


def _row_wavelengths(wave: np.ndarray) -> np.ndarray:
    return np.nanmedian(wave, axis=1)


def wavelength_coverage(fits_path: Path, detector: str = "D2") -> tuple[float, float]:
    """Return the wavelength interval covered by one cutout (microns)."""
    with fits.open(fits_path, memmap=False) as hdul:
        wave = wavelength_grid(hdul, detector=detector)
    if wave is None:
        lo, hi = config.DETECTORS.get(detector, (1.11, 1.64))
        return float(lo), float(hi)
    rows = _row_wavelengths(wave)
    return float(np.nanmin(rows)), float(np.nanmax(rows))


def band_rows(wave: np.ndarray, wavelength: float | None) -> tuple[int, int, float, float]:
    """Pick the detector rows closest to a requested wavelength."""
    ny = wave.shape[0]
    rows = _row_wavelengths(wave)
    if wavelength is None or not math.isfinite(wavelength) or ny <= 64:
        return 0, ny, float(np.nanmin(rows)), float(np.nanmax(rows))
    # One row of the detector spans a small wavelength interval. Keep a band
    # wide enough to be visible but narrow enough to be meaningful.
    step = np.nanmedian(np.abs(np.diff(rows))) if ny > 1 else 0.01
    step = step if math.isfinite(step) and step > 0 else 0.01
    span = float(np.nanmax(rows) - np.nanmin(rows)) if ny > 1 else 0.5
    span = span if math.isfinite(span) and span > 0 else 0.5
    half = max(step * 8.0, span * 0.05)
    mask = np.abs(rows - wavelength) <= half
    if not mask.any():
        center = int(np.nanargmin(np.abs(rows - wavelength)))
        lo = max(center - 16, 0)
        hi = min(center + 17, ny)
    else:
        idx = np.flatnonzero(mask)
        lo, hi = int(idx[0]), int(idx[-1]) + 1
    # Never return a sliver: keep at least 32 rows.
    if hi - lo < 32:
        center = (lo + hi) // 2
        lo = max(center - 16, 0)
        hi = min(center + 16, ny)
    return lo, hi, float(np.nanmin(rows[lo:hi])), float(np.nanmax(rows[lo:hi]))


def _stretch(data: np.ndarray, vmin: float | None, vmax: float | None,
             stretch: float = 1.0, invert: bool = False) -> tuple[np.ndarray, float, float]:
    finite = np.isfinite(data)
    if not finite.any():
        zeros = np.zeros(data.shape, dtype=np.uint8)
        return zeros, 0.0, 1.0
    sample = data[finite]
    if vmin is None or vmax is None or not (math.isfinite(vmin) and math.isfinite(vmax)) or vmax <= vmin:
        vmin, vmax = np.percentile(sample, [2.0, 99.5])
    if vmax <= vmin:
        vmax = vmin + 1.0
    scaled = np.clip((data - vmin) / (vmax - vmin), 0.0, 1.0)
    # asinh stretch; stretch=1 is nearly linear, stretch=0 is log-like.
    a = max(1e-3, (1.0 - float(np.clip(stretch, 0.0, 1.0))) * 20.0 + 1e-3)
    scaled = np.arcsinh(scaled * a) / math.asinh(a)
    scaled = np.clip(scaled, 0.0, 1.0)
    if invert:
        scaled = 1.0 - scaled
    return (scaled * 255).astype(np.uint8), float(vmin), float(vmax)


def render_frame(fits_path: Path, out_pixels: int, wavelength: float | None,
                 vmin: float | None = None, vmax: float | None = None,
                 stretch: float = 1.0, invert: bool = False,
                 detector: str = "D2") -> tuple[Image.Image, dict[str, Any]]:
    """Render one visit to a grayscale PIL image."""
    with fits.open(fits_path, memmap=False) as hdul:
        image_hdu = hdul["IMAGE"] if "IMAGE" in hdul else hdul[0]
        data = np.asarray(image_hdu.data, dtype=np.float32)
        wave = wavelength_grid(hdul, detector=detector)
        lo, hi, wave_lo, wave_hi = band_rows(wave, wavelength) if wave is not None else (
            0, data.shape[0], float("nan"), float("nan"))
        crop = data[lo:hi, :]
        if crop.size == 0:
            crop = data
        # Replace NaN/Inf before stretching.
        crop = np.nan_to_num(crop, nan=0.0, posinf=0.0, neginf=0.0)
        gray, vmin_used, vmax_used = _stretch(crop, vmin, vmax, stretch, invert)
        img = Image.fromarray(gray, mode="L")
        # Keep the output square so the existing canvas/overlay math is stable.
        # Preserve aspect ratio: resize the longest side, then letterbox.
        if img.size != (out_pixels, out_pixels):
            w, h = img.size
            scale = out_pixels / float(max(w, h))
            new_size = (max(1, int(round(w * scale))), max(1, int(round(h * scale))))
            img = img.resize(new_size, Image.LANCZOS)
            canvas = Image.new("L", (out_pixels, out_pixels), 0)
            canvas.paste(img, ((out_pixels - img.width) // 2,
                               (out_pixels - img.height) // 2))
            img = canvas
        meta = {
            "vmin": vmin_used,
            "vmax": vmax_used,
            "wave_min_um": wave_lo,
            "wave_max_um": wave_hi,
            "rows": [lo, hi],
            "shape": list(data.shape),
        }
    return img, meta


def build_frames(ra: float, dec: float, detector: str = "D2",
                 wavelength: float | None = None,
                 size_deg: float | None = None,
                 out_pixels: int | None = None,
                 limit: int | None = None,
                 vmin: float | None = None, vmax: float | None = None,
                 stretch: float = 1.0, invert: bool = False,
                 collection: str | None = None) -> dict[str, Any]:
    """Prepare cutouts and render every visit. Returns the WiseView meta dict."""
    out_pixels = out_pixels or config.SPHEREX_FRAME_PIXELS
    manifest = prepare_visits(ra, dec, detector, size_deg=size_deg, limit=limit,
                              collection=collection)
    fid = manifest["field_id"]
    visits = manifest["visits"]

    wavelength_note = None
    if wavelength is not None:
        # A cutout of this size covers only a narrow slice of the detector's
        # spectral axis (~0.04 um for 600" in D3), and each visit puts a
        # different slice at the same sky position. Prefer visits that actually
        # contain the requested wavelength; if too few do, keep all visits and
        # say so rather than failing.
        matching = []
        for visit in visits:
            lo, hi = wavelength_coverage(config.DATA_DIR / visit["file"], detector)
            if lo - 0.02 <= wavelength <= hi + 0.02:
                matching.append(visit)
        if len(matching) >= 2:
            visits = matching
        else:
            wavelength_note = (
                f"Only {len(matching)} visit(s) cover {wavelength:.3f} um at this "
                f"{manifest['cutout_size_deg'] * 3600:.0f}\" field. Each frame shows "
                "its nearest available slice, so the blink also changes wavelength."
            )

    frame_dir = config.DATA_DIR / "spherex" / fid / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)

    ims: list[str] = []
    mjds: list[list[float]] = []
    epochs: list[list[int]] = []
    all_mjds: list[float] = []
    vmin_used: float | None = None
    vmax_used: float | None = None
    wave_min = math.inf
    wave_max = -math.inf
    frame_waves: list[list[float]] = []

    for index, visit in enumerate(visits):
        fits_path = config.DATA_DIR / visit["file"]
        key = "|".join([
            str(RENDER_VERSION),
            visit["file"], str(fits_path.stat().st_mtime_ns),
            f"{wavelength}", str(out_pixels), f"{vmin}", f"{vmax}",
            f"{stretch}", str(bool(invert)),
        ])
        digest = hashlib.sha1(key.encode()).hexdigest()[:16]
        png_path = frame_dir / f"{detector}_{digest}.png"
        info_path = png_path.with_suffix(".json")
        info = None
        if png_path.exists() and info_path.exists():
            try:
                import json
                info = json.loads(info_path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                info = None
        if info is None:
            image, info = render_frame(fits_path, out_pixels, wavelength,
                                       vmin=vmin, vmax=vmax, stretch=stretch,
                                       invert=invert, detector=detector)
            image.save(png_path, format="PNG", optimize=True)
            import json
            info_path.write_text(json.dumps(info), encoding="utf-8")
        if info:
            vmin_used = info.get("vmin") if vmin_used is None else vmin_used
            vmax_used = info.get("vmax") if vmax_used is None else vmax_used
            wave_min = min(wave_min, info["wave_min_um"])
            wave_max = max(wave_max, info["wave_max_um"])
            frame_waves.append([info["wave_min_um"], info["wave_max_um"]])
        else:
            frame_waves.append([float("nan"), float("nan")])
        ims.append(f"/media/spherex/{fid}/frames/{png_path.name}")
        mjd = float(visit["mjd"])
        mjds.append([mjd])
        epochs.append([index])
        all_mjds.append(mjd)

    # Approximate pixel scale of the rendered frame (arcsec/pixel).
    pixscale = (manifest["cutout_size_deg"] * 3600.0) / out_pixels

    return {
        "instrument": "SPHEREx",
        "dataset": manifest["dataset"],
        "field_id": fid,
        "detector": detector,
        "wavelength_um": wavelength,
        "wave_min_um": None if not math.isfinite(wave_min) else wave_min,
        "wave_max_um": None if not math.isfinite(wave_max) else wave_max,
        "ims": ims,
        "min": 0.0 if vmin_used is None else vmin_used,
        "max": 1.0 if vmax_used is None else vmax_used,
        "all_mjds": all_mjds,
        "mjds": mjds,
        "epochs": epochs,
        "neg_epochs": [],
        "CRPIX1": out_pixels / 2.0,
        "CRPIX2": out_pixels / 2.0,
        "CRVAL1": ra,
        "CRVAL2": dec,
        "NAXIS1": out_pixels,
        "NAXIS2": out_pixels,
        "pixscale": pixscale,
        "n_visits": len(ims),
        "frame_waves": frame_waves,
        "wavelength_note": wavelength_note,
    }


def load_manifest(ra: float, dec: float, detector: str | None = None) -> dict[str, Any] | None:
    import json
    field_dir = config.DATA_DIR / "spherex" / field_id(ra, dec)
    candidates = []
    if detector:
        candidates.append(field_dir / f"manifest_{detector}.json")
    candidates.append(field_dir / "manifest.json")
    for path in candidates:
        if not path.exists():
            continue
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
    return None
