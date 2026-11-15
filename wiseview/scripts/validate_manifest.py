#!/usr/bin/env python
"""Validate a cached SPHEREx field manifest and its FITS cutouts.

Example:
    python scripts/validate_manifest.py data/spherex/ra210.8023_dec_p54.3490
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from astropy.io import fits  # noqa: E402

from wv import config  # noqa: E402


def check_fits(path: Path) -> list[str]:
    problems = []
    try:
        with fits.open(path, memmap=False) as hdul:
            names = [hdu.name for hdu in hdul]
            if "IMAGE" not in names:
                problems.append(f"{path.name}: missing IMAGE extension")
            else:
                data = hdul["IMAGE"].data
                if data is None or data.ndim != 2:
                    problems.append(f"{path.name}: IMAGE is not 2D")
            if "WCS-WAVE" not in names:
                problems.append(f"{path.name}: missing WCS-WAVE extension")
    except Exception as exc:
        problems.append(f"{path.name}: cannot open ({exc})")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("field_dir", type=Path)
    args = parser.parse_args()

    manifest_path = args.field_dir / "manifest.json"
    if not manifest_path.exists():
        candidates = sorted(args.field_dir.glob("manifest_*.json"))
        if candidates:
            manifest_path = candidates[0]
    if not manifest_path.exists():
        print(f"missing manifest: {manifest_path}")
        return 1
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    visits = manifest.get("visits", [])
    print(f"field       {manifest.get('field_id')}")
    print(f"detector    {manifest.get('detector')}")
    print(f"visits      {len(visits)}")

    problems: list[str] = []
    if not visits:
        problems.append("manifest has no visits")
    for visit in visits:
        rel = visit.get("file")
        if not rel:
            problems.append(f"visit {visit.get('obs_id')}: no file entry")
            continue
        path = config.DATA_DIR / rel
        if not path.exists():
            problems.append(f"missing cutout: {path}")
            continue
        problems.extend(check_fits(path))

    if problems:
        print("\nFAIL")
        for problem in problems:
            print(" -", problem)
        return 1
    print("\nOK: all cutouts have IMAGE and WCS-WAVE extensions")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
