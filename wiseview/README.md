# WiseView
WiseView code for displaying [unWISE](http://unwise.me) image blinks

[![ascl:1806.004](https://img.shields.io/badge/ascl-1806.004-blue.svg?colorB=262255)](http://ascl.net/1806.004)

# Web Application
http://byw.tools/wiseview

[example image blink](http://byw.tools/wiseview#ra=133.787&dec=-7.245150&size=120&band=2&speed=274&trimbright=521.66&linear=1&color=gray&mode=fixed&coadd_mode=time-resolved&zoom=12)

# Local setup (SPHEREx + Gaia + unWISE)

This checkout runs fully locally. Two data modes share the same canvas and blink
controls:

| Mode | Source | Notes |
|------|--------|-------|
| **SPHEREx** (default) | IRSA SIA + IRSA cutout service | Level 2 spectral images, detectors D1–D6, 0.75–5.0 µm |
| **unWISE** | legacy public AWS frames | fallback; requires local unWISE index files |

No API key is needed for either mode.

## Quick start

```powershell
cd wiseview
.\run.ps1
```

Open <http://127.0.0.1:5000/>.

Manual equivalent:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m wv.www.unoverse
```

Linux/macOS: `./run.sh`.

## Prefetch a field

The first request for a field downloads small IRSA cutouts (a few MB each) and
renders one PNG per visit. Prefetch avoids waiting in the browser:

```powershell
# M101, detector D2, full band, 12 visits, 600 arcsec cutout
python scripts/fetch_spherex.py --ra 210.80227 --dec 54.34895 `
    --detector D2 --size-arcsec 600 --limit 12

# Same field, a 1.6 um slice
python scripts/fetch_spherex.py --ra 210.80227 --dec 54.34895 `
    --detector D2 --wavelength 1.6 --size-arcsec 600 --limit 12

# Gaia DR3 overlay for the same field
python scripts/fetch_gaia.py --ra 210.80227 --dec 54.34895 --radius-deg 0.083
```

Cached output:

```
data/spherex/<field>/manifest_<detector>.json
data/spherex/<field>/cutouts/*.fits
data/spherex/<field>/frames/*.png
data/gaia/<field>_r<radius>.json
```

Validate a field:

```powershell
python scripts/validate_manifest.py data/spherex/ra210.8023_decp54.3490
```

## Routes
| Route | Purpose |
|-------|---------|
| `/` | SPHEREx Explorer (React) homepage |
| `/legacy` | Classic WiseView featured-target homepage |
| `/legacy/viewer` | Classic WiseView flash3 control surface |
| `/legacy?viewer=1` | Alias for `/legacy/viewer` |
| `/?legacy=1` | Alias for `/legacy/viewer` |

## API

| Route | Purpose |
|-------|---------|
| `GET /api/health` | mode status, data directory, unWISE availability |
| `GET /api/spherex/visits?ra=&dec=&detector=D2&radius_deg=0.05` | SIA visit list (no download) |
| `GET /api/spherex/frames?ra=&dec=&size=600&detector=D2&wavelength=1.6` | download/cache cutouts and return blink metadata |
| `GET /api/gaia/cone?ra=&dec=&radius_deg=0.05` | Gaia DR3 TAP cone, cached |
| `GET /media/spherex/<field>/frames/<file>.png` | rendered frame |

`/api/spherex/frames` returns the same metadata contract the existing viewer
uses: `ims`, `min`, `max`, `all_mjds`, `mjds`, `epochs`, `neg_epochs`,
`CRPIX1/2`, `CRVAL1/2`, `NAXIS1/2`, plus `pixscale`, `detector`,
`wavelength_um`, `wave_min_um`, `wave_max_um`, `frame_waves`,
`wavelength_note`.

## Data format notes

- SPHEREx Level 2 MEF: `IMAGE` (MJy/sr), `FLAGS`, `VARIANCE`, `ZODI`, `EPSF`,
  `WCS-WAVE`. Wavelength is read from the tabular `WCS-WAVE` alternate WCS
  (`key="W"`); `pixel_to_world` returns `[wavelength, bandwidth]`.
- A cutout covers both a sky area and a wavelength interval. A 600 arcsec
  cutout spans only a small part of a detector's full band (~0.04 µm in D3), and
  each visit places a different slice at the same sky position. If fewer than
  two visits contain the requested wavelength, all visits are kept and
  `wavelength_note` explains that the blink also changes wavelength.
  `frame_waves` lists the actual `[min, max]` wavelength of every frame.
- Gaia DR3 bulk CDN is sorted by `source_id`, not sky position; `gaia_source`
  alone is ~757 GB. This project uses Gaia TAP cone queries instead and caches
  one JSON file per field.

## Configuration

Copy `.env.example` and set environment variables as needed. Key variables:
`WV_DATA_DIR`, `WV_SPHEREX_COLLECTION`, `WV_SPHEREX_MAX_VISITS`,
`WV_SPHEREX_FRAME_PIXELS`, `WV_GAIA_TABLE`. Frontend endpoints live in
`wv/www/static/config.js`.

## Machine learning models

There are none. WiseView is a data viewer: FITS cutouts are stretched and
rendered to PNG, then blinked in the browser. There is no model directory, no
inference code, and no training pipeline. The Gaia overlay is a catalog query,
not a model. If you need candidate detection or classification, add it as a
separate service or a new backend module; it is not part of the current code.

# License
This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

# Citation
Please cite WiseView if you found it useful to your research. A Bibtex entry for WiseView can be obtained from [NASA ADS](http://adsabs.harvard.edu/abs/2018ascl.soft06004C).

# Background

WiseView was originally developed in the context of the [Backyard Worlds: Planet 9](http://backyardworlds.org) citizen science motion search, but is broadly useful to both citizen scientists and professional astronomers seeking to understand the motion and/or variability of WISE sources.
