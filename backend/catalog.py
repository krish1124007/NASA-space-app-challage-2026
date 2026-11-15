"""
Astronomical target catalog and metadata definitions for SPHEREx Explorer.
Includes high-accuracy coordinates, physical classifications, proper motions,
multi-epoch observation profiles, and infrared spectral profiles across 102 SPHEREx bands.
"""

from typing import Dict, Any, List

# 6 Detectors, each covering 17 channels = 102 channels total
# Wavelength coverage: 0.75 um to 5.00 um
DETECTOR_RANGES = {
    "D1": {"wavelength_min": 0.75, "wavelength_max": 1.11, "channels": list(range(1, 18)), "pixel_scale": 6.2, "resolving_power": 41},
    "D2": {"wavelength_min": 1.11, "wavelength_max": 1.64, "channels": list(range(18, 35)), "pixel_scale": 6.2, "resolving_power": 41},
    "D3": {"wavelength_min": 1.64, "wavelength_max": 2.42, "channels": list(range(35, 52)), "pixel_scale": 6.2, "resolving_power": 41},
    "D4": {"wavelength_min": 2.42, "wavelength_max": 3.82, "channels": list(range(52, 69)), "pixel_scale": 6.2, "resolving_power": 35},
    "D5": {"wavelength_min": 3.82, "wavelength_max": 4.42, "channels": list(range(69, 86)), "pixel_scale": 6.2, "resolving_power": 110},
    "D6": {"wavelength_min": 4.42, "wavelength_max": 5.00, "channels": list(range(86, 103)), "pixel_scale": 6.2, "resolving_power": 130},
}

def get_channel_wavelength(channel: int) -> float:
    """Calculate nominal central wavelength in micrometers for channel 1 to 102."""
    if not (1 <= channel <= 102):
        raise ValueError(f"Channel must be between 1 and 102, got {channel}")
    
    for det, info in DETECTOR_RANGES.items():
        if channel in info["channels"]:
            ch_idx = info["channels"].index(channel)
            n_ch = len(info["channels"])
            w_min = info["wavelength_min"]
            w_max = info["wavelength_max"]
            return round(w_min + (ch_idx + 0.5) * (w_max - w_min) / n_ch, 4)
    return 1.0

def get_detector_for_channel(channel: int) -> str:
    """Returns the detector ID (D1..D6) for a given channel."""
    for det, info in DETECTOR_RANGES.items():
        if channel in info["channels"]:
            return det
    return "D1"

# All 102 channels lookup table
SPECTRAL_CHANNELS = [
    {
        "channel": ch,
        "detector": get_detector_for_channel(ch),
        "wavelength_um": get_channel_wavelength(ch),
        "resolving_power": DETECTOR_RANGES[get_detector_for_channel(ch)]["resolving_power"],
        "bandwidth_um": round((DETECTOR_RANGES[get_detector_for_channel(ch)]["wavelength_max"] - DETECTOR_RANGES[get_detector_for_channel(ch)]["wavelength_min"]) / 17.0, 4)
    }
    for ch in range(1, 103)
]

# Molecular Ice and Feature Reference Lines for infrared astronomy
SPECTRAL_FEATURES = [
    {"name": "H2O Ice (broad libration)", "wavelength_um": 3.05, "type": "absorption", "significance": "Key water ice signature in circumstellar discs"},
    {"name": "CO2 Ice", "wavelength_um": 4.27, "type": "absorption", "significance": "Pure and mixed carbon dioxide ice in interstellar mantles"},
    {"name": "CO Ice", "wavelength_um": 4.67, "type": "absorption", "significance": "Volatile carbon monoxide ice grains"},
    {"name": "CH3OH (Methanol) Ice", "wavelength_um": 3.53, "type": "absorption", "significance": "Prebiotic complex organic molecule precursor"},
    {"name": "CH4 (Methane)", "wavelength_um": 1.66, "type": "absorption", "significance": "Brown dwarf atmospheric overtone"},
    {"name": "CH4 (Methane ν3)", "wavelength_um": 3.32, "type": "absorption", "significance": "Strong fundamental methane absorption"},
    {"name": "PAH (Aromatic C-H)", "wavelength_um": 3.29, "type": "emission", "significance": "Polycyclic Aromatic Hydrocarbons in star-forming dust"},
    {"name": "Paschen α (H I)", "wavelength_um": 1.875, "type": "emission", "significance": "Ionized accretion and stellar outflow tracer"},
    {"name": "Brackett α (H I)", "wavelength_um": 4.052, "type": "emission", "significance": "Low-extinction ionized hydrogen recombination line"},
    {"name": "CO Gas Band Head (v=2-0)", "wavelength_um": 2.293, "type": "absorption", "significance": "Photospheric giant/Mira star molecular cooler"}
]

# Preconfigured Core Targets required by the user prompt
PRECONFIGURED_TARGETS: Dict[str, Dict[str, Any]] = {
    "cached_m101": {
        "id": "cached_m101",
        "name": "M101 region (cached)",
        "designations": ["NGC 5457 field", "offline cache"],
        "classification": "Cached SPHEREx field",
        "available": True,
        "description": "Offline-cached SPHEREx field near M101 (12 visits, D2, 600 arcsec). Works without IRSA.",
        "coordinates": {"ra_deg": 210.80227, "dec_deg": 54.34895, "ra_sexagesimal": "14h 03m 12.5s", "dec_sexagesimal": "+54 20 56", "epoch": "J2000.0"},
        "distance_ly": 0.0,
        "proper_motion": {"pm_ra_mas_yr": 0.0, "pm_dec_mas_yr": 0.0, "total_pm_arcsec_yr": 0.0, "motion_type": "Cached field"},
        "category": "variable",
        "fov_arcmin": 10.0,
        "default_detector": "D2",
        "default_channel": 20,
        "cached_visits": 12,
        "epochs": [{"epoch_id": "EP-2025A", "obs_date": "2025-01-01T00:00:00Z", "mjd": 60676.0, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 0.0, "quality_flag": 0}],
        "spectral_signature": "cached_field"
    },
    "cached_hydra": {
        "id": "cached_hydra",
        "name": "Hydra field (cached)",
        "designations": ["offline cache"],
        "classification": "Temporarily unavailable",
        "available": False,
        "description": "This field is temporarily unavailable on the production deployment. Use the M101 field or try again later.",
        "coordinates": {"ra_deg": 133.79513, "dec_deg": -7.24515, "ra_sexagesimal": "08h 55m 10.8s", "dec_sexagesimal": "-07 14 42.5", "epoch": "J2000.0"},
        "distance_ly": 0.0,
        "proper_motion": {"pm_ra_mas_yr": 0.0, "pm_dec_mas_yr": 0.0, "total_pm_arcsec_yr": 0.0, "motion_type": "Cached field"},
        "category": "variable",
        "fov_arcmin": 3.0,
        "default_detector": "D1",
        "default_channel": 12,
        "cached_visits": 12,
        "epochs": [{"epoch_id": "EP-2025A", "obs_date": "2025-01-01T00:00:00Z", "mjd": 60676.0, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 0.0, "quality_flag": 0}],
        "spectral_signature": "cached_field"
    },
    "cached_coma": {
        "id": "cached_coma",
        "name": "Coma field (cached)",
        "designations": ["offline cache"],
        "classification": "Temporarily unavailable",
        "available": False,
        "description": "This field is temporarily unavailable on the production deployment. Use the M101 field or try again later.",
        "coordinates": {"ra_deg": 210.79544, "dec_deg": 20.35342, "ra_sexagesimal": "14h 03m 10.9s", "dec_sexagesimal": "+20 21 12.3", "epoch": "J2000.0"},
        "distance_ly": 0.0,
        "proper_motion": {"pm_ra_mas_yr": 0.0, "pm_dec_mas_yr": 0.0, "total_pm_arcsec_yr": 0.0, "motion_type": "Cached field"},
        "category": "variable",
        "fov_arcmin": 3.0,
        "default_detector": "D6",
        "default_channel": 92,
        "cached_visits": 12,
        "epochs": [{"epoch_id": "EP-2025A", "obs_date": "2025-01-01T00:00:00Z", "mjd": 60676.0, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 0.0, "quality_flag": 0}],
        "spectral_signature": "cached_field"
    },
    "cached_cvna": {
        "id": "cached_cvna",
        "name": "Canes Venatici field A (cached)",
        "designations": ["offline cache"],
        "classification": "Temporarily unavailable",
        "available": False,
        "description": "This field is temporarily unavailable on the production deployment. Use the M101 field or try again later.",
        "coordinates": {"ra_deg": 210.79544, "dec_deg": 40.35342, "ra_sexagesimal": "14h 03m 10.9s", "dec_sexagesimal": "+40 21 12.3", "epoch": "J2000.0"},
        "distance_ly": 0.0,
        "proper_motion": {"pm_ra_mas_yr": 0.0, "pm_dec_mas_yr": 0.0, "total_pm_arcsec_yr": 0.0, "motion_type": "Cached field"},
        "category": "variable",
        "fov_arcmin": 2.0,
        "default_detector": "D1",
        "default_channel": 12,
        "cached_visits": 12,
        "epochs": [{"epoch_id": "EP-2025A", "obs_date": "2025-01-01T00:00:00Z", "mjd": 60676.0, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 0.0, "quality_flag": 0}],
        "spectral_signature": "cached_field"
    },
    "cached_cvnb": {
        "id": "cached_cvnb",
        "name": "Canes Venatici field B (cached)",
        "designations": ["offline cache"],
        "classification": "Temporarily unavailable",
        "available": False,
        "description": "This field is temporarily unavailable on the production deployment. Use the M101 field or try again later.",
        "coordinates": {"ra_deg": 210.80227, "dec_deg": 40.34895, "ra_sexagesimal": "14h 03m 12.5s", "dec_sexagesimal": "+40 20 56.2", "epoch": "J2000.0"},
        "distance_ly": 0.0,
        "proper_motion": {"pm_ra_mas_yr": 0.0, "pm_dec_mas_yr": 0.0, "total_pm_arcsec_yr": 0.0, "motion_type": "Cached field"},
        "category": "variable",
        "fov_arcmin": 2.0,
        "default_detector": "D2",
        "default_channel": 20,
        "cached_visits": 12,
        "epochs": [{"epoch_id": "EP-2025A", "obs_date": "2025-01-01T00:00:00Z", "mjd": 60676.0, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 0.0, "quality_flag": 0}],
        "spectral_signature": "cached_field"
    },
    "cached_m101b": {
        "id": "cached_m101b",
        "name": "M101 offset (cached)",
        "designations": ["offline cache"],
        "classification": "Temporarily unavailable",
        "available": False,
        "description": "This field is temporarily unavailable on the production deployment. Use the M101 field or try again later.",
        "coordinates": {"ra_deg": 210.86928, "dec_deg": 54.40161, "ra_sexagesimal": "14h 03m 28.6s", "dec_sexagesimal": "+54 24 05.8", "epoch": "J2000.0"},
        "distance_ly": 0.0,
        "proper_motion": {"pm_ra_mas_yr": 0.0, "pm_dec_mas_yr": 0.0, "total_pm_arcsec_yr": 0.0, "motion_type": "Cached field"},
        "category": "variable",
        "fov_arcmin": 2.0,
        "default_detector": "D2",
        "default_channel": 20,
        "cached_visits": 12,
        "epochs": [{"epoch_id": "EP-2025A", "obs_date": "2025-01-01T00:00:00Z", "mjd": 60676.0, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 0.0, "quality_flag": 0}],
        "spectral_signature": "cached_field"
    }
}
