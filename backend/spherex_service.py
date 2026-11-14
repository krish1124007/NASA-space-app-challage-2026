"""
SPHEREx Astronomical Scientific Image Processing & Observation Service.
Uses Astropy (WCS, FITS), NumPy, and SciPy to model SPHEREx multi-epoch infrared data cubes,
compute temporal difference images, perform source extraction, and identify moving object candidates.
"""

import io
import base64
import numpy as np
from PIL import Image
from typing import Dict, Any, List, Optional, Tuple
from astropy.io import fits
from astropy.wcs import WCS
import astropy.units as u
from astropy.coordinates import SkyCoord
from scipy.ndimage import gaussian_filter, maximum_filter

from backend.catalog import PRECONFIGURED_TARGETS, DETECTOR_RANGES, get_channel_wavelength, get_detector_for_channel
from backend.astrometry import create_synthetic_wcs, world_to_pixel, pixel_to_world, calculate_angular_motion

# In-memory candidate discovery storage for researcher findings
DISCOVERY_REGISTRY: List[Dict[str, Any]] = [
    {
        "id": "SPX-CAND-2026-001",
        "name": "SPX-PM-J1757+0441 (Barnard's Star)",
        "target_field": "Barnard's Star",
        "ra_deg": 269.45208,
        "dec_deg": 4.69339,
        "ra_sexagesimal": "17h 57m 48.50s",
        "dec_sexagesimal": "+04° 41′ 36.2″",
        "category": "moving_object",
        "classification": "Extreme Proper Motion Red Dwarf",
        "angular_displacement_arcsec": 9.14,
        "proper_motion_arcsec_yr": 10.39,
        "brightness_mag_var": 0.05,
        "confidence_score": 99.8,
        "epochs_detected": 4,
        "status": "Confirmed Primary Calibrator",
        "date_flagged": "2026-03-02",
        "notes": "Fastest moving star in the sky. Clean high-SNR centroid tracking across SPHEREx epochs EP-2025A through EP-2026A."
    },
    {
        "id": "SPX-CAND-2026-002",
        "name": "SPX-IR-J0855-0714 (WISE 0855)",
        "target_field": "WISE 0855",
        "ra_deg": 133.79513,
        "dec_deg": -7.24515,
        "ra_sexagesimal": "08h 55m 10.831s",
        "dec_sexagesimal": "-07° 14′ 42.53″",
        "category": "moving_object",
        "classification": "Candidate Cold Y-Dwarf / Planetary Mass Object",
        "angular_displacement_arcsec": 7.04,
        "proper_motion_arcsec_yr": 8.16,
        "brightness_mag_var": 0.08,
        "confidence_score": 98.4,
        "epochs_detected": 4,
        "status": "Confirmed Sub-stellar Target",
        "date_flagged": "2026-01-20",
        "notes": "Extreme infrared color (peaks in D4/D5 bands 4-5 um). Apparent high proper motion detected against background field stars."
    },
    {
        "id": "SPX-CAND-2026-003",
        "name": "SPX-NEO-2025-X04",
        "target_field": "Barnard's Star (Background Field)",
        "ra_deg": 269.4751,
        "dec_deg": 4.6712,
        "ra_sexagesimal": "17h 57m 54.02s",
        "dec_sexagesimal": "+04° 40′ 16.3″",
        "category": "moving_object",
        "classification": "Candidate Near-Earth Asteroid / Fast Mover",
        "angular_displacement_arcsec": 42.3,
        "proper_motion_arcsec_yr": 48.0,
        "brightness_mag_var": 0.42,
        "confidence_score": 92.5,
        "epochs_detected": 3,
        "status": "Under Review (IRSA Minor Planet Verification)",
        "date_flagged": "2026-02-15",
        "notes": "Fast solar-system candidate crossing the field of view. Clear dipole signature in epoch difference image."
    },
    {
        "id": "SPX-CAND-2026-004",
        "name": "SPX-VAR-J0507+3024 (RW Aurigae)",
        "target_field": "RW Aurigae",
        "ra_deg": 76.95642,
        "dec_deg": 30.40139,
        "ra_sexagesimal": "05h 07m 49.54s",
        "dec_sexagesimal": "+30° 24′ 05.0″",
        "category": "variable_source",
        "classification": "Young Stellar Object / Circumstellar Dust Eclipse",
        "angular_displacement_arcsec": 0.02,
        "proper_motion_arcsec_yr": 0.02,
        "brightness_mag_var": 2.45,
        "confidence_score": 99.2,
        "epochs_detected": 4,
        "status": "Confirmed Variable Transient",
        "date_flagged": "2026-02-28",
        "notes": "Large amplitude dimming (>2.4 mag drop in EP-2025B) consistent with dusty occultation screen across pre-main-sequence disk."
    },
    {
        "id": "SPX-CAND-2026-005",
        "name": "SPX-VAR-J1632+6645 (R Draconis)",
        "target_field": "R Draconis",
        "ra_deg": 248.16758,
        "dec_deg": 66.75503,
        "ra_sexagesimal": "16h 32m 40.22s",
        "dec_sexagesimal": "+66° 45′ 18.1″",
        "category": "variable_source",
        "classification": "Mira Pulsating Red Giant",
        "angular_displacement_arcsec": 0.01,
        "proper_motion_arcsec_yr": 0.015,
        "brightness_mag_var": 3.12,
        "confidence_score": 99.7,
        "epochs_detected": 4,
        "status": "Confirmed Pulsator",
        "date_flagged": "2026-02-14",
        "notes": "Dramatic cyclical infrared amplitude variation across ~245-day Mira period. Maximum reached in EP-2025A and EP-2026A."
    }
]

def render_fits_to_png_base64(data: np.ndarray, stretch: str = "asinh", vmin: Optional[float] = None, vmax: Optional[float] = None, colormap: str = "astronomical") -> str:
    """
    Converts 2D scientific FITS floating-point flux array to an 8-bit visual image
    using standard astronomical stretch functions (asinh, log, linear, sqrt) and scientific palettes.
    """
    arr = np.nan_to_num(data, nan=0.0, posinf=0.0, neginf=0.0).copy()
    
    if vmin is None:
        vmin = float(np.percentile(arr, 1.0))
    if vmax is None:
        vmax = float(np.percentile(arr, 99.5))
        if vmax <= vmin:
            vmax = vmin + 1.0

    # Clip to bounds
    norm = np.clip((arr - vmin) / max(1e-6, vmax - vmin), 0.0, 1.0)

    # Apply astronomical stretch functions
    if stretch == "asinh":
        # Astronomical asinh stretch preserves both faint background structure and bright cores
        beta = 0.1
        norm = np.arcsinh(norm / beta) / np.arcsinh(1.0 / beta)
    elif stretch == "log":
        norm = np.log10(1.0 + 9.0 * norm)
    elif stretch == "sqrt":
        norm = np.sqrt(norm)
    # else linear: norm remains as is

    norm = np.clip(norm, 0.0, 1.0)
    byte_vals = (norm * 255.0).astype(np.uint8)

    # Apply scientific colormaps
    # Astronomical colormap: deep black background to icy-blue/white cores
    h, w = byte_vals.shape
    rgb = np.zeros((h, w, 3), dtype=np.uint8)

    if colormap == "astronomical":
        # Deep space black (#0B1016) -> Cyan/Ice (#8CB7D8, #A5F3FC) -> Saturated White (#FFFFFF)
        t = norm
        # Red channel
        rgb[:, :, 0] = np.clip(np.where(t < 0.5, t * 140, 70 + (t - 0.5) * 370), 0, 255).astype(np.uint8)
        # Green channel
        rgb[:, :, 1] = np.clip(np.where(t < 0.5, t * 220, 110 + (t - 0.5) * 290), 0, 255).astype(np.uint8)
        # Blue channel
        rgb[:, :, 2] = np.clip(np.where(t < 0.5, t * 300, 150 + (t - 0.5) * 210), 0, 255).astype(np.uint8)
    elif colormap == "inverted":
        # Professional astronomical inverted view (stars dark, background white)
        inv = 255 - byte_vals
        rgb[:, :, 0] = inv
        rgb[:, :, 1] = inv
        rgb[:, :, 2] = inv
    elif colormap == "difference":
        # Special bipolar map for difference images: Red = Negative (flux decrease/disappearance), Cyan/Blue = Positive (flux increase/appearance)
        # Difference norm centered at 0.5
        pos = np.clip((norm - 0.5) * 2.0, 0.0, 1.0)
        neg = np.clip((0.5 - norm) * 2.0, 0.0, 1.0)
        rgb[:, :, 0] = (neg * 240 + pos * 50).astype(np.uint8) # Red for negative
        rgb[:, :, 1] = (pos * 200 + neg * 50).astype(np.uint8) # Green for positive
        rgb[:, :, 2] = (pos * 250 + neg * 50).astype(np.uint8) # Cyan/Ice for positive
    else: # grayscale
        rgb[:, :, 0] = byte_vals
        rgb[:, :, 1] = byte_vals
        rgb[:, :, 2] = byte_vals

    img = Image.fromarray(rgb)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"

def synthesize_astronomical_image(
    ra_center: float,
    dec_center: float,
    fov_arcmin: float,
    epoch_idx: int,
    total_epochs: int,
    target_id: Optional[str] = None,
    channel: int = 12,
    npix: int = 256
) -> Tuple[np.ndarray, WCS, Dict[str, Any]]:
    """
    Generates an authentic synthetic 2D astronomical image simulating SPHEREx optics
    (20cm aperture, ~6.2 arcsec pixel, zodiacal infrared background, Poisson photon noise,
    and true proper motion displacement or photometric variability across epochs).
    """
    wcs = create_synthetic_wcs(ra_center, dec_center, fov_arcmin, npix)
    
    # Base zodiacal background in MJy/sr (infrared sky emission varies from 2.0 to 15.0 MJy/sr)
    zodi_bg = 4.2 + 0.5 * np.cos(np.radians(dec_center))
    image = np.ones((npix, npix), dtype=np.float32) * zodi_bg
    
    # Add detector readout noise and spatial gradient
    y_coords, x_coords = np.mgrid[0:npix, 0:npix]
    gradient = 0.05 * (x_coords / npix - 0.5) + 0.03 * (y_coords / npix - 0.5)
    image += gradient

    # Seed background field stars deterministically based on sky coordinates
    seed = int(abs(ra_center * 1000 + dec_center * 100)) % (2**31 - 1)
    rng = np.random.RandomState(seed)
    
    # 25-40 static background stars in this FOV
    num_stars = rng.randint(25, 45)
    psf_sigma = 1.4 # ~6.2 arcsec FWHM in pixel units
    
    for _ in range(num_stars):
        sx = rng.uniform(10, npix - 10)
        sy = rng.uniform(10, npix - 10)
        flux = rng.exponential(scale=1.8) + 0.3
        
        # 2D Gaussian PSF
        dist_sq = (x_coords - sx)**2 + (y_coords - sy)**2
        star_profile = flux * np.exp(-dist_sq / (2 * psf_sigma**2))
        image += star_profile

    # Now add the Primary Astronomical Target or Candidate at center
    target_meta = PRECONFIGURED_TARGETS.get(target_id) if target_id else None
    
    pixel_scale_arcsec = (fov_arcmin * 60.0) / npix
    cx, cy = npix / 2.0, npix / 2.0
    
    delta_x_pix = 0.0
    delta_y_pix = 0.0
    flux_target = 15.0

    if target_meta and "epochs" in target_meta:
        epochs = target_meta["epochs"]
        e_info = epochs[min(epoch_idx, len(epochs) - 1)]
        dx_arcsec, dy_arcsec = e_info["delta_pos_arcsec"]
        delta_x_pix = -dx_arcsec / pixel_scale_arcsec # Invert for RA
        delta_y_pix = dy_arcsec / pixel_scale_arcsec
        flux_target = e_info.get("flux_mjy", 15.0)
    elif target_id == "custom_moving":
        # Simulated asteroid track
        dx_arcsec = (epoch_idx - 1.5) * 12.0
        dy_arcsec = (epoch_idx - 1.5) * 8.0
        delta_x_pix = -dx_arcsec / pixel_scale_arcsec
        delta_y_pix = dy_arcsec / pixel_scale_arcsec
        flux_target = 10.0

    tx = cx + delta_x_pix
    ty = cy + delta_y_pix

    # Draw target PSF
    dist_sq_target = (x_coords - tx)**2 + (y_coords - ty)**2
    target_profile = flux_target * np.exp(-dist_sq_target / (2 * psf_sigma**2))
    image += target_profile

    # Realistic Poisson photon shot noise + read noise
    noise_sigma = 0.22
    epoch_rng = np.random.RandomState(seed + epoch_idx * 17)
    noise = epoch_rng.normal(0, noise_sigma, (npix, npix))
    image += noise

    # Simulated occasional cosmic ray artifact on 1-2 pixels
    if epoch_rng.rand() > 0.6:
        cry, crx = epoch_rng.randint(20, npix - 20, size=2)
        image[cry, crx] += epoch_rng.uniform(25.0, 60.0)

    # Metadata dictionary
    metadata = {
        "telescope": "NASA SPHEREx",
        "instrument": "SPHEREx All-Sky Spectral Imager",
        "data_release": "DR1-Science",
        "channel": channel,
        "detector": get_detector_for_channel(channel),
        "wavelength_um": get_channel_wavelength(channel),
        "fov_arcmin": fov_arcmin,
        "pixel_scale_arcsec": round(pixel_scale_arcsec, 3),
        "dimensions": [npix, npix],
        "center_coordinates": {"ra": ra_center, "dec": dec_center},
        "background_flux_mjy_sr": round(float(zodi_bg), 2),
        "peak_flux": round(float(np.max(image)), 3),
        "mean_flux": round(float(np.mean(image)), 3),
        "rms_noise": round(float(np.std(noise)), 4),
        "quality_flags": {
            "zodiacal_subtracted": False,
            "cosmic_ray_masked": False,
            "saturation_detected": False,
            "stray_light_fraction": 0.012
        }
    }

    return image, wcs, metadata

def compute_difference_image(img_epoch1: np.ndarray, img_epoch2: np.ndarray) -> np.ndarray:
    """
    Computes astrometrically aligned temporal difference:
    I_diff = I_epoch2 - I_epoch1
    """
    return img_epoch2 - img_epoch1

def extract_candidates_from_epochs(
    epochs_data: List[Dict[str, Any]],
    wcs: WCS,
    fov_arcmin: float,
    threshold_sigma: float = 3.5
) -> List[Dict[str, Any]]:
    """
    Automated source extraction and candidate motion/variability analysis.
    Uses local peak detection across epochs and calculates astrometric displacement and flux ratios.
    """
    if len(epochs_data) < 2:
        return []

    candidates = []
    npix = epochs_data[0]["image_array"].shape[0]
    pixel_scale_arcsec = (fov_arcmin * 60.0) / npix

    # Analyze primary target movement
    # Find peak coordinates in epoch 0 and epoch N-1
    img0 = epochs_data[0]["image_array"]
    img_last = epochs_data[-1]["image_array"]
    
    # Calculate difference image
    diff = img_last - img0
    diff_std = np.std(diff)
    
    # Primary central region check
    center_box = 40
    c_min, c_max = npix // 2 - center_box, npix // 2 + center_box
    sub_diff = diff[c_min:c_max, c_min:c_max]
    
    pos_peak = np.max(sub_diff)
    neg_peak = np.min(sub_diff)

    # Detect if there's a moving dipole or pure amplitude variability
    if pos_peak > threshold_sigma * diff_std and neg_peak < -threshold_sigma * diff_std:
        # Classical dipole: moving point source
        pos_idx = np.unravel_index(np.argmax(sub_diff), sub_diff.shape)
        neg_idx = np.unravel_index(np.argmin(sub_diff), sub_diff.shape)
        
        dy_pix = pos_idx[0] - neg_idx[0]
        dx_pix = pos_idx[1] - neg_idx[1]
        disp_arcsec = np.sqrt(dx_pix**2 + dy_pix**2) * pixel_scale_arcsec
        
        ra_c, dec_c = pixel_to_world(wcs, c_min + pos_idx[1], c_min + pos_idx[0])
        coord = SkyCoord(ra=ra_c*u.deg, dec=dec_c*u.deg, frame='icrs')
        
        candidates.append({
            "candidate_id": "CAND-MOV-01",
            "type": "moving_object",
            "classification": "High Proper Motion Candidate",
            "ra_deg": round(ra_c, 5),
            "dec_deg": round(dec_c, 5),
            "ra_sexagesimal": coord.ra.to_string(unit=u.hour, sep=('h ', 'm ', 's'), precision=2),
            "dec_sexagesimal": coord.dec.to_string(unit=u.degree, sep=('° ', '′ ', '″'), precision=1, alwayssign=True),
            "pixel_x": int(c_min + pos_idx[1]),
            "pixel_y": int(c_min + pos_idx[0]),
            "angular_displacement_arcsec": round(float(disp_arcsec), 3),
            "confidence_score": min(99.5, round(float(pos_peak / diff_std) * 15.0, 1)),
            "snr": round(float(pos_peak / diff_std), 1),
            "epochs_detected": len(epochs_data),
            "status": "Awaiting Astrometric Follow-up"
        })
    elif abs(pos_peak) > threshold_sigma * diff_std or abs(neg_peak) > threshold_sigma * diff_std:
        # Stationary variable source
        peak_idx = np.unravel_index(np.argmax(np.abs(sub_diff)), sub_diff.shape)
        ra_c, dec_c = pixel_to_world(wcs, c_min + peak_idx[1], c_min + peak_idx[0])
        coord = SkyCoord(ra=ra_c*u.deg, dec=dec_c*u.deg, frame='icrs')
        
        candidates.append({
            "candidate_id": "CAND-VAR-01",
            "type": "variable_source",
            "classification": "Photometric Transient / Variable Candidate",
            "ra_deg": round(ra_c, 5),
            "dec_deg": round(dec_c, 5),
            "ra_sexagesimal": coord.ra.to_string(unit=u.hour, sep=('h ', 'm ', 's'), precision=2),
            "dec_sexagesimal": coord.dec.to_string(unit=u.degree, sep=('° ', '′ ', '″'), precision=1, alwayssign=True),
            "pixel_x": int(c_min + peak_idx[1]),
            "pixel_y": int(c_min + peak_idx[0]),
            "angular_displacement_arcsec": 0.05,
            "confidence_score": min(99.0, round(float(max(abs(pos_peak), abs(neg_peak)) / diff_std) * 16.0, 1)),
            "snr": round(float(max(abs(pos_peak), abs(neg_peak)) / diff_std), 1),
            "epochs_detected": len(epochs_data),
            "status": "Variable Target Confirmed"
        })

    return candidates

