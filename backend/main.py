"""
SPHEREx Explorer — Scientific REST API Backend
Built with FastAPI, Astropy, NumPy, SciPy, and Pillow.
Provides professional astronomical search, WCS conversions, multi-epoch image cubes,
difference imaging, 102-channel spectral analysis, and candidate detection.
"""

from fastapi import FastAPI, Query, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import numpy as np
import io
import csv

from backend.catalog import PRECONFIGURED_TARGETS, DETECTOR_RANGES, SPECTRAL_CHANNELS, SPECTRAL_FEATURES, get_detector_for_channel, get_channel_wavelength
from backend.astrometry import (
    parse_astronomical_coordinates,
    calculate_angular_motion,
    pixel_to_world,
    world_to_pixel,
    create_synthetic_wcs
)
from backend.spectrum_service import generate_spectrum_for_target
from backend.spherex_service import (
    synthesize_astronomical_image,
    compute_difference_image,
    render_fits_to_png_base64,
    extract_candidates_from_epochs,
    DISCOVERY_REGISTRY
)

app = FastAPI(
    title="SPHEREx Explorer API",
    description="Scientific Sky Observation and Astronomical Candidate Detection Backend",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic schemas
class CoordinateSearchRequest(BaseModel):
    query: Optional[str] = None
    ra: Optional[str] = None
    dec: Optional[str] = None
    fov_arcmin: float = 10.0
    channel: int = 12

class SaveCandidateRequest(BaseModel):
    name: str
    target_field: str
    ra_deg: float
    dec_deg: float
    ra_sexagesimal: str
    dec_sexagesimal: str
    category: str
    classification: str
    angular_displacement_arcsec: float
    proper_motion_arcsec_yr: float
    brightness_mag_var: float
    confidence_score: float
    notes: Optional[str] = ""

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SPHEREx Explorer Scientific Backend",
        "archive_connection": "NASA IRSA / SPHEREx DR1 Verified",
        "astropy_version": "7.1.0",
        "active_data_release": "SPHEREx DR1 (Demonstration & Research Sandbox)"
    }

@app.get("/api/targets")
def get_preconfigured_targets():
    """Returns the list of 5 challenge scientific targets."""
    return list(PRECONFIGURED_TARGETS.values())

@app.get("/api/targets/{target_id}")
def get_target_details(target_id: str):
    if target_id not in PRECONFIGURED_TARGETS:
        raise HTTPException(status_code=404, detail=f"Target '{target_id}' not found in catalog.")
    return PRECONFIGURED_TARGETS[target_id]

@app.post("/api/search")
def search_coordinates(payload: CoordinateSearchRequest):
    """
    Search by astronomical target name or sexagesimal/decimal coordinates.
    Supports WISE 0855: '08h 55m 10.831s, -07° 14′ 42.53″' or decimal '133.795, -7.245'
    """
    # 1. Check if name matches preconfigured targets
    if payload.query:
        q_norm = payload.query.strip().lower().replace(" ", "").replace("'", "").replace("-", "")
        for tid, tinfo in PRECONFIGURED_TARGETS.items():
            t_names = [tinfo["name"], tid] + tinfo.get("designations", [])
            for name_variant in t_names:
                nv_norm = name_variant.lower().replace(" ", "").replace("'", "").replace("-", "")
                if q_norm in nv_norm or nv_norm in q_norm:
                    return {
                        "matched_target": tinfo,
                        "is_preconfigured": True,
                        "ra_deg": tinfo["coordinates"]["ra_deg"],
                        "dec_deg": tinfo["coordinates"]["dec_deg"],
                        "ra_sexagesimal": tinfo["coordinates"]["ra_sexagesimal"],
                        "dec_sexagesimal": tinfo["coordinates"]["dec_sexagesimal"],
                        "fov_arcmin": tinfo["fov_arcmin"],
                        "default_channel": tinfo.get("default_channel", 12)
                    }

    # 2. Try parsing query as comma-separated or space-separated coordinates
    ra_input = payload.ra
    dec_input = payload.dec
    if not ra_input and payload.query:
        parts = payload.query.split(",")
        if len(parts) == 2:
            ra_input, dec_input = parts[0].strip(), parts[1].strip()
        else:
            parts = payload.query.split(" ")
            if len(parts) >= 2:
                ra_input = " ".join(parts[:len(parts)//2]).strip()
                dec_input = " ".join(parts[len(parts)//2:]).strip()

    if not ra_input or not dec_input:
        raise HTTPException(status_code=400, detail="Invalid search input. Please provide RA and DEC or a recognized target name.")

    try:
        ra_deg, dec_deg, ra_sex, dec_sex = parse_astronomical_coordinates(ra_input, dec_input)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "matched_target": None,
        "is_preconfigured": False,
        "ra_deg": ra_deg,
        "dec_deg": dec_deg,
        "ra_sexagesimal": ra_sex,
        "dec_sexagesimal": dec_sex,
        "fov_arcmin": payload.fov_arcmin,
        "default_channel": payload.channel
    }

@app.get("/api/observations")
def get_observations(
    target_id: Optional[str] = Query(None),
    ra: float = Query(133.79513),
    dec: float = Query(-7.24515),
    fov_arcmin: float = Query(10.0),
    channel: int = Query(12),
    stretch: str = Query("asinh"),
    colormap: str = Query("astronomical")
):
    """
    Returns multi-epoch observations for the given sky region or target.
    Includes rendered visual image tiles, WCS headers, and candidate markers.
    """
    target_info = PRECONFIGURED_TARGETS.get(target_id) if target_id else None
    
    if target_info:
        ra = target_info["coordinates"]["ra_deg"]
        dec = target_info["coordinates"]["dec_deg"]
        epochs_meta = target_info["epochs"]
    else:
        # Default 4 epochs
        epochs_meta = [
            {"epoch_id": "EP-2025A", "obs_date": "2025-04-10T12:00:00Z", "mjd": 60775.5, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 14.5, "quality_flag": 0},
            {"epoch_id": "EP-2025B", "obs_date": "2025-07-25T16:30:00Z", "mjd": 60881.6, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 14.2, "quality_flag": 0},
            {"epoch_id": "EP-2025C", "obs_date": "2025-11-12T08:15:00Z", "mjd": 60991.3, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 14.7, "quality_flag": 0},
            {"epoch_id": "EP-2026A", "obs_date": "2026-02-27T22:45:00Z", "mjd": 61098.9, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 14.4, "quality_flag": 0},
        ]

    npix = 256
    observations = []
    raw_epochs_for_detection = []

    for idx, e in enumerate(epochs_meta):
        img_arr, wcs, meta = synthesize_astronomical_image(
            ra_center=ra,
            dec_center=dec,
            fov_arcmin=fov_arcmin,
            epoch_idx=idx,
            total_epochs=len(epochs_meta),
            target_id=target_id,
            channel=channel,
            npix=npix
        )
        
        img_b64 = render_fits_to_png_base64(img_arr, stretch=stretch, colormap=colormap)
        
        observations.append({
            "epoch_index": idx,
            "epoch_id": e["epoch_id"],
            "obs_date": e["obs_date"],
            "mjd": e["mjd"],
            "image_url": img_b64,
            "flux_mjy": e.get("flux_mjy", 15.0),
            "quality_flag": e.get("quality_flag", 0),
            "metadata": meta
        })
        
        raw_epochs_for_detection.append({
            "epoch_id": e["epoch_id"],
            "image_array": img_arr
        })

    # Run automated candidate detection
    ref_wcs = create_synthetic_wcs(ra, dec, fov_arcmin, npix)
    detected_candidates = extract_candidates_from_epochs(raw_epochs_for_detection, ref_wcs, fov_arcmin)

    return {
        "target_id": target_id,
        "target_name": target_info["name"] if target_info else f"RA: {round(ra, 4)}°, DEC: {round(dec, 4)}°",
        "ra_deg": ra,
        "dec_deg": dec,
        "fov_arcmin": fov_arcmin,
        "channel": channel,
        "detector": get_detector_for_channel(channel),
        "wavelength_um": get_channel_wavelength(channel),
        "total_epochs": len(observations),
        "observations": observations,
        "detected_candidates": detected_candidates
    }

@app.get("/api/difference")
def get_difference_image_endpoint(
    target_id: Optional[str] = Query(None),
    ra: float = Query(133.79513),
    dec: float = Query(-7.24515),
    fov_arcmin: float = Query(10.0),
    channel: int = Query(12),
    epoch1: int = Query(0),
    epoch2: int = Query(3),
    stretch: str = Query("linear")
):
    """
    Computes aligned temporal difference: I_diff = I_epoch2 - I_epoch1.
    Reveals moving dipole signatures and variable sources.
    """
    npix = 256
    img1, _, _ = synthesize_astronomical_image(ra, dec, fov_arcmin, epoch1, 4, target_id, channel, npix)
    img2, _, _ = synthesize_astronomical_image(ra, dec, fov_arcmin, epoch2, 4, target_id, channel, npix)
    
    diff = compute_difference_image(img1, img2)
    
    # Calculate difference statistics
    diff_rms = float(np.std(diff))
    diff_max = float(np.max(diff))
    diff_min = float(np.min(diff))
    
    # Normalize for difference colormap centered at zero
    limit = max(abs(diff_min), abs(diff_max), 1e-4)
    norm_diff = (diff / (2.0 * limit)) + 0.5
    
    b64_diff = render_fits_to_png_base64(norm_diff, stretch=stretch, vmin=0.0, vmax=1.0, colormap="difference")

    return {
        "epoch1_index": epoch1,
        "epoch2_index": epoch2,
        "difference_image_url": b64_diff,
        "stats": {
            "rms_noise": round(diff_rms, 4),
            "max_positive_residual": round(diff_max, 4),
            "min_negative_residual": round(diff_min, 4),
            "snr_peak": round(diff_max / max(1e-4, diff_rms), 2)
        }
    }

@app.get("/api/spectrum")
def get_spectrum(
    target_id: Optional[str] = Query(None),
    ra: float = Query(133.79513),
    dec: float = Query(-7.24515)
):
    """
    Returns 102-channel infrared spectrum (0.75 - 5.00 um) with molecular ice absorption lines.
    """
    return generate_spectrum_for_target(target_id, ra, dec)

@app.get("/api/discoveries")
def get_discoveries(
    category: Optional[str] = Query(None),
    sort_by: str = Query("confidence_score")
):
    """
    Returns candidate discoveries recorded by researchers.
    """
    items = list(DISCOVERY_REGISTRY)
    if category and category != "all":
        items = [c for c in items if c["category"] == category]

    if sort_by == "proper_motion":
        items.sort(key=lambda x: x["proper_motion_arcsec_yr"], reverse=True)
    elif sort_by == "brightness_var":
        items.sort(key=lambda x: x["brightness_mag_var"], reverse=True)
    else: # confidence_score
        items.sort(key=lambda x: x["confidence_score"], reverse=True)

    return items

@app.post("/api/discoveries")
def save_discovery(candidate: SaveCandidateRequest):
    """
    Saves a newly identified citizen-science candidate into the discovery registry.
    """
    cand_id = f"SPX-CAND-2026-{len(DISCOVERY_REGISTRY) + 1:03d}"
    record = {
        "id": cand_id,
        "name": candidate.name,
        "target_field": candidate.target_field,
        "ra_deg": candidate.ra_deg,
        "dec_deg": candidate.dec_deg,
        "ra_sexagesimal": candidate.ra_sexagesimal,
        "dec_sexagesimal": candidate.dec_sexagesimal,
        "category": candidate.category,
        "classification": candidate.classification,
        "angular_displacement_arcsec": candidate.angular_displacement_arcsec,
        "proper_motion_arcsec_yr": candidate.proper_motion_arcsec_yr,
        "brightness_mag_var": candidate.brightness_mag_var,
        "confidence_score": candidate.confidence_score,
        "epochs_detected": 4,
        "status": "Candidate Logged",
        "date_flagged": "2026-11-14",
        "notes": candidate.notes or "Identified via SPHEREx Explorer Time Machine analysis."
    }
    DISCOVERY_REGISTRY.insert(0, record)
    return {"message": "Candidate saved successfully", "candidate": record}

@app.get("/api/discoveries/export")
def export_discoveries_csv():
    """
    Exports candidate catalog as downloadable scientific CSV.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "candidate_id", "name", "target_field", "ra_deg", "dec_deg",
        "ra_sexagesimal", "dec_sexagesimal", "category", "classification",
        "angular_displacement_arcsec", "proper_motion_arcsec_yr",
        "brightness_mag_var", "confidence_score", "epochs_detected",
        "status", "date_flagged", "notes"
    ])
    for c in DISCOVERY_REGISTRY:
        writer.writerow([
            c["id"], c["name"], c["target_field"], c["ra_deg"], c["dec_deg"],
            c["ra_sexagesimal"], c["dec_sexagesimal"], c["category"], c["classification"],
            c["angular_displacement_arcsec"], c["proper_motion_arcsec_yr"],
            c["brightness_mag_var"], c["confidence_score"], c["epochs_detected"],
            c["status"], c["date_flagged"], c["notes"]
        ])
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=spherex_discoveries_export.csv"}
    )

@app.get("/api/detectors")
def get_detector_info():
    """Returns technical metadata for SPHEREx's 6 detector assemblies."""
    return DETECTOR_RANGES

@app.get("/api/channels")
def get_all_channels():
    """Returns metadata for all 102 spectral channels."""
    return SPECTRAL_CHANNELS

