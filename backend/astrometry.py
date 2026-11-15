"""
Astrometric and Coordinate Conversion Utilities for SPHEREx Explorer.
Supports decimal degrees, sexagesimal strings (e.g. 08h 55m 10.831s, -07° 14′ 42.53″),
WCS transformations, and proper motion calculations.
"""

import re
from typing import Tuple, Optional, Dict, Any
from astropy.coordinates import SkyCoord
import astropy.units as u
from astropy.wcs import WCS
import numpy as np

def clean_coord_string(val: str) -> str:
    """Normalize unicode degree, prime, and double-prime characters to standard ascii."""
    if not val:
        return ""
    s = val.strip()
    # Normalize unicode symbols: °, ′, ″, ’, ”, etc.
    s = s.replace('°', 'd').replace('′', 'm').replace('″', 's')
    s = s.replace('\'', 'm').replace('\"', 's')
    s = s.replace('’', 'm').replace('”', 's')
    s = s.replace(':', ' ')
    return s

def parse_astronomical_coordinates(ra_str: str, dec_str: str) -> Tuple[float, float, str, str]:
    """
    Parses RA and DEC input in either decimal degrees or sexagesimal formats.
    Returns: (ra_deg, dec_deg, ra_sexagesimal, dec_sexagesimal)
    """
    clean_ra = clean_coord_string(ra_str)
    clean_dec = clean_coord_string(dec_str)

    # Check if purely float decimal degrees
    try:
        ra_float = float(clean_ra)
        dec_float = float(clean_dec)
        coord = SkyCoord(ra=ra_float*u.degree, dec=dec_float*u.degree, frame='icrs')
    except ValueError:
        # Try parsing as sexagesimal (e.g. '08h 55m 10.831s -07d 14m 42.53s')
        try:
            # Check if RA has 'h' or needs hours unit
            if 'h' in clean_ra or ' ' in clean_ra:
                coord = SkyCoord(f"{clean_ra} {clean_dec}", unit=(u.hourangle, u.deg), frame='icrs')
            else:
                coord = SkyCoord(f"{clean_ra} {clean_dec}", unit=(u.deg, u.deg), frame='icrs')
        except Exception as e:
            raise ValueError(f"Unable to parse astronomical coordinates '{ra_str}', '{dec_str}': {str(e)}")

    ra_deg = round(float(coord.ra.deg), 5)
    dec_deg = round(float(coord.dec.deg), 5)
    ra_sexagesimal = coord.ra.to_string(unit=u.hour, sep=('h ', 'm ', 's'), precision=3)
    dec_sexagesimal = coord.dec.to_string(unit=u.degree, sep=('° ', '′ ', '″'), precision=2, alwayssign=True)

    return ra_deg, dec_deg, ra_sexagesimal, dec_sexagesimal

def create_synthetic_wcs(ra_center: float, dec_center: float, fov_arcmin: float, npix: int = 256) -> WCS:
    """
    Constructs a standard FITS World Coordinate System (WCS) for a SPHEREx cutout.
    SPHEREx has native ~6.2 arcsec/pixel resolution.
    """
    w = WCS(naxis=2)
    w.wcs.crpix = [npix / 2.0 + 0.5, npix / 2.0 + 0.5]
    # Pixel scale in degrees
    pix_scale_deg = (fov_arcmin / 60.0) / float(npix)
    w.wcs.cdelt = np.array([-pix_scale_deg, pix_scale_deg]) # standard RA inverted
    w.wcs.crval = [ra_center, dec_center]
    w.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    w.wcs.cunit = ["deg", "deg"]
    return w

def world_to_pixel(wcs_obj: WCS, ra: float, dec: float) -> Tuple[float, float]:
    """Convert RA/DEC world coordinates to 0-indexed image pixel coordinates."""
    x, y = wcs_obj.world_to_pixel_values(ra, dec)
    return float(x), float(y)

def pixel_to_world(wcs_obj: WCS, x: float, y: float) -> Tuple[float, float]:
    """Convert 0-indexed pixel coordinates to RA/DEC in degrees."""
    ra, dec = wcs_obj.pixel_to_world_values(x, y)
    return float(ra), float(dec)

def calculate_angular_motion(ra1: float, dec1: float, ra2: float, dec2: float, dt_years: float) -> Dict[str, float]:
    """
    Computes angular displacement and proper motion between two epochs.
    """
    c1 = SkyCoord(ra=ra1*u.deg, dec=dec1*u.deg, frame='icrs')
    c2 = SkyCoord(ra=ra2*u.deg, dec=dec2*u.deg, frame='icrs')
    sep_arcsec = float(c1.separation(c2).arcsecond)
    
    if dt_years > 0:
        pm_arcsec_yr = sep_arcsec / dt_years
        pm_mas_yr = pm_arcsec_yr * 1000.0
    else:
        pm_arcsec_yr = 0.0
        pm_mas_yr = 0.0

    return {
        "separation_arcsec": round(sep_arcsec, 4),
        "proper_motion_mas_yr": round(pm_mas_yr, 2),
        "proper_motion_arcsec_yr": round(pm_arcsec_yr, 4)
    }

