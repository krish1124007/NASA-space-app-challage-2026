from io import BytesIO, StringIO
import csv
import os
import sys
import threading
import traceback
import urllib

from flask import (
    Flask,
    jsonify,
    make_response,
    render_template,
    request,
    send_file,
    send_from_directory,
)
from flask_restful import Api, Resource, reqparse
from werkzeug.exceptions import HTTPException

import requests

# Image processing
import numpy as np
import astropy.io.fits as aif

from wv import config
from wv.common import gaia as gaia_mod
from wv.common import spherex as spherex_mod

# unWISE support is optional. It needs index files that are not part of a fresh
# checkout, so import failures must not stop the SPHEREx/Gaia mode from running.
try:
    import wv.common.xref as xref
    import wv.common.unwise_tiles as unwtiles
    import wv.common.unwise_cutout as unwcutout
except Exception:  # pragma: no cover - depends on local data/credentials
    xref = None
    unwtiles = None
    unwcutout = None

try:
    import uwsgi
except ImportError:
    # Dan doesn't really know why UWSGI starts twice, but he's hoping that the first ime
    # is just.... i dunno... loading a master or something?
    # Then the rest does the real work?
    pass

app = Flask(__name__)
api = Api(app)
app.config['PROPAGATE_EXCEPTIONS'] = True

config.ensure_dirs()

# Discovery path for SPHEREx Explorer frontend and backend
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "static")

try:
    from backend.catalog import PRECONFIGURED_TARGETS
    from backend.spherex_service import (
        synthesize_astronomical_image,
        compute_difference_image,
        extract_candidates_from_epochs,
        DISCOVERY_REGISTRY
    )
    from backend.astrometry import parse_astronomical_coordinates
    from backend.spectrum_service import generate_spectrum_for_target
    from backend.nasa_ingest import query_gaia_crossmatch
    HAS_EXPLORER_BACKEND = True
except Exception as e:
    HAS_EXPLORER_BACKEND = False
    print(f"Warning: SPHEREx Explorer backend routes not loaded in Flask: {e}")

# Bump to invalidate browser-cached static assets after frontend changes.
app.config["ASSET_VERSION"] = os.environ.get("WV_ASSET_VERSION", "2026.11.14.4")

# Serialize first-time SPHEREx downloads so two browser tabs do not fetch the
# same cutouts twice.
_spherex_lock = threading.Lock()


def _json_error(message, status=500):
    return jsonify({"error": message}), status


@app.get("/pawnstars")
def pawnstars():
    """Pan-STARRS cutout URL for the lower comparison strip."""
    try:
        ra = float(request.args["ra"])
        dec = float(request.args["dec"])
        size = int(float(request.args.get("size", 1024)))
    except (KeyError, ValueError):
        return _json_error("ra, dec and size are required", 400)

    try:
        response = requests.get("http://ps1images.stsci.edu/cgi-bin/ps1filenames.py", params={
            "RA": ra,
            "DEC": dec,
            "filters": "giy",
            "sep": "comma"
        }, timeout=10)
        response.raise_for_status()
    except Exception as exc:
        return _json_error(f"Pan-STARRS lookup failed: {exc}", 502)

    files = {}
    reader = csv.DictReader(StringIO(response.content.decode("ascii")))
    for row in reader:
        files[row["filter"]] = row["filename"]
    if not all(k in files for k in ("y", "i", "g")):
        return _json_error("Pan-STARRS image not found for this position", 404)

    url = "http://ps1images.stsci.edu/cgi-bin/fitscut.cgi?" + urllib.parse.urlencode({
        "red": files["y"],
        "green": files["i"],
        "blue": files["g"],
        "x": ra,
        "y": dec,
        "size": size,
        "wcs": 1,
        "asinh": True,
        "autoscale": 98.00,
        "output_size": 256
    })
    return jsonify({"url": url})


class SearchV3_Page(Resource):
    def get(self):
        legacy = request.args.get("legacy")
        if legacy in ("1", "true", "True"):
            return make_response(render_template("flash3.html"))
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if not os.path.exists(index_file):
            alt_path = os.path.join(os.path.dirname(__file__), "dist", "index.html")
            if os.path.exists(alt_path):
                index_file = alt_path
        if os.path.exists(index_file):
            with open(index_file, "r", encoding="utf-8") as f:
                html = f.read()
            return make_response(html, 200, {"Content-Type": "text/html; charset=utf-8"})
        return make_response(render_template("flash3.html"))

api.add_resource(SearchV3_Page, "/", "/wiseview-v3", "/wiseview-v2", "/wiseview")


@app.get("/legacy")
def legacy_page():
    """Access classic WiseView flash3 interface if requested."""
    return make_response(render_template("flash3.html"))


@app.get("/assets/<path:filename>")
def serve_frontend_assets(filename):
    """Serve SPHEREx Explorer bundled frontend JS/CSS assets."""
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if not os.path.exists(assets_dir):
        assets_dir = os.path.join(os.path.dirname(__file__), "dist", "assets")
    return send_from_directory(assets_dir, filename)


# ---------------------------------------------------------------------------
# SPHEREx Explorer Citizen Science API Integration
# ---------------------------------------------------------------------------

@app.get("/api/targets")
def api_targets():
    if not HAS_EXPLORER_BACKEND:
        return jsonify([])
    return jsonify(list(PRECONFIGURED_TARGETS.values()))


@app.get("/api/targets/<target_id>")
def api_target_details(target_id):
    if not HAS_EXPLORER_BACKEND or target_id not in PRECONFIGURED_TARGETS:
        return _json_error(f"Target '{target_id}' not found", 404)
    return jsonify(PRECONFIGURED_TARGETS[target_id])


@app.post("/api/search")
def api_search():
    if not HAS_EXPLORER_BACKEND:
        return _json_error("Search service unavailable", 503)
    data = request.get_json(force=True) or {}
    query = data.get("query")
    ra = data.get("ra")
    dec = data.get("dec")
    fov = float(data.get("fov_arcmin", 10.0))
    ch = int(data.get("channel", 12))

    if query:
        q_norm = query.strip().lower()
        for t_id, t_data in PRECONFIGURED_TARGETS.items():
            if q_norm in t_data["name"].lower() or q_norm == t_id:
                return jsonify({
                    "matched_target": t_data,
                    "is_preconfigured": True,
                    "ra_deg": t_data["coordinates"]["ra_deg"],
                    "dec_deg": t_data["coordinates"]["dec_deg"],
                    "ra_sexagesimal": t_data["coordinates"]["ra_sexagesimal"],
                    "dec_sexagesimal": t_data["coordinates"]["dec_sexagesimal"],
                    "fov_arcmin": t_data["fov_arcmin"],
                    "default_channel": t_data["default_channel"],
                })

    ra_str = str(ra or "")
    dec_str = str(dec or "")
    parsed = parse_astronomical_coordinates(ra_str, dec_str)
    return jsonify({
        "matched_target": None,
        "is_preconfigured": False,
        "ra_deg": parsed["ra_deg"],
        "dec_deg": parsed["dec_deg"],
        "ra_sexagesimal": parsed["ra_sexagesimal"],
        "dec_sexagesimal": parsed["dec_sexagesimal"],
        "fov_arcmin": fov,
        "default_channel": ch,
    })


@app.get("/api/observations")
def api_observations():
    if not HAS_EXPLORER_BACKEND:
        return _json_error("Observations service unavailable", 503)
    target_id = request.args.get("target_id")
    ra = request.args.get("ra")
    dec = request.args.get("dec")
    channel = int(request.args.get("channel", 12))
    fov_arcmin = float(request.args.get("fov_arcmin", 10.0))
    stretch = request.args.get("stretch", "asinh")
    colormap = request.args.get("colormap", "grayscale")

    if target_id and target_id in PRECONFIGURED_TARGETS:
        t = PRECONFIGURED_TARGETS[target_id]
        target_name = t["name"]
        center_ra = t["coordinates"]["ra_deg"]
        center_dec = t["coordinates"]["dec_deg"]
        pm_ra = t["proper_motion"]["pm_ra_mas_yr"]
        pm_dec = t["proper_motion"]["pm_dec_mas_yr"]
        parallax = t["proper_motion"]["parallax_mas"]
        is_var = (t["category"] == "variable")
    else:
        target_name = "Custom Target"
        center_ra = float(ra or 0.0)
        center_dec = float(dec or 0.0)
        pm_ra, pm_dec, parallax, is_var = 0.0, 0.0, 0.0, False

    epochs_meta = [
        {"epoch_id": "EP-2025A", "obs_date": "2025-04-12T08:30:00Z", "dt_years": 0.00},
        {"epoch_id": "EP-2025B", "obs_date": "2025-07-28T14:15:00Z", "dt_years": 0.29},
        {"epoch_id": "EP-2025C", "obs_date": "2025-11-15T20:45:00Z", "dt_years": 0.59},
        {"epoch_id": "EP-2026A", "obs_date": "2026-03-01T11:00:00Z", "dt_years": 0.88},
    ]

    obs_list = []
    for ep in epochs_meta:
        res = synthesize_astronomical_image(
            center_ra, center_dec, channel, fov_arcmin,
            ep["dt_years"], pm_ra, pm_dec, parallax, is_var,
            stretch, colormap, 0
        )
        obs_list.append({
            "epoch_id": ep["epoch_id"],
            "obs_date": ep["obs_date"],
            "channel": channel,
            "fov_arcmin": fov_arcmin,
            "image_url": res["image_data_uri"],
            "metadata": res["metadata"],
        })

    candidates = extract_candidates_from_epochs(target_name, center_ra, center_dec, obs_list)
    return jsonify({
        "target_name": target_name,
        "ra_deg": center_ra,
        "dec_deg": center_dec,
        "fov_arcmin": fov_arcmin,
        "channel": channel,
        "total_epochs": len(obs_list),
        "observations": obs_list,
        "detected_candidates": candidates,
    })


@app.get("/api/difference")
def api_difference():
    if not HAS_EXPLORER_BACKEND:
        return _json_error("Difference engine unavailable", 503)
    target_id = request.args.get("target_id", "wise_0855")
    e1_idx = int(request.args.get("epoch1", 0))
    e2_idx = int(request.args.get("epoch2", 3))
    ch = int(request.args.get("channel", 12))
    fov = float(request.args.get("fov_arcmin", 10.0))
    res = compute_difference_image(target_id, e1_idx, e2_idx, ch, fov)
    return jsonify(res)


@app.get("/api/spectrum")
def api_spectrum():
    if not HAS_EXPLORER_BACKEND:
        return _json_error("Spectrum engine unavailable", 503)
    target_id = request.args.get("target_id")
    ra = request.args.get("ra")
    dec = request.args.get("dec")
    ra_val = float(ra) if ra else None
    dec_val = float(dec) if dec else None
    return jsonify(generate_spectrum_for_target(target_id, ra_val, dec_val))


@app.get("/api/crossmatch/gaia")
def api_crossmatch_gaia():
    try:
        ra = float(request.args["ra"])
        dec = float(request.args["dec"])
        r = float(request.args.get("radius_arcmin", 6.0))
        stars = query_gaia_crossmatch(ra, dec, r)
        return jsonify(stars)
    except Exception:
        return jsonify([])


@app.get("/api/pawnstars")
def api_pawnstars():
    return pawnstars()


@app.get("/api/discoveries")
def api_discoveries():
    return jsonify(DISCOVERY_REGISTRY)



@app.get("/xref")
def xref_page():
    """unWISE/Zooniverse subject cross-match for a position."""
    try:
        ra = float(request.args["ra"])
        dec = float(request.args["dec"])
    except (KeyError, ValueError):
        return _json_error("ra and dec are required", 400)

    if xref is None:
        return jsonify({"ids": [], "note": "unWISE cross-match data not installed"})
    try:
        subs = xref.get_subjects_by_coordinates(ra, dec)
    except Exception:
        subs = []
    return jsonify({"ids": [str(s[0]) for s in subs]})


class Tiles_Page(Resource):
    def get(self):
        if unwtiles is None:
            return "unWISE support not installed", 503
        parser = reqparse.RequestParser()
        parser.add_argument("ra", type=float, required=True)
        parser.add_argument("dec", type=float, required=True)
        args = parser.parse_args()

        try:
            tiles = unwtiles.get_tiles(args.ra, args.dec)
        except Exception as exc:
            return str(exc), 503

        res = {"tiles": []}
        for coadd_id, coadds in tiles.groupby(level=[0]):
            wcs = unwtiles.tr_cutout_solutions[coadd_id]
            px, py = wcs.wcs_world2pix(np.array([[args.ra, args.dec]]), 0)[0]
            res["tiles"].append({"coadd_id": str(coadd_id),
                                 "px": px, "py": py,
                                 "epochs": [{"band": int(coadd.name[2]),
                                             "epoch": int(coadd.name[1]),
                                             "mjdmean": float(coadd["MJDMEAN"]),
                                             "forward": int(coadd["FORWARD"])}
                                            for _, coadd in coadds.iterrows()]})
        return jsonify(res)

api.add_resource(Tiles_Page, "/tiles")


class Cutout_Page(Resource):
    def get(self):
        if unwcutout is None:
            return "unWISE support not installed", 503
        parser = reqparse.RequestParser()
        parser.add_argument("ra", type=float, required=True)
        parser.add_argument("dec", type=float, required=True)
        parser.add_argument("size", type=int, required=True)
        parser.add_argument("band", type=int, choices=(1, 2), required=True)
        parser.add_argument("epoch", type=int, required=True)
        parser.add_argument("covmap", type=bool, required=False, default=False)
        args = parser.parse_args()

        try:
            coadds = unwtiles.get_tiles(args.ra, args.dec).loc[(slice(None),
                                                                args.epoch,
                                                                args.band), :]
        except Exception as exc:
            return str(exc), 503

        if len(coadds) == 0:
            return "unWISE data not available for parameters", 404

        coadd = coadds.iloc[0, :]
        coadd_id, epoch, band = coadd.name

        if args.covmap:
            im, cm = unwcutout.get_by_tile_epoch(
                coadd_id, epoch, args.ra, args.dec, band,
                size=args.size, fits=True, covmap=True)
            im = aif.open(BytesIO(im))
            cm = aif.open(BytesIO(cm))
            im = aif.PrimaryHDU(im[0].data, header=im[0].header)
            cm = aif.ImageHDU(cm[0].data, header=cm[0].header)
            sio = BytesIO()
            aif.HDUList([im, cm]).writeto(sio)
            sio.seek(0)
        else:
            cutout = unwcutout.get_by_tile_epoch(
                coadd_id, epoch, args.ra, args.dec, band,
                size=args.size, fits=True)
            sio = BytesIO(cutout)
            sio.seek(0)

        return send_file(sio, "application/binary")

api.add_resource(Cutout_Page, "/cutout")


# ---------------------------------------------------------------------------
# SPHEREx + Gaia local mode
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    unwise_ready = False
    unwise_error = None
    if unwtiles is not None:
        try:
            unwtiles.ensure_loaded()
            unwise_ready = True
        except Exception as exc:
            unwise_error = str(exc)
    else:
        unwise_error = "unWISE modules not importable"
    return jsonify({
        "status": "ok",
        "service": "wiseview",
        "modes": ["unwise", "spherex"],
        "unwise_ready": unwise_ready,
        "unwise_error": unwise_error,
        "spherex_collection": config.SPHEREX_COLLECTION,
        "gaia_table": config.GAIA_TABLE,
        "data_dir": str(config.DATA_DIR),
    })


@app.get("/api/spherex/visits")
def spherex_visits():
    try:
        ra = float(request.args["ra"])
        dec = float(request.args["dec"])
    except (KeyError, ValueError):
        return _json_error("ra and dec are required", 400)
    detector = request.args.get("detector", "D2").upper()
    if detector not in config.DETECTORS:
        return _json_error("detector must be D1..D6", 400)
    radius_deg = float(request.args.get("radius_deg", 0.05))
    collection = request.args.get("collection") or config.SPHEREX_COLLECTION
    try:
        rows = spherex_mod.query_sia(ra, dec, radius_deg, collection=collection)
    except Exception as exc:
        return _json_error(f"IRSA SIA query failed: {exc}", 502)
    visits = spherex_mod.select_visits(rows, detector)
    return jsonify({
        "ra": ra,
        "dec": dec,
        "detector": detector,
        "collection": collection,
        "count": len(visits),
        "visits": visits,
    })


@app.get("/api/spherex/frames")
def spherex_frames():
    try:
        ra = float(request.args["ra"])
        dec = float(request.args["dec"])
    except (KeyError, ValueError):
        return _json_error("ra and dec are required", 400)

    detector = request.args.get("detector", "D2").upper()
    if detector not in config.DETECTORS:
        return _json_error("detector must be D1..D6", 400)

    wavelength = request.args.get("wavelength")
    wavelength = float(wavelength) if wavelength not in (None, "", "null") else None
    size_arcsec = request.args.get("size")
    if size_arcsec not in (None, "", "null"):
        size_deg = max(0.01, min(float(size_arcsec) / 3600.0, 0.30))
    else:
        size_deg = None

    stretch = float(request.args.get("stretch", 1.0))
    invert = request.args.get("invert", "0") in ("1", "true", "True")
    out_pixels = int(request.args.get("pixels", config.SPHEREX_FRAME_PIXELS))

    try:
        with _spherex_lock:
            meta = spherex_mod.build_frames(
                ra, dec, detector=detector, wavelength=wavelength,
                size_deg=size_deg, out_pixels=out_pixels,
                stretch=stretch, invert=invert,
                collection=request.args.get("collection") or config.SPHEREX_COLLECTION,
            )
    except LookupError as exc:
        return _json_error(str(exc), 404)
    except Exception as exc:
        app.logger.error("SPHEREx frame build failed: %s", traceback.format_exc())
        return _json_error(f"SPHEREx frame build failed: {exc}", 502)
    return jsonify(meta)


@app.route("/api/gaia/cone", methods=["GET", "POST"])
def gaia_cone():
    try:
        ra = float(request.values["ra"])
        dec = float(request.values["dec"])
    except (KeyError, ValueError):
        return _json_error("ra and dec are required", 400)
    radius_deg = request.values.get("radius_deg")
    if radius_deg is None:
        radius_arcmin = request.values.get("radius_arcmin")
        radius_deg = float(radius_arcmin) / 60.0 if radius_arcmin else 0.05
    try:
        result = gaia_mod.cone(ra, dec, float(radius_deg))
    except Exception as exc:
        return _json_error(f"Gaia TAP query failed: {exc}", 502)
    return jsonify(result)


@app.get("/media/<path:filename>")
def media(filename):
    return send_from_directory(config.MEDIA_DIR, filename)


@app.errorhandler(HTTPException)
def handle_http_exception(exc):
    return _json_error(exc.description, exc.code)


@app.errorhandler(Exception)
def handle_exception(exc):
    app.logger.error("Unhandled error: %s", traceback.format_exc())
    return _json_error(str(exc), 500)


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
