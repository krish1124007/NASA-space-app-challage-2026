#!/usr/bin/env python
"""Prefetch SPHEREx visits and render WiseView blink frames.

Example:
    python scripts/fetch_spherex.py --ra 210.80227 --dec 54.34895 \
        --detector D2 --wavelength 1.6 --size-arcsec 180 --limit 12

The first run downloads IRSA cutouts (small, ~1-3 MB each) and writes:
    data/spherex/<field>/manifest.json
    data/spherex/<field>/cutouts/*.fits
    data/spherex/<field>/frames/*.png

After that /api/spherex/frames serves the cached frames without network access.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from wv import config  # noqa: E402
from wv.common import spherex  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ra", type=float, required=True, help="Right ascension, degrees")
    parser.add_argument("--dec", type=float, required=True, help="Declination, degrees")
    parser.add_argument("--detector", default="D2", choices=sorted(config.DETECTORS))
    parser.add_argument("--wavelength", type=float, default=None,
                        help="Central wavelength in microns (blank = full band)")
    parser.add_argument("--size-arcsec", type=float, default=180.0,
                        help="Cutout size in arcseconds (default 180)")
    parser.add_argument("--limit", type=int, default=config.SPHEREX_MAX_VISITS)
    parser.add_argument("--pixels", type=int, default=config.SPHEREX_FRAME_PIXELS)
    parser.add_argument("--collection", default=config.SPHEREX_COLLECTION)
    args = parser.parse_args()

    meta = spherex.build_frames(
        args.ra,
        args.dec,
        detector=args.detector,
        wavelength=args.wavelength,
        size_deg=args.size_arcsec / 3600.0,
        out_pixels=args.pixels,
        limit=args.limit,
        collection=args.collection,
    )
    print(json.dumps(meta, indent=2))
    print(f"\nWrote {meta['n_visits']} frames under "
          f"{config.DATA_DIR / 'spherex' / meta['field_id']}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
