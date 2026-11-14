"""Gaia DR3 cone queries for WiseView overlays.

The Gaia DR3 bulk CDN is sorted by source_id, not sky position, so downloading
it for a sky viewer is impractical (gaia_source alone is ~757 GB). This module
uses the official Gaia TAP service and caches one small result per field.

Endpoint: https://gea.esac.esa.int/tap-server/tap/sync
Table:    gaiadr3.gaia_source
"""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path
from typing import Any

import numpy as np
import requests

from wv import config
from wv.common.spherex import field_id

USER_AGENT = "WiseView-Gaia/1.0 (+https://github.com/backyardworlds/wiseview)"

# The frontend expects [ra, dec, parallax, pmra, pmdec] in this exact order.
ADQL = (
    "SELECT TOP {top} source_id, ra, dec, parallax, pmra, pmdec, phot_g_mean_mag "
    "FROM {table} "
    "WHERE 1=CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', {ra:.8f}, {dec:.8f}, {radius:.8f}))"
)


def cone(ra: float, dec: float, radius_deg: float,
         top: int = 5000, cache: bool = True) -> dict[str, Any]:
    """Query Gaia DR3 around a position. Returns rows + metadata."""
    radius_deg = max(float(radius_deg), 1e-5)
    fid = field_id(ra, dec)
    cache_path = config.DATA_DIR / "gaia" / f"{fid}_r{radius_deg:.4f}.json"
    if cache and cache_path.exists():
        try:
            return json.loads(cache_path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            pass

    query = ADQL.format(top=int(top), table=config.GAIA_TABLE,
                        ra=ra, dec=dec, radius=radius_deg)
    payload = {
        "REQUEST": "doQuery",
        "LANG": "ADQL",
        "FORMAT": "json",
        "QUERY": query,
    }
    last_error: Exception | None = None
    for attempt in range(5):
        try:
            resp = requests.post(
                config.GAIA_TAP_URL,
                data=payload,
                headers={"User-Agent": USER_AGENT},
                timeout=config.SPHEREX_HTTP_TIMEOUT,
            )
            if resp.status_code == 200:
                body = resp.json()
                result = _shape(body, ra, dec, radius_deg)
                if cache:
                    cache_path.parent.mkdir(parents=True, exist_ok=True)
                    cache_path.write_text(json.dumps(result), encoding="utf-8")
                return result
            last_error = RuntimeError(
                f"Gaia TAP HTTP {resp.status_code}: {resp.text[:200]}"
            )
        except (requests.RequestException, ValueError) as exc:
            last_error = exc
        time.sleep(min(2 ** attempt, 20))
    raise RuntimeError(f"Gaia TAP query failed: {last_error}")


def _shape(body: dict[str, Any], ra: float, dec: float,
           radius_deg: float) -> dict[str, Any]:
    columns = [meta.get("name") for meta in body.get("metadata", [])]
    raw_rows = body.get("data", [])
    rows: list[list[Any]] = []
    sources: list[dict[str, Any]] = []
    for raw in raw_rows:
        record = dict(zip(columns, raw))
        # JSON TAP returns null for missing values.
        parallax = _num(record.get("parallax"))
        pmra = _num(record.get("pmra"))
        pmdec = _num(record.get("pmdec"))
        row = [
            _num(record.get("ra")),
            _num(record.get("dec")),
            parallax,
            pmra,
            pmdec,
        ]
        rows.append(row)
        sources.append({
            "source_id": record.get("source_id"),
            "ra": row[0],
            "dec": row[1],
            "parallax": parallax,
            "pmra": pmra,
            "pmdec": pmdec,
            "phot_g_mean_mag": _num(record.get("phot_g_mean_mag")),
        })
    return {
        "ra": ra,
        "dec": dec,
        "radius_deg": radius_deg,
        "count": len(rows),
        "columns": ["ra", "dec", "parallax", "pmra", "pmdec"],
        "data": rows,
        "sources": sources,
        "table": config.GAIA_TABLE,
    }


def _num(value: Any) -> float | None:
    try:
        out = float(value)
    except (TypeError, ValueError):
        return None
    return out if np.isfinite(out) else None


def proper_motion_vectors(result: dict[str, Any], base_mjd: float = 57204.0,
                          years: float = 5.0) -> list[dict[str, Any]]:
    """Convert Gaia proper motions to simple RA/Dec displacement vectors (mas)."""
    vectors = []
    for source in result.get("sources", []):
        pmra = source.get("pmra") or 0.0
        pmdec = source.get("pmdec") or 0.0
        vectors.append({
            "source_id": source.get("source_id"),
            "ra": source.get("ra"),
            "dec": source.get("dec"),
            "pmra_mas_yr": pmra,
            "pmdec_mas_yr": pmdec,
            "dra_arcsec": pmra * years / 1000.0,
            "ddec_arcsec": pmdec * years / 1000.0,
            "base_mjd": base_mjd,
        })
    return vectors
