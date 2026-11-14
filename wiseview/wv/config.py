"""Central configuration for WiseView local deployment.

All values can be overridden with environment variables so the same code runs
locally, in Docker, or on a server.
"""

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

DATA_DIR = Path(os.environ.get("WV_DATA_DIR", REPO_ROOT / "data")).resolve()
CACHE_DIR = Path(os.environ.get("WV_CACHE_DIR", DATA_DIR / "cache")).resolve()

# Where generated PNG frames are served from.
MEDIA_DIR = Path(os.environ.get("WV_MEDIA_DIR", DATA_DIR)).resolve()

# unWISE (legacy mode). These may be missing on a fresh checkout; the app will
# report 503 for unWISE endpoints instead of crashing at import time.
UNWISE_INDEX = os.environ.get("WV_UNWISE_INDEX", "tr_neo7_index-mjd-forward.fits")
UNWISE_WCS_INDEX = os.environ.get("WV_UNWISE_WCS_INDEX", "tr_neo4_wcs_sorted.csv")
UNWISE_SUBJECTS = os.environ.get("WV_UNWISE_SUBJECTS", "wsubcache.csv")
UNWISE_PUBLIC_BASE = os.environ.get(
    "WV_UNWISE_PUBLIC_BASE",
    "https://amnh-citsci-public.s3-us-west-2.amazonaws.com/",
)
UNWISE_ANIMATION_URL = os.environ.get(
    "WV_UNWISE_ANIMATION_URL",
    "https://vjxontvb73.execute-api.us-west-2.amazonaws.com/png-animation",
)
UNWISE_GAIA_URL = os.environ.get(
    "WV_UNWISE_GAIA_URL",
    "https://n7z4i9pzx8.execute-api.us-west-2.amazonaws.com/prod/catalog/gaiadr2",
)

# SPHEREx / IRSA
IRSA_SIA_URL = os.environ.get("WV_IRSA_SIA_URL", "https://irsa.ipac.caltech.edu/SIA")
SPHEREX_COLLECTION = os.environ.get("WV_SPHEREX_COLLECTION", "spherex_dr1")
SPHEREX_CUTOUT_SIZE_DEG = float(os.environ.get("WV_SPHEREX_CUTOUT_SIZE_DEG", "0.05"))
SPHEREX_MAX_VISITS = int(os.environ.get("WV_SPHEREX_MAX_VISITS", "12"))
SPHEREX_FRAME_PIXELS = int(os.environ.get("WV_SPHEREX_FRAME_PIXELS", "512"))
SPHEREX_HTTP_TIMEOUT = float(os.environ.get("WV_SPHEREX_HTTP_TIMEOUT", "120"))
SPHEREX_RETRIES = int(os.environ.get("WV_SPHEREX_RETRIES", "8"))

# Gaia DR3 TAP
GAIA_TAP_URL = os.environ.get(
    "WV_GAIA_TAP_URL", "https://gea.esac.esa.int/tap-server/tap/sync"
)
GAIA_TABLE = os.environ.get("WV_GAIA_TABLE", "gaiadr3.gaia_source")

# Detector -> nominal wavelength range (microns), from the SPHEREx explanatory
# supplement. Used for UI defaults and for sanity checks.
DETECTORS = {
    "D1": (0.75, 1.11),
    "D2": (1.11, 1.64),
    "D3": (1.64, 2.42),
    "D4": (2.42, 3.82),
    "D5": (3.82, 4.42),
    "D6": (4.42, 5.00),
}


def ensure_dirs():
    for path in (DATA_DIR, CACHE_DIR, MEDIA_DIR):
        path.mkdir(parents=True, exist_ok=True)
