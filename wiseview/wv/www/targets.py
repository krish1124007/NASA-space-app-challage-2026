"""Benchmark target catalogue for the WiseView classic homepage.

The React SPHEREx Explorer keeps the canonical catalogue in ``backend/catalog.py``.
The classic UI must also work from a standalone ``wiseview`` checkout where that
package is absent, so a local fallback with the same five benchmark sources is
kept here. Both paths are normalised into the small shape the homepage template
needs, including ready-to-use viewer URLs.
"""

from __future__ import annotations

import os
import sys
from typing import Any, Dict, List

from urllib.parse import urlencode

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

VIEWER_PATH = "/legacy/viewer"
TIME_MACHINE_ARCSEC = 120
MIN_ARCSEC = 36
MAX_ARCSEC = 1080

_FALLBACK_TARGETS: List[Dict[str, Any]] = [
    {
        "id": "cached_m101",
        "name": "M101 region (cached)",
        "classification": "Cached SPHEREx field",
        "description": "Offline-cached SPHEREx field near M101 (12 visits, D1-D6, 600 arcsec). Works without IRSA.",
        "category": "variable",
        "coordinates": {"ra_deg": 210.80227, "dec_deg": 54.34895, "ra_sexagesimal": "14h 03m 12.5s", "dec_sexagesimal": "+54 20 56"},
        "proper_motion": {"pm_ra_mas_yr": 0.0, "pm_dec_mas_yr": 0.0, "total_pm_arcsec_yr": 0.0},
        "fov_arcmin": 10.0,
        "default_detector": "D2",
        "epochs": [{}] * 1,
        "cached_visits": 12,
    },
    {
        "id": "cached_hydra",
        "name": "Hydra field (cached)",
        "classification": "Cached SPHEREx field",
        "description": "Offline-cached SPHEREx field (12 visits, D1, 180 arcsec). Works without IRSA.",
        "category": "variable",
        "coordinates": {"ra_deg": 133.79513, "dec_deg": -7.24515, "ra_sexagesimal": "08h 55m 10.8s", "dec_sexagesimal": "-07 14 42.5"},
        "proper_motion": {"pm_ra_mas_yr": 0.0, "pm_dec_mas_yr": 0.0, "total_pm_arcsec_yr": 0.0},
        "fov_arcmin": 3.0,
        "default_detector": "D1",
        "epochs": [{}] * 1,
        "cached_visits": 12,
    },
    {
        "id": "cached_coma",
        "name": "Coma field (cached)",
        "classification": "Cached SPHEREx field",
        "description": "Offline-cached SPHEREx field (12 visits, D6, 180 arcsec). Works without IRSA.",
        "category": "variable",
        "coordinates": {"ra_deg": 210.79544, "dec_deg": 20.35342, "ra_sexagesimal": "14h 03m 10.9s", "dec_sexagesimal": "+20 21 12.3"},
        "proper_motion": {"pm_ra_mas_yr": 0.0, "pm_dec_mas_yr": 0.0, "total_pm_arcsec_yr": 0.0},
        "fov_arcmin": 3.0,
        "default_detector": "D6",
        "epochs": [{}] * 1,
        "cached_visits": 12,
    },
    {
        "id": "cached_cvna",
        "name": "Canes Venatici field A (cached)",
        "classification": "Cached SPHEREx field",
        "description": "Offline-cached SPHEREx field (12 visits, D1/D6, 120 arcsec). Works without IRSA.",
        "category": "variable",
        "coordinates": {"ra_deg": 210.79544, "dec_deg": 40.35342, "ra_sexagesimal": "14h 03m 10.9s", "dec_sexagesimal": "+40 21 12.3"},
        "proper_motion": {"pm_ra_mas_yr": 0.0, "pm_dec_mas_yr": 0.0, "total_pm_arcsec_yr": 0.0},
        "fov_arcmin": 2.0,
        "default_detector": "D1",
        "epochs": [{}] * 1,
        "cached_visits": 12,
    },
    {
        "id": "cached_cvnb",
        "name": "Canes Venatici field B (cached)",
        "classification": "Cached SPHEREx field",
        "description": "Offline-cached SPHEREx field (D2 12 visits, D1 11 visits, 120 arcsec). Works without IRSA.",
        "category": "variable",
        "coordinates": {"ra_deg": 210.80227, "dec_deg": 40.34895, "ra_sexagesimal": "14h 03m 12.5s", "dec_sexagesimal": "+40 20 56.2"},
        "proper_motion": {"pm_ra_mas_yr": 0.0, "pm_dec_mas_yr": 0.0, "total_pm_arcsec_yr": 0.0},
        "fov_arcmin": 2.0,
        "default_detector": "D2",
        "epochs": [{}] * 1,
        "cached_visits": 12,
    },
    {
        "id": "cached_m101b",
        "name": "M101 offset (cached)",
        "classification": "Cached SPHEREx field",
        "description": "Offline-cached SPHEREx field (D1 11 visits, D2 12 visits, 120 arcsec). Works without IRSA.",
        "category": "variable",
        "coordinates": {"ra_deg": 210.86928, "dec_deg": 54.40161, "ra_sexagesimal": "14h 03m 28.6s", "dec_sexagesimal": "+54 24 05.8"},
        "proper_motion": {"pm_ra_mas_yr": 0.0, "pm_dec_mas_yr": 0.0, "total_pm_arcsec_yr": 0.0},
        "fov_arcmin": 2.0,
        "default_detector": "D2",
        "epochs": [{}] * 1,
        "cached_visits": 12,
    },
]

def _clamp_arcsec(value: float) -> int:
    return int(round(max(MIN_ARCSEC, min(MAX_ARCSEC, value))))


def _viewer_url(size: int, ra_deg: float, dec_deg: float,
                detector: str, pm_ra: float, pm_dec: float,
                limit: int | None = None) -> str:
    params = {
        "ra": f"{ra_deg:.6f}",
        "dec": f"{dec_deg:.6f}",
        "size": size,
        "instrument": "spherex",
        "detector": detector,
        "pmra": pm_ra,
        "pmdec": pm_dec,
    }
    if limit:
        params["limit"] = limit
    query = urlencode(params)
    return f"{VIEWER_PATH}#{query}"


def _normalise(raw: Dict[str, Any]) -> Dict[str, Any]:
    coords = raw.get("coordinates") or {}
    motion = raw.get("proper_motion") or {}
    category = raw.get("category") or "moving"
    fov = float(raw.get("fov_arcmin") or 10.0)
    detector = raw.get("default_detector") or "D2"
    cached_visits = raw.get("cached_visits")
    ra = float(coords.get("ra_deg") or 0.0)
    dec = float(coords.get("dec_deg") or 0.0)
    pm_ra = float(motion.get("pm_ra_mas_yr") or 0.0)
    pm_dec = float(motion.get("pm_dec_mas_yr") or 0.0)

    explorer_size = _clamp_arcsec(fov * 60.0)
    time_size = _clamp_arcsec(TIME_MACHINE_ARCSEC)

    return {
        "id": raw.get("id") or raw.get("name", "").lower().replace(" ", "_"),
        "name": raw.get("name") or "Unnamed target",
        "classification": raw.get("classification") or "",
        "description": raw.get("description") or "",
        "category": category,
        "badge": "Moving Source" if category == "moving" else "Variable Source",
        "ra_deg": ra,
        "dec_deg": dec,
        "ra_sexagesimal": coords.get("ra_sexagesimal") or "",
        "dec_sexagesimal": coords.get("dec_sexagesimal") or "",
        "pm_ra": pm_ra,
        "pm_dec": pm_dec,
        "pm_total": motion.get("total_pm_arcsec_yr") or 0.0,
        "epoch_count": len(raw.get("epochs") or []),
        "fov_arcmin": fov,
        "detector": detector,
        "size_explorer": explorer_size,
        "size_time_machine": time_size,
        "href_explorer": _viewer_url(explorer_size, ra, dec, detector, pm_ra, pm_dec, cached_visits),
        "href_time_machine": _viewer_url(time_size, ra, dec, detector, pm_ra, pm_dec, cached_visits),
        "href_spectrum": f"/legacy/spectrum?ra={ra:.6f}&dec={dec:.6f}&size={explorer_size}&detector={detector}",
    }


def get_targets() -> List[Dict[str, Any]]:
    """Return normalised benchmark targets, preferring the shared backend catalogue."""
    try:
        from backend.catalog import PRECONFIGURED_TARGETS  # type: ignore
    except Exception:
        return [_normalise(t) for t in _FALLBACK_TARGETS]
    return [_normalise(t) for t in PRECONFIGURED_TARGETS.values()]
