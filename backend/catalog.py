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
    "barnards_star": {
        "id": "barnards_star",
        "name": "Barnard's Star",
        "designations": ["GJ 699", "BD+04 3561a", "HIP 87937", "TIC 104523992"],
        "classification": "M4.0V Red Dwarf",
        "description": "The star with the largest known proper motion in the sky (10.39 arcsec/yr). Demonstrates clear position shifts across successive SPHEREx sky survey epochs.",
        "coordinates": {
            "ra_deg": 269.45208,
            "dec_deg": 4.69339,
            "ra_sexagesimal": "17h 57m 48.50s",
            "dec_sexagesimal": "+04° 41′ 36.2″",
            "epoch": "J2000.0"
        },
        "distance_ly": 5.96,
        "proper_motion": {
            "pm_ra_mas_yr": -798.7,
            "pm_dec_mas_yr": 10337.8,
            "total_pm_arcsec_yr": 10.39,
            "motion_type": "High Proper Motion Star"
        },
        "category": "moving",
        "fov_arcmin": 10.0,
        "default_detector": "D1",
        "default_channel": 12,
        "epochs": [
            {"epoch_id": "EP-2025A", "obs_date": "2025-04-12T14:22:10Z", "mjd": 60777.598, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 84.2, "quality_flag": 0},
            {"epoch_id": "EP-2025B", "obs_date": "2025-07-28T09:14:45Z", "mjd": 60884.385, "delta_pos_arcsec": [-0.23, 3.03], "flux_mjy": 83.9, "quality_flag": 0},
            {"epoch_id": "EP-2025C", "obs_date": "2025-11-15T21:05:30Z", "mjd": 60994.878, "delta_pos_arcsec": [-0.46, 6.08], "flux_mjy": 84.5, "quality_flag": 0},
            {"epoch_id": "EP-2026A", "obs_date": "2026-03-01T04:48:12Z", "mjd": 61100.200, "delta_pos_arcsec": [-0.69, 9.14], "flux_mjy": 84.1, "quality_flag": 0},
        ],
        "spectral_signature": "red_dwarf_m4v"
    },
    "wise_0855": {
        "id": "wise_0855",
        "name": "WISE 0855-0714",
        "designations": ["WISE J085510.83-071442.5", "W0855"],
        "classification": "Y4 Brown Dwarf",
        "description": "Coldest known sub-stellar object beyond the Solar System (~250 K). Has significant proper motion (8.1 arcsec/yr) and prominent water and methane infrared absorption.",
        "coordinates": {
            "ra_deg": 133.79513,
            "dec_deg": -7.24515,
            "ra_sexagesimal": "08h 55m 10.831s",
            "dec_sexagesimal": "-07° 14′ 42.53″",
            "epoch": "J2000.0"
        },
        "distance_ly": 7.53,
        "proper_motion": {
            "pm_ra_mas_yr": -8132.0,
            "pm_dec_mas_yr": 675.0,
            "total_pm_arcsec_yr": 8.16,
            "motion_type": "Sub-stellar Proper Motion"
        },
        "category": "moving",
        "fov_arcmin": 8.0,
        "default_detector": "D4",
        "default_channel": 60,
        "epochs": [
            {"epoch_id": "EP-2025A", "obs_date": "2025-03-10T18:40:02Z", "mjd": 60744.777, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 3.42, "quality_flag": 0},
            {"epoch_id": "EP-2025B", "obs_date": "2025-06-22T11:15:33Z", "mjd": 60848.469, "delta_pos_arcsec": [-2.32, 0.19], "flux_mjy": 3.39, "quality_flag": 0},
            {"epoch_id": "EP-2025C", "obs_date": "2025-10-04T02:50:18Z", "mjd": 60952.118, "delta_pos_arcsec": [-4.65, 0.38], "flux_mjy": 3.45, "quality_flag": 0},
            {"epoch_id": "EP-2026A", "obs_date": "2026-01-16T19:33:40Z", "mjd": 61056.815, "delta_pos_arcsec": [-7.02, 0.58], "flux_mjy": 3.40, "quality_flag": 0},
        ],
        "spectral_signature": "cold_y_dwarf"
    },
    "epsilon_indi_b": {
        "id": "epsilon_indi_b",
        "name": "Epsilon Indi B",
        "designations": ["Eps Ind Ba/Bb", "HD 209100B", "HIP 108870B"],
        "classification": "T1+T6 Binary Brown Dwarf",
        "description": "A nearby tight binary brown dwarf system exhibiting rapid proper motion (4.7 arcsec/yr) and classic methane absorption bands in detectors D2 and D3.",
        "coordinates": {
            "ra_deg": 331.04375,
            "dec_deg": -56.78278,
            "ra_sexagesimal": "22h 04m 10.50s",
            "dec_sexagesimal": "-56° 46′ 58.0″",
            "epoch": "J2000.0"
        },
        "distance_ly": 11.83,
        "proper_motion": {
            "pm_ra_mas_yr": 3961.4,
            "pm_dec_mas_yr": -2538.3,
            "total_pm_arcsec_yr": 4.70,
            "motion_type": "Sub-stellar Binary Proper Motion"
        },
        "category": "moving",
        "fov_arcmin": 10.0,
        "default_detector": "D3",
        "default_channel": 42,
        "epochs": [
            {"epoch_id": "EP-2025A", "obs_date": "2025-05-01T08:12:00Z", "mjd": 60796.341, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 28.5, "quality_flag": 0},
            {"epoch_id": "EP-2025B", "obs_date": "2025-08-14T17:34:21Z", "mjd": 60901.732, "delta_pos_arcsec": [1.14, -0.73], "flux_mjy": 28.3, "quality_flag": 0},
            {"epoch_id": "EP-2025C", "obs_date": "2025-11-29T23:59:10Z", "mjd": 61008.999, "delta_pos_arcsec": [2.30, -1.48], "flux_mjy": 28.7, "quality_flag": 0},
            {"epoch_id": "EP-2026A", "obs_date": "2026-03-15T12:05:44Z", "mjd": 61114.504, "delta_pos_arcsec": [3.45, -2.21], "flux_mjy": 28.4, "quality_flag": 0},
        ],
        "spectral_signature": "t_dwarf_methane"
    },
    "rw_aurigae": {
        "id": "rw_aurigae",
        "name": "RW Aurigae",
        "designations": ["RW Aur", "HD 33904", "HIP 24467"],
        "classification": "Classical T Tauri Star (CTTS)",
        "description": "Young protostellar variable binary with severe photometric dimming events due to circumstellar disk dust occultation and accretion flow variations.",
        "coordinates": {
            "ra_deg": 76.95642,
            "dec_deg": 30.40139,
            "ra_sexagesimal": "05h 07m 49.54s",
            "dec_sexagesimal": "+30° 24′ 05.0″",
            "epoch": "J2000.0"
        },
        "distance_ly": 532.0,
        "proper_motion": {
            "pm_ra_mas_yr": 1.2,
            "pm_dec_mas_yr": -22.4,
            "total_pm_arcsec_yr": 0.022,
            "motion_type": "Stationary Young Stellar Object"
        },
        "category": "variable",
        "fov_arcmin": 10.0,
        "default_detector": "D4",
        "default_channel": 58,
        "epochs": [
            {"epoch_id": "EP-2025A", "obs_date": "2025-04-18T20:10:00Z", "mjd": 60783.840, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 142.6, "quality_flag": 0},
            {"epoch_id": "EP-2025B", "obs_date": "2025-08-02T14:45:12Z", "mjd": 60889.614, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 48.2, "quality_flag": 0}, # Dimming event!
            {"epoch_id": "EP-2025C", "obs_date": "2025-11-20T07:22:40Z", "mjd": 61000.307, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 79.1, "quality_flag": 0},
            {"epoch_id": "EP-2026A", "obs_date": "2026-02-28T16:08:19Z", "mjd": 61100.672, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 165.0, "quality_flag": 0}, # Flare/Recovery!
        ],
        "spectral_signature": "t_tauri_disk"
    },
    "r_draconis": {
        "id": "r_draconis",
        "name": "R Draconis",
        "designations": ["R Dra", "HD 149214", "HIP 80582", "AAVSO 1632+66"],
        "classification": "Mira Pulsating Red Giant",
        "description": "Luminous asymptotic giant branch (AGB) pulsating star with a ~245.5-day pulsation cycle and dramatic infrared amplitude variability driven by radial pulsations.",
        "coordinates": {
            "ra_deg": 248.16758,
            "dec_deg": 66.75503,
            "ra_sexagesimal": "16h 32m 40.22s",
            "dec_sexagesimal": "+66° 45′ 18.1″",
            "epoch": "J2000.0"
        },
        "distance_ly": 2150.0,
        "proper_motion": {
            "pm_ra_mas_yr": 12.8,
            "pm_dec_mas_yr": -8.5,
            "total_pm_arcsec_yr": 0.015,
            "motion_type": "Stationary Pulsating Giant"
        },
        "category": "variable",
        "fov_arcmin": 12.0,
        "default_detector": "D6",
        "default_channel": 92,
        "epochs": [
            {"epoch_id": "EP-2025A", "obs_date": "2025-03-25T01:18:22Z", "mjd": 60759.054, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 320.5, "quality_flag": 0}, # Maximum
            {"epoch_id": "EP-2025B", "obs_date": "2025-07-10T19:50:33Z", "mjd": 60866.826, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 62.4, "quality_flag": 0},  # Deep minimum
            {"epoch_id": "EP-2025C", "obs_date": "2025-10-30T10:14:05Z", "mjd": 60978.426, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 185.0, "quality_flag": 0}, # Rising
            {"epoch_id": "EP-2026A", "obs_date": "2026-02-14T05:40:11Z", "mjd": 61085.236, "delta_pos_arcsec": [0.0, 0.0], "flux_mjy": 310.2, "quality_flag": 0}, # Near maximum
        ],
        "spectral_signature": "agb_mira_pulsator"
    }
}

