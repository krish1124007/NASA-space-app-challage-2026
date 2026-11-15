/*
 * WiseView classic homepage behaviour.
 *
 * Two jobs:
 *   1. Resolve a search string (target name, decimal degrees, or hms/dms) to a
 *      viewer URL.
 *   2. Keep the quick-test links filling the search field.
 *
 * The viewer form is driven entirely by the URL hash that flash3.js already
 * parses (fromUrl at static/flash3.js), so no server round-trip is needed and
 * the classic control surface stays untouched. Coordinates are always emitted
 * as decimal degrees because parseLoc()'s sexagesimal regex does not accept the
 * degree/prime/double-prime symbols used in the placeholder text.
 */

(function () {
    'use strict';

    var dataEl = document.getElementById('wv-home-data');
    var form = document.getElementById('sky-search');
    var input = document.getElementById('sky-search-input');
    var errorEl = document.getElementById('sky-search-error');
    if (!dataEl || !form || !input) {
        return;
    }

    var payload = {};
    try {
        payload = JSON.parse(dataEl.textContent || '{}');
    } catch (err) {
        payload = {};
    }

    var targets = payload.targets || [];
    var viewerUrl = payload.viewer || '/viewer';
    var SEARCH_SIZE_ARCSEC = 600;
    var SEARCH_DETECTOR = 'D2';

    /* ------------------------------------------------------------- helpers */

    function normalise(value) {
        return String(value || '')
            .replace(/[\u00b0\u00ba]/g, ' ')   // degree signs
            .replace(/[\u2032\u2019\u2018']/g, ' ') // prime marks
            .replace(/[\u2033\u201d\u201c"]/g, ' ') // double prime / quotes
            .replace(/,/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function normaliseName(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[\u2019']/g, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function findTarget(raw) {
        var query = normaliseName(raw);
        if (query.length < 3) {
            return null;
        }
        var i, target, name, id;
        for (i = 0; i < targets.length; i += 1) {
            target = targets[i];
            name = normaliseName(target.name);
            id = normaliseName(target.id);
            if (query === name || query === id || name.indexOf(query) !== -1) {
                return target;
            }
        }
        return null;
    }

    function showError(message) {
        if (!errorEl) {
            return;
        }
        errorEl.textContent = message;
        errorEl.hidden = false;
    }

    function clearError() {
        if (!errorEl) {
            return;
        }
        errorEl.textContent = '';
        errorEl.hidden = true;
    }

    function buildViewerUrl(ra, dec, size, detector) {
        var params = [
            'ra=' + ra.toFixed(6),
            'dec=' + dec.toFixed(6),
            'size=' + (size || SEARCH_SIZE_ARCSEC),
            'instrument=spherex',
            'detector=' + (detector || SEARCH_DETECTOR)
        ];
        return viewerUrl + '#' + params.join('&');
    }

    /* ------------------------------------------------------ coordinate parse */

    function decimalHours(hours, minutes, seconds) {
        return (hours + minutes / 60 + seconds / 3600) * 15;
    }

    function decimalDegrees(degrees, minutes, seconds, negative) {
        var value = Math.abs(degrees) + minutes / 60 + seconds / 3600;
        return negative ? -value : value;
    }

    function validate(ra, dec, context) {
        if (!isFinite(ra) || !isFinite(dec)) {
            throw new Error('Could not read a numeric coordinate pair.');
        }
        if (ra < 0 || ra >= 360) {
            throw new Error('Right ascension must be between 0 and 360 degrees' +
                (context ? ' (' + context + ')' : '') + '.');
        }
        if (dec < -90 || dec > 90) {
            throw new Error('Declination must be between -90 and +90 degrees' +
                (context ? ' (' + context + ')' : '') + '.');
        }
        return { ra: ra, dec: dec };
    }

    function parseDesignatorForm(text) {
        // e.g. "08h 55m 10.831s -07d 14m 42.53s"
        var raMatch = text.match(/(\d+(?:\.\d+)?)\s*h\s*(\d+(?:\.\d+)?)\s*m\s*(\d+(?:\.\d+)?)\s*s?/i);
        var decMatch = text.match(/([+-])?\s*(\d+(?:\.\d+)?)\s*d\s*(\d+(?:\.\d+)?)\s*m\s*(\d+(?:\.\d+)?)\s*s?/i);
        if (!raMatch || !decMatch) {
            return null;
        }
        var raHours = parseFloat(raMatch[1]);
        var raMinutes = parseFloat(raMatch[2]);
        var raSeconds = parseFloat(raMatch[3]);
        var decDegrees = parseFloat(decMatch[2]);
        var decMinutes = parseFloat(decMatch[3]);
        var decSeconds = parseFloat(decMatch[4]);
        if (raMinutes >= 60 || raSeconds >= 60 || decMinutes >= 60 || decSeconds >= 60) {
            throw new Error('Minutes and seconds must be below 60.');
        }
        return validate(
            decimalHours(raHours, raMinutes, raSeconds),
            decimalDegrees(decDegrees, decMinutes, decSeconds, decMatch[1] === '-')
        );
    }

    function parseNumbers(text) {
        var stripped = text.replace(/[a-zA-Z]/g, ' ');
        var matches = stripped.match(/[+-]?\d+(?:\.\d+)?/g);
        return matches ? matches.map(parseFloat) : [];
    }

    function parseCoordinates(raw) {
        var text = normalise(raw);
        if (!text) {
            throw new Error('Enter coordinates or a target name.');
        }

        var designator = null;
        try {
            designator = parseDesignatorForm(text);
        } catch (err) {
            throw err;
        }
        if (designator) {
            return designator;
        }

        var values = parseNumbers(text);

        if (values.length === 2) {
            return validate(values[0], values[1]);
        }

        if (values.length === 6) {
            if (values[1] >= 60 || values[2] >= 60 || values[4] >= 60 || values[5] >= 60) {
                throw new Error('Minutes and seconds must be below 60.');
            }
            return validate(
                decimalHours(values[0], values[1], values[2]),
                decimalDegrees(values[3], values[4], values[5], values[3] < 0)
            );
        }

        if (values.length === 4) {
            // "08 55 -07 14" is not enough to place a source; reject clearly.
            throw new Error('Need both RA and Dec: six components (h m s d m s) or two decimal degrees.');
        }

        throw new Error('Could not parse that coordinate. Use "133.795 -7.245" or "08h 55m 10.8s -07d 14m 42s".');
    }

    /* -------------------------------------------------------------- handlers */

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        clearError();
        var raw = input.value.trim();
        if (!raw) {
            showError('Enter coordinates or a target name.');
            return;
        }

        var target = findTarget(raw);
        if (target) {
            window.location.href = target.href_explorer || viewerUrl;
            return;
        }

        try {
            var coords = parseCoordinates(raw);
            window.location.href = buildViewerUrl(coords.ra, coords.dec);
        } catch (err) {
            showError(err && err.message ? err.message : 'Could not parse that coordinate.');
        }
    });

    input.addEventListener('input', clearError);

    var quickLinks = document.querySelectorAll('.quick-link');
    Array.prototype.forEach.call(quickLinks, function (link) {
        link.addEventListener('click', function () {
            input.value = link.getAttribute('data-fill') || '';
            clearError();
            input.focus();
            // Put the caret at the end so the user can append or edit.
            var end = input.value.length;
            try {
                input.setSelectionRange(end, end);
            } catch (err) {
                /* not all input types support selection ranges */
            }
        });
    });

    // Deep links from other pages: /#ra=..&dec=.. should open the viewer.
    if (window.location.hash && /(?:^#|&)(?:ra|dec)=/.test(window.location.hash)) {
        window.location.replace(viewerUrl + window.location.hash);
    }
}());
