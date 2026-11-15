#!/usr/bin/env python
"""Fetch and cache a Gaia DR3 cone for one field.

Example:
    python scripts/fetch_gaia.py --ra 210.80227 --dec 54.34895 --radius-deg 0.05

Writes data/gaia/<field>_r<radius>.json. The WiseView overlay uses the same
cached file through GET /api/gaia/cone.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from wv.common import gaia  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ra", type=float, required=True)
    parser.add_argument("--dec", type=float, required=True)
    parser.add_argument("--radius-deg", type=float, default=0.05)
    parser.add_argument("--top", type=int, default=5000)
    args = parser.parse_args()

    result = gaia.cone(args.ra, args.dec, args.radius_deg, top=args.top)
    print(json.dumps({
        "ra": result["ra"],
        "dec": result["dec"],
        "radius_deg": result["radius_deg"],
        "count": result["count"],
        "table": result["table"],
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
