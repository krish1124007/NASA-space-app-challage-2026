"""
Comprehensive Data Testing Script for SPHEREx Explorer & WiseView
Tests:
1. FastAPI Backend Health & Data Releases
2. Benchmark Targets Data & Coordinates Integrity (Barnard's Star, WISE 0855, Epsilon Indi B, RW Aurigae, R Draconis)
3. Multi-Epoch Observations Data (Images, WCS, Candidates, SNR, Motion Tracks)
4. Temporal Astrometric Difference Engine (Dipole verification)
5. 102-Band Near-Infrared Spectrophotometry (Ice & Molecular Markers: H2O, CO2, CO, CH4, PAHs)
6. NASA IRSA Cutout API Endpoints
7. Gaia DR3 Cone Search Cross-matching
8. FITS Image File Ingestion & Parsing
9. WiseView SPHEREx Level 2 Algorithms (_stretch, RENDER_VERSION 3, field_id)
"""

import sys
import io
import json
import requests
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS

BASE_URL = "http://127.0.0.1:8000"

def test_health():
    print("\n--- 1. Testing Backend Health & NASA Archive Connectivity ---")
    resp = requests.get(f"{BASE_URL}/api/health", timeout=5)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    print(f"Status: {data.get('status')}")
    print(f"Service: {data.get('service')}")
    print(f"Data Release: {data.get('active_data_release')}")
    print(f"Astropy Version: {data.get('astropy_version')}")
    return True

def test_targets():
    print("\n--- 2. Testing Benchmark Targets Data Integrity ---")
    resp = requests.get(f"{BASE_URL}/api/targets", timeout=5)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    targets = resp.json()
    assert len(targets) >= 5, f"Expected at least 5 benchmark targets, got {len(targets)}"
    
    expected_ids = ["barnards_star", "wise_0855", "epsilon_indi_b", "rw_aurigae", "r_draconis"]
    found_ids = [t["id"] for t in targets]
    
    for eid in expected_ids:
        assert eid in found_ids, f"Target {eid} missing from targets list!"
        t = next(x for x in targets if x["id"] == eid)
        print(f"  ✓ {t['name']:<18} | Cat: {t['category']:<8} | RA: {t['coordinates']['ra_sexagesimal']:<16} | Dec: {t['coordinates']['dec_sexagesimal']:<16} | Motion: {t['proper_motion']['total_pm_arcsec_yr']}″/yr")
    return targets

def test_observations_and_blinking(targets):
    print("\n--- 3. Testing Multi-Epoch Observations & Candidates ---")
    for t in targets:
        tid = t["id"]
        resp = requests.get(f"{BASE_URL}/api/observations", params={"target_id": tid, "channel": 12, "fov_arcmin": 10.0}, timeout=10)
        assert resp.status_code == 200, f"Observations failed for {tid}: {resp.text}"
        data = resp.json()
        
        epochs = data.get("observations", [])
        candidates = data.get("detected_candidates", [])
        assert len(epochs) >= 2, f"Expected at least 2 epochs for {tid}, got {len(epochs)}"
        
        print(f"  ✓ Target {t['name']}: {len(epochs)} survey epochs loaded")
        for ep in epochs:
            assert "image_url" in ep and ep["image_url"].startswith("data:image/png;base64,"), "Invalid base64 image_url"
            wave = ep.get("metadata", {}).get("wavelength_um", 3.25)
            print(f"      • Epoch: {ep['epoch_id']} ({ep['obs_date'][:10]}) | Wavelength: {wave} µm")
            
        print(f"      • Detected Candidates: {len(candidates)}")
        for c in candidates:
            print(f"          - Candidate: {c['candidate_id']} | Type: {c['type']} | Conf: {c['confidence_score']}% | SNR: {c['snr']}σ | Disp: {c['angular_displacement_arcsec']}″")

def test_difference_engine():
    print("\n--- 4. Testing Astrometric Difference Engine (I_diff = I_2 - I_1) ---")
    resp = requests.get(f"{BASE_URL}/api/difference", params={
        "target_id": "wise_0855",
        "epoch1": 0,
        "epoch2": 3
    }, timeout=10)
    assert resp.status_code == 200, f"Difference failed: {resp.text}"
    diff = resp.json()
    assert "difference_image_url" in diff and diff["difference_image_url"].startswith("data:image/png;base64,")
    stats = diff.get("stats", {})
    print(f"  ✓ Difference image generated for WISE 0855 (Epoch 4 − Epoch 1)")
    print(f"      • Peak Positive Residual: {stats.get('max_positive_residual')} MJy/sr")
    print(f"      • Background Noise RMS:   {stats.get('rms_noise')} MJy/sr")
    print(f"      • Dipole Peak SNR:        {stats.get('snr_peak')}σ")
    assert stats.get("snr_peak", 0) > 5.0, "Expected significant dipole SNR detection!"

def test_spectral_analysis(targets):
    print("\n--- 5. Testing 102-Band Infrared Spectrophotometry ---")
    for t in targets[:2]: # test Barnard's Star and WISE 0855
        tid = t["id"]
        resp = requests.get(f"{BASE_URL}/api/spectrum", params={"target_id": tid}, timeout=10)
        assert resp.status_code == 200, f"Spectrum failed for {tid}: {resp.text}"
        spec = resp.json()
        points = spec.get("channels", [])
        features = spec.get("reference_features", [])
        assert len(points) == 102, f"Expected 102 bands, got {len(points)}"
        print(f"  ✓ Target {t['name']}: {len(points)} spectral channels (0.75 - 5.0 µm)")
        print(f"      • Molecular/Ice Markers Identified: {len(features)}")
        for feat in features:
            print(f"          - {feat.get('name', feat.get('label'))} at {feat['wavelength_um']} µm ({feat['type']})")

def test_nasa_irsa_cutout():
    print("\n--- 6. Testing NASA IRSA Cutout Service Endpoint ---")
    resp = requests.post(f"{BASE_URL}/api/import/irsa", json={
        "ra": 133.79513,
        "dec": -7.24515,
        "mission": "SPHEREx",
        "fov_arcmin": 10.0
    }, timeout=5)
    assert resp.status_code == 200, f"IRSA cutout API failed: {resp.text}"
    data = resp.json()
    assert data.get("status") == "connected"
    print(f"  ✓ IRSA Archive: {data.get('archive')}")
    print(f"  ✓ SIA2 Endpoint: {data.get('protocols', {}).get('sia2_endpoint')}")
    print(f"  ✓ IBE Cutout Service: {data.get('protocols', {}).get('ibe_cutout_service')}")

def test_gaia_crossmatch():
    print("\n--- 7. Testing Gaia DR3 Multi-Mission Astrometric Cross-Matching ---")
    resp = requests.get(f"{BASE_URL}/api/crossmatch/gaia", params={
        "ra": 133.79513,
        "dec": -7.24515,
        "radius_arcmin": 6.0
    }, timeout=5)
    assert resp.status_code == 200, f"Gaia crossmatch failed: {resp.text}"
    stars = resp.json()
    assert len(stars) > 0, "No Gaia reference stars returned"
    print(f"  ✓ Gaia DR3: Found {len(stars)} reference stars in 6.0′ cone")
    for s in stars[:3]:
        print(f"      • {s['source_id']}: G={s['g_mag']} mag | Total PM={s['total_pm_mas_yr']} mas/yr | Dist={s['dist_pc']} pc")

def test_fits_upload_and_ingestion():
    print("\n--- 8. Testing Raw FITS Upload & Astropy WCS Ingestion Pipeline ---")
    # Generate a synthetic astronomical FITS cube with astropy
    nx, ny = 128, 128
    data = np.zeros((ny, nx), dtype=np.float32)
    # Add synthetic point sources
    data[64, 64] = 120.5
    data[40, 80] = 75.2
    # Add background noise
    data += np.random.normal(5.0, 1.2, (ny, nx)).astype(np.float32)

    w = WCS(naxis=2)
    w.wcs.crpix = [64.0, 64.0]
    w.wcs.cdelt = [-0.0005, 0.0005] # 1.8 arcsec/pixel
    w.wcs.crval = [133.795, -7.245]
    w.wcs.ctype = ["RA---TAN", "DEC--TAN"]

    header = w.to_header()
    header["TELESCOP"] = "NASA SPHEREx"
    header["INSTRUME"] = "SPHEREx 102-Band Imager"
    header["FILTER"] = "D4-Ch60 (3.25um)"

    hdu = fits.PrimaryHDU(data=data, header=header)
    buf = io.BytesIO()
    hdu.writeto(buf)
    buf.seek(0)

    # Post FITS to API
    files = {"file": ("test_spherex_field.fits", buf.read(), "application/fits")}
    resp = requests.post(f"{BASE_URL}/api/import/fits", files=files, timeout=10)
    assert resp.status_code == 200, f"FITS import failed: {resp.text}"
    res = resp.json()
    assert res.get("status") == "success"
    print(f"  ✓ Ingested FITS: {res.get('filename')}")
    print(f"      • Dimensions: {res.get('dimensions')}")
    print(f"      • Has Celestial WCS: {res.get('has_wcs')}")
    print(f"      • Center RA/Dec: {res.get('center_coordinates')}")
    print(f"      • Peak Flux: {res.get('peak_flux')} MJy/sr | RMS Noise: {res.get('rms_noise')}")
    print(f"      • Rendered Base64 Image Tile: {len(res.get('image_url', ''))} bytes")

def test_wiseview_spherex_module():
    print("\n--- 9. Testing WiseView SPHEREx Module from recent Pull ---")
    try:
        import os
        sys.path.insert(0, os.path.abspath('wiseview'))
        from wv.common.spherex import field_id, RENDER_VERSION, _stretch
        print(f"  ✓ WiseView SPHEREx imported successfully!")
        print(f"  ✓ Active RENDER_VERSION: {RENDER_VERSION} (updated in pull)")
        
        # Test field_id formatting
        fid = field_id(133.79513, -7.24515)
        print(f"  ✓ field_id for WISE 0855: '{fid}'")
        assert "ra133.7951_decm7.2451" in fid or "ra133" in fid
        
        # Test _stretch with robust percentiles (stretch is a float 0.0-1.0)
        test_arr = np.random.normal(10.0, 2.0, (100, 100))
        test_arr[50, 50] = 500.0 # star peak
        scaled, vmin, vmax = _stretch(test_arr, None, None, 0.8)
        print(f"  ✓ Stretch test: vmin={vmin:.3f}, vmax={vmax:.3f}, scaled min={scaled.min():.2f}, scaled max={scaled.max():.2f}")
        assert 0 <= scaled.min() <= scaled.max() <= 255
        print("  ✓ WiseView stretch algorithm functions cleanly.")
    except Exception as e:
        print(f"  ✗ WiseView module test error: {e}")
        raise

if __name__ == "__main__":
    print("==========================================================")
    print(" RUNNING FULL DATA TEST FOR SPHEREX EXPLORER & WISEVIEW   ")
    print("==========================================================")
    try:
        test_health()
        targets = test_targets()
        test_observations_and_blinking(targets)
        test_difference_engine()
        test_spectral_analysis(targets)
        test_nasa_irsa_cutout()
        test_gaia_crossmatch()
        test_fits_upload_and_ingestion()
        test_wiseview_spherex_module()
        print("\n==========================================================")
        print(" 🎉 ALL DATA TESTS PASSED SUCCESSFULLY! (100% HEALTHY)    ")
        print("==========================================================")
    except Exception as err:
        print(f"\n❌ TEST SUITE FAILED: {err}")
        sys.exit(1)
