"""
Provide a coordinate-based lookup for ByW subjects

TODO: This all needs to be re-written to support WCS...
"""

import numpy as np
import astropy.table as at # need to do this first, or astropy will barf?
import astropy.io as aio
import wv.common.rdballtree as rdbt


# Field of View of a flipbook in degrees
byw_fov = np.sqrt(((0.0975*2)**2)*2)

# Hold all the subjects by center coordinate in a balltree
subject_tree = None
_load_error = None
_loaded = False


def ensure_loaded():
    """Load the Zooniverse subject cache on first use.

    The original module loaded wsubcache.csv at import time, which made the
    whole Flask app fail on a fresh checkout. Missing data now degrades to an
    empty result instead.
    """
    global subject_tree, _load_error, _loaded
    if _loaded:
        return subject_tree
    _loaded = True
    try:
        import os
        from wv import config
        cachepath = os.environ.get("WV_UNWISE_SUBJECTS", config.UNWISE_SUBJECTS)
        if os.path.exists(cachepath):
            subject_tree = read_cache(cachepath)
    except Exception as exc:  # missing file, unreadable CSV, ...
        _load_error = str(exc)
        subject_tree = None
    return subject_tree


def get_subjects_by_coordinates(ra,dec):
    tree = ensure_loaded()
    if tree is None:
        return []
    # Get subjects within fov
    res = tree.query_radius(ra,dec,byw_fov)

    # Sort by nearest
    res = [(tree.table["subject_id"][res[0][0][i]],res[1][0][i]) for i in range(len(res[0][0]))]
    
    return sorted(res,key=lambda x: x[1])


def read_cache(cachepath):
    """Read subjects from list on disk"""
    # Load subjects
    tbl = aio.ascii.Csv().read(cachepath)

    # Store in balltree (it's faster w/o a cache)
    rdtree = rdbt.rdtree(tbl,#filename="%s.rdbtcache"%cachepath,
                         rakey="ra",deckey="de")

    return rdtree


def __init(cachepath):
    """Populate subject_tree (kept for backwards compatibility)."""
    global subject_tree

    subject_tree = read_cache(cachepath)
