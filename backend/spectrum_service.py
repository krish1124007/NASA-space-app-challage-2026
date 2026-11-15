"""
SPHEREx 102-channel Infrared Spectral Synthesis and Extraction Service.
Generates authentic SEDs (Spectral Energy Distributions) from 0.75 um to 5.00 um
incorporating realistic molecular absorption/emission lines (H2O, CO2, CO, CH4, PAHs, Silicates).
"""

import numpy as np
from typing import Dict, Any, List, Optional
from backend.catalog import SPECTRAL_CHANNELS, DETECTOR_RANGES, SPECTRAL_FEATURES, PRECONFIGURED_TARGETS

def generate_spectrum_for_target(target_id: Optional[str], ra: float, dec: float) -> Dict[str, Any]:
    """
    Computes flux density (in mJy) across all 102 nominal SPHEREx spectral channels.
    """
    channels_data = []
    
    # Check if target is one of the preconfigured targets
    target_info = PRECONFIGURED_TARGETS.get(target_id) if target_id else None
    sig = target_info.get("spectral_signature", "generic_stellar") if target_info else "generic_stellar"
    base_flux = target_info.get("epochs", [{}])[0].get("flux_mjy", 15.0) if target_info else 12.0
    
    for ch_info in SPECTRAL_CHANNELS:
        ch = ch_info["channel"]
        w = ch_info["wavelength_um"]
        det = ch_info["detector"]
        
        # Base continuum calculation (Blackbody Planck curve approximation)
        if sig == "red_dwarf_m4v":
            # Barnard's Star ~3100 K M-dwarf
            T = 3130.0
            # Planck-like curve normalized
            x = 14387.7 / (w * T)
            continuum = (1.0 / (w**5 * (np.exp(np.clip(x, 1e-4, 50)) - 1))) * 1e-7
            flux = base_flux * (continuum / 0.008)
            
            # Water vapor absorption around 1.4 um and 1.9 um
            flux *= 1.0 - 0.35 * np.exp(-((w - 1.40)**2) / 0.02)
            flux *= 1.0 - 0.40 * np.exp(-((w - 1.90)**2) / 0.03)
            # CO absorption band head at 2.3 um and 4.6 um
            flux *= 1.0 - 0.25 * np.exp(-((w - 2.30)**2) / 0.015)
            flux *= 1.0 - 0.20 * np.exp(-((w - 4.67)**2) / 0.04)

        elif sig == "cold_y_dwarf":
            # WISE 0855 ~250 K ultra-cold brown dwarf
            # Heavy absorption everywhere except narrow 4-5 um atmospheric window
            T = 250.0
            # Strong flux peak between 4.0 and 4.8 um, almost zero in near-IR
            if w < 2.0:
                flux = base_flux * 0.02 * (w / 2.0)**3
            elif w < 3.5:
                flux = base_flux * 0.15 * (w / 3.5)**2
            else:
                # 4.5 um window flux
                peak = np.exp(-((w - 4.6)**2) / 0.35)
                flux = base_flux * (0.2 + 1.8 * peak)
            
            # Deep H2O ice/vapor absorption at 3.0 um
            flux *= 1.0 - 0.65 * np.exp(-((w - 3.05)**2) / 0.08)
            # Deep CH4 methane absorption at 3.3 um
            flux *= 1.0 - 0.70 * np.exp(-((w - 3.32)**2) / 0.05)

        elif sig == "t_dwarf_methane":
            # Epsilon Indi B ~1200 K T-dwarf
            # Prominent methane bands at 1.66 um, 2.2 um, 3.3 um
            flux = base_flux * (1.2 / (1.0 + ((w - 1.25) / 0.8)**2))
            # Methane absorption troughs
            flux *= 1.0 - 0.55 * np.exp(-((w - 1.66)**2) / 0.025)
            flux *= 1.0 - 0.60 * np.exp(-((w - 2.20)**2) / 0.04)
            flux *= 1.0 - 0.65 * np.exp(-((w - 3.32)**2) / 0.06)
            # 1.4 and 1.9 um water bands
            flux *= 1.0 - 0.45 * np.exp(-((w - 1.40)**2) / 0.02)
            flux *= 1.0 - 0.50 * np.exp(-((w - 1.90)**2) / 0.03)

        elif sig == "t_tauri_disk":
            # RW Aurigae Classical T Tauri star with protoplanetary dust disk
            # Stellar photospheric continuum + warm circumstellar dust excess in 3-5 um
            photosphere = base_flux * 0.6 * (1.0 / w**1.5)
            dust_excess = base_flux * 0.8 * np.exp(-((w - 3.8)**2) / 1.5)
            flux = photosphere + dust_excess
            # Silicate emission feature near 3.5-4.0 um
            flux += base_flux * 0.25 * np.exp(-((w - 3.6)**2) / 0.2)
            # Water ice absorption feature from cold outer disk mantles
            flux *= 1.0 - 0.30 * np.exp(-((w - 3.05)**2) / 0.05)
            # Hydrogen Paschen alpha and Brackett alpha emission lines from accretion shocks
            flux += base_flux * 0.35 * np.exp(-((w - 1.875)**2) / 0.003)
            flux += base_flux * 0.20 * np.exp(-((w - 4.052)**2) / 0.004)

        elif sig == "agb_mira_pulsator":
            # R Draconis Pulsating Mira Red Giant ~2500 K
            T = 2500.0
            x = 14387.7 / (w * T)
            continuum = (1.0 / (w**5 * (np.exp(np.clip(x, 1e-4, 50)) - 1))) * 1e-7
            flux = base_flux * (continuum / 0.012)
            # Strong CO molecular absorption at 2.3 um and 4.67 um
            flux *= 1.0 - 0.45 * np.exp(-((w - 2.32)**2) / 0.03)
            flux *= 1.0 - 0.55 * np.exp(-((w - 4.67)**2) / 0.06)
            # Circumstellar water ice
            flux *= 1.0 - 0.25 * np.exp(-((w - 3.05)**2) / 0.04)

        else:
            # Generic coordinate background source
            flux = base_flux * (1.0 / (w**1.2)) * (0.95 + 0.1 * np.sin(w * 3.14))

        # Add instrumental noise and calibration uncertainty
        noise_std = 0.03 * flux + 0.05
        # Ensure repeatable pseudo-random noise using channel number
        np.random.seed(int(ch * 100 + abs(int(ra * 10))))
        noise = np.random.normal(0, noise_std * 0.3)
        observed_flux = max(0.01, round(float(flux + noise), 4))
        flux_err = round(float(noise_std), 4)
        
        # Signal to Noise Ratio
        snr = round(float(observed_flux / max(1e-4, flux_err)), 1)
        
        # Test simulated missing channels / detector edge dropouts (e.g. channel 1 or 102 under extreme conditions)
        is_valid = True
        status_flag = "VALID"
        if ch in [51, 68] and sig == "generic_stellar": # Detector boundary gap
            is_valid = False
            status_flag = "DETECTOR_GAP_FLAGGED"

        channels_data.append({
            "channel": ch,
            "detector": det,
            "wavelength_um": w,
            "bandwidth_um": ch_info["bandwidth_um"],
            "resolving_power": ch_info["resolving_power"],
            "flux_mjy": observed_flux if is_valid else None,
            "flux_err_mjy": flux_err if is_valid else None,
            "snr": snr if is_valid else None,
            "is_valid": is_valid,
            "status_flag": status_flag
        })

    # Summary statistics
    valid_fluxes = [c["flux_mjy"] for c in channels_data if c["flux_mjy"] is not None]
    peak_flux = max(valid_fluxes) if valid_fluxes else 0.0
    min_flux = min(valid_fluxes) if valid_fluxes else 0.0
    mean_flux = round(float(np.mean(valid_fluxes)), 4) if valid_fluxes else 0.0

    return {
        "target_id": target_id,
        "target_name": target_info["name"] if target_info else f"Source ({round(ra, 4)}, {round(dec, 4)})",
        "spectral_signature": sig,
        "total_channels": 102,
        "valid_channels_count": len(valid_fluxes),
        "peak_flux_mjy": round(peak_flux, 4),
        "min_flux_mjy": round(min_flux, 4),
        "mean_flux_mjy": mean_flux,
        "channels": channels_data,
        "reference_features": SPECTRAL_FEATURES
    }

