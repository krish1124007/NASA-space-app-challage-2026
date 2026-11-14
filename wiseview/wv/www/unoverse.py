from io import BytesIO, StringIO
import csv
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

# Serialize first-time SPHEREx downloads so two browser tabs do not fetch the
# same cutouts twice.
_spherex_lock = threading.Lock()


def _json_error(message, status=500):
    return jsonify({"error": message}), status


class Pawnstars_Composite(Resource):
    def get(self):
        parser = reqparse.RequestParser()
        parser.add_argument("ra", type=float, required=True)
        parser.add_argument("dec", type=float, required=True)
        parser.add_argument("size", type=int, required=True)
        args = parser.parse_args()

        response = requests.get("http://ps1images.stsci.edu/cgi-bin/ps1filenames.py", params={
            "RA": args.ra,
            "DEC": args.dec,
            "filters": "giy",
            "sep": "comma"
        }, timeout=5)

        files = {}
        reader = csv.DictReader(StringIO(response.content.decode("ascii")))
        for row in reader:
            files[row["filter"]] = row["filename"]

        url = "http://ps1images.stsci.edu/cgi-bin/fitscut.cgi?" + urllib.parse.urlencode({
            "red": files["y"],
            "green": files["i"],
            "blue": files["g"],
            "x": args.ra,
            "y": args.dec,
            "size": args.size,
            "wcs": 1,
            "asinh": True,
            "autoscale": 98.00,
            "output_size": 256
        })
        return url

api.add_resource(Pawnstars_Composite, "/pawnstars")


class SearchV3_Page(Resource):
    def get(self):
        return make_response(render_template("flash3.html"))

api.add_resource(SearchV3_Page, "/", "/wiseview-v3", "/wiseview-v2", "/wiseview")


class Xref_Page(Resource):
    def get(self):
        parser = reqparse.RequestParser()
        parser.add_argument("ra", type=float, required=True)
        parser.add_argument("dec", type=float, required=True)
        args = parser.parse_args()

        if xref is None:
            return jsonify({"ids": [], "note": "unWISE cross-match data not installed"})
        try:
            subs = xref.get_subjects_by_coordinates(args.ra, args.dec)
        except Exception:
            subs = []
        return jsonify({"ids": [str(s[0]) for s in subs]})

api.add_resource(Xref_Page, "/xref")


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
