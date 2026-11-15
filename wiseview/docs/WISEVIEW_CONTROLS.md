# WiseView Controls Reference

Detailed inventory of every control in this checkout, what it does, where it is
implemented, and which combinations produce the best views.

There are two front-ends sharing one backend:

| UI | Route | Source | Status |
|----|-------|--------|--------|
| Classic WiseView homepage | `/` | `wv/www/templates/flash3_home.html` | Default page, featured-target landing |
| Classic WiseView viewer | `/viewer` (also `/?viewer=1`) | `wv/www/templates/flash3.html`, `wv/www/static/flash3.js` | Full control set |
| SPHEREx Explorer (React) | `/explorer` | `frontend/src/`, bundled into `wv/www/static/assets/` | React explorer |
| Classic WiseView (query flag) | `/?legacy=1` | redirect to `/viewer` | Full control set |

Both are served by `wv/www/unoverse.py`. The classic UI is the one with the dense
control panel and the one this document covers first.

---

## 1. Classic WiseView (`/`)

### 1.1 Settings panel: target and instrument

| Control | Element | URL key | Default | What it does |
|---------|---------|---------|---------|--------------|
| Right ascension and declination | `#locInput` | `ra`, `dec` | M101 `210.80227 54.34895` (SPHEREx) or `133.786245 -7.244372` (unWISE) | Center of the cutout. Accepts decimal degrees (`12.3 45.6`) or sexagesimal with colons, spaces, or `h/m/s d/m/s` designators (`1h2m3.4s -4d5m6s`). Parsed by `parseLoc()`; invalid input aborts the reload. |
| Field of View (arcseconds) | `#sizeInput` | `size` | 600″ (SPHEREx), 176″ (unWISE) | Sky width of the cutout. Clamped to 2000″ in the browser. SPHEREx backend further clamps to 36″–1080″ (`0.01`–`0.30` deg). unWISE converts to pixels with `floor(size / 2.75)`. |
| Data mode | `#instrumentInput` | `instrument` | `spherex` (`config.js: defaultInstrument`) | Switches between `spherex` (IRSA Level 2 spectral images, D1–D6, 0.75–5.0 µm) and `unwise` (legacy WISE W1/W2 coadds). Hides/shows detector + wavelength or band rows. The select is authoritative on every reload. |
| Detector | `#detectorInput` | `detector` | `D2` | SPHEREx detector. Wavelength coverage: D1 0.75–1.11, D2 1.11–1.64, D3 1.64–2.42, D4 2.42–3.82, D5 3.82–4.42, D6 4.42–5.00 µm. |
| Wavelength (µm) | `#wavelengthInput` | `wavelength` | blank = full band | SPHEREx spectral slice. Blank keeps every detector row. A number keeps rows within roughly ±8 spectral pixels (minimum 32 rows) of that wavelength. Visits that do not cover the wavelength are dropped when at least 2 visits do; otherwise all visits stay and `wavelength_note` warns that the blink also changes wavelength. |
| Band[s] | `#bandInput` | `band` | `2` (W2) | unWISE only: `1` = W1, `2` = W2, `3` = W1+W2 color composite (blue W1, red W2, green average). |
| Apply defaults | `#setDefaultsButton` | – | – | Resets the visual stack: stretch 1.0, trim −50/500, window 0.75 yr, no diff/scan/shift/synth, invert on, unique windows on, fit-to-screen. |
| Fit to screen | `#fitButton` | `zoom=fit` | on first load | Computes the largest zoom (0.1–20) that keeps the rendered frame inside the viewport, after subtracting the sidebar and epoch-legend widths. |

Notes:

- The instrument selector re-reads on every `restart()`. Changing data mode
  reloads frames; it does not overlay both instruments.
- Field of view larger than the detector footprint is clipped by IRSA; smaller
  values mean fewer pixels per object but faster renders.

### 1.2 Animation and display sliders

| Control | Element | URL key | Range | Default | Effect |
|---------|---------|---------|-------|---------|--------|
| Sliding window | `#windowInput` | `window` | 0 – data span (years) | 0.5 (load), 0.75 (defaults) | Width of the coadd window in years for unWISE. `0` gives one frame per epoch (time-resolved blink); large values coadd everything (full-depth). The maximum is set from the field's MJD span. SPHEREx ignores it. |
| Blink interval | `#speedInput` | `speed` | 20–1000 ms | 500 | Interval between frames. Lower = faster blink. Changing it restarts the timer and rewrites the URL. |
| Zoom | `#zoomInput` | `zoom` | 0.1–20× | 9, or `fit` | CSS scaling of both canvases and the Pan-STARRS strip. Does not change data resolution. Fit mode stays active across window resizes until an explicit zoom is set. |
| Min–max pixel values | `#trimbrightInput` | `minbright`, `maxbright` | image min–max, symlog slider | −50 / 500 | unWISE only. Lower/upper intensity clip applied before stretching and coaddition. Drag either handle to cut sky noise or stop bright sources from saturating. SPHEREx uses fixed 0.5–99.8 percentile limits instead and ignores these values. |
| Stretch Linearity | `#linearInput` | `linear` | 0.0–1.0 | 1.0 | Shape of the asinh stretch. `1.0` ≈ linear, `0.0` = strongly log-like. unWISE passes it as `stretch`; SPHEREx maps it to `a = (1 − value)·20 + 0.001` inside `arcsinh(x·a)/asinh(a)`. |

### 1.3 Advanced checkboxes

All of these live under the collapsible advanced block. The HTML has several
boxes pre-checked, but `fromUrl()` overrides almost all of them on first load, so
the effective initial state is the table below.

| Control | Element | URL key | Initial | Honored by | What it does |
|---------|---------|---------|---------|------------|--------------|
| Invert pixel values | `#invertInput` | `invert` | on for unWISE, off for SPHEREx | both | Computes `255 − value` after stretching. unWISE images are traditionally negative (black sky); SPHEREx flux maps look natural positive. |
| Maximize dynamic range | `#maxdyrInput` | `maxdyr` | off | unWISE | Sets the frame min/max from the clipped pixel min/max, maximizing contrast. Makes brightness inconsistent between fields and settings. |
| Separate scan directions | `#scandirInput` | `scandir` | off | unWISE | Splits coadds by WISE scan direction and plays the two sets sequentially. Real high-parallax objects can appear in only one scan direction, so this separates them from artifacts. |
| Use only NEOWISE imagery | `#neowiseOnlyInput` | `neowise` | off | unWISE | Drops pre-NEOWISE coadds from coaddition (2010+ only). |
| Skip middle epochs | `#outerEpochsInput` | `outer_epochs` | off | unWISE | Keeps only the first and last frame, making a two-frame pre/post blink. Good for slow motion over a long baseline. |
| Skip duplicate windows | `#uniqueWindowInput` | `unique_window` | on | unWISE | Drops coadds identical to the previous one, so the blink does not waste frames on unchanged windows. |
| Smooth by scan direction | `#smoothScanInput` | `smooth_scan` | off | unWISE | Smooths cutouts to suppress scan-direction-dependent PSF differences. |
| Border epoch 0 | `#borderInput` | `border` | off (defaults off) | both | Draws a dashed border while frame 0 is displayed, so you can tell when the animation wraps. Also borders the Pan-STARRS strip. |
| Gaia eDR3 overlay | `#gaiaInput` | `gaia` | off | both | Queries Gaia and overlays sources. Circle radius encodes parallax (`plx/50` px). Green when `|pmra|+|pmdec| >= 100 mas/yr`, red otherwise. A line runs from the first to the last epoch position using proper motion from the J2016.0 reference epoch (MJD 57388). |
| Difference imaging | `#diffInput` | `diff` | off | unWISE | For each time-resolved coadd: sum everything inside the window (A), sum everything outside (B), display `A − B`. Moving/transient sources light up; static sky cancels. |
| Exclusion window | `#diffWindowInput` | `diff_window` | 0 (defaults) / 1.0 (URL fallback) | unWISE | Years around the target epoch excluded from the subtraction stack, so the source itself is not subtracted away. Only visible while difference imaging is on. |
| Shift and add | `#shiftInput` | `shift` | off | unWISE | Shifts frames by a supplied proper motion before coadding, so a moving object stays aligned and reaches deeper. Reveals `pmra`/`pmdec` inputs when enabled. |
| pmra (mas/yr) | `#pmraInput` | `pmra` | 0 | unWISE | RA proper motion used by shift-and-add, converted to pixels as `(mas/1000)/2.75`. |
| pmdec (mas/yr) | `#pmdecInput` | `pmdec` | 0 | unWISE | Dec proper motion used by shift-and-add. |

Known code quirks worth knowing when interpreting what you see:

- In `query_gaia()` the shift correction is forcibly disabled
  (`shifting = false` after it is read), so Gaia vectors are drawn in the
  un-shifted frame even when Shift-and-add is on.
- `this.color_input = jQuery("#colorInput")` targets an element that does not
  exist, so the `color` URL key is always written as `undefined`/dropped.
- The `uniqueWindowInput` label points at `uniqueWindowsInput` (typo), which only
  matters for the label's `for` attribute.
- `Memoizer.add()` uses `if (this.keys.length = this.size)` (assignment, not
  comparison), so the coadd cache is evicted on every add. This is invisible in
  the UI but means the cache buys nothing.
- `fromUrl()` uses `Number(map.window) || 0.5` and
  `Number(map.diff_window) || 1.0`. A shared link containing `window=0` (the
  time-resolved setting, including links converted from V1 `coadd_mode`) loads
  as 0.5 instead. Set the window with the slider after opening such a link.
- `new_fov()` calls `buildUrl(..., size=fov, zoom=...)`, relying on parameter
  assignment rather than a named argument. It works, but it writes a global
  `size` and is fragile if the function is ever made strict-mode.

### 1.4 Synthetic objects

Two independent synthetic-source injectors. Both are unWISE-only: the fields are
not sent in SPHEREx requests. Each has the same set:

| Field | URL key (A / B) | Meaning |
|-------|-----------------|---------|
| Synthetic Object | `synth_a`, `synth_b` | Enable the injector. |
| Subtraction | `synth_a_sub`, `synth_b_sub` | Subtract the synthetic PSF instead of adding it. |
| RA, Dec | `synth_a_ra/dec`, `synth_b_ra/dec` | Position at the reference MJD. |
| W1 magnitude | `synth_a_w1`, `synth_b_w1` | W1 brightness. |
| W2 magnitude | `synth_a_w2`, `synth_b_w2` | W2 brightness. |
| pmra, pmdec | `synth_a_pmra/pmdec`, `synth_b_pmra/pmdec` | Proper motion in mas/yr. |
| Reference MJD | `synth_a_mjd`, `synth_b_mjd` | Epoch at which the source sits at the given RA/Dec. |

Typical use: inject a fake high-proper-motion source to calibrate what a real
detection looks like at your chosen stretch, window, and cadence.

### 1.5 Tabs

| Tab | Contents |
|-----|----------|
| Settings | All controls above. |
| Links | Deep links for the current coordinates: Legacy Survey viewer, SIMBAD, VizieR, and the nearest Zooniverse/Backyard Worlds subjects (`/xref`). |
| Help | Tutorial video, coordinate syntax, epoch-legend explanation, and a V1 → V3 settings cheat sheet. |
| About | Data provenance, stretch explanation, band-color explanation, credits. |

### 1.6 Canvas and mouse controls

| Action | Result |
|--------|--------|
| Click | Recenters the field on the clicked pixel (`move_fov`). Keeps the current FOV. |
| Drag | Draws a yellow box; on release opens a new tab centered on the drag start with FOV = `drag_sep × PIXSCALE × 2` (minimum 6″), and adjusts zoom so the new field fills the same screen area. Drop out of difference mode in the new tab. |
| Ctrl/Cmd + drag | Same, but in Chrome the new tab can open in the background. |
| Mouse move while dragging | Live yellow rectangle on the overlay canvas. |
| Hover | Nothing beyond the drag rectangle. No coordinate readout in the classic UI. |

### 1.7 Read-only indicators

| Indicator | Meaning |
|-----------|---------|
| Top-left text (`#verValue`) | "SPHEREx D2 · 1.60 µm · 12 visits" for SPHEREx, or "unWISE". On error, shows the backend message. Hover shows `wavelength_note` when wavelength coverage is incomplete. |
| Epoch legend (`+`, `-`, `.`) | One character per global epoch in the current frame: `+` = added, `-` = subtracted (difference imaging), `.` = not used. |
| Frame date text | Month/year spanning the MJDs in the current frame, e.g. `Apr 2025` or `Apr 2015 - Nov 2020`. |
| Dashed border | Animation wrapped to epoch 0 (when Border epoch 0 is on). |
| Pan-STARRS strip | Optical `g/i/y` color composite from STScI under the blink, same center and approximate scale as the current frame. |

### 1.8 URL / permalink reference

The page keeps `window.location.hash` in sync with most controls. Sharing the URL
reproduces the view. Keys written by `buildUrl()`:

```
ra, dec, size, band, instrument, detector, wavelength,
speed, minbright, maxbright, window, diff_window, linear,
zoom (number or "fit"), border, gaia, invert, maxdyr, scandir,
neowise, diff, outer_epochs, unique_window, smooth_scan,
shift, pmra, pmdec,
synth_a, synth_a_sub, synth_a_ra, synth_a_dec, synth_a_w1, synth_a_w2,
synth_a_pmra, synth_a_pmdec, synth_a_mjd,
synth_b, synth_b_sub, synth_b_ra, synth_b_dec, synth_b_w1, synth_b_w2,
synth_b_pmra, synth_b_pmdec, synth_b_mjd
```

V1 links are upgraded automatically. `coadd_mode` mappings in `v1UrlCompat()`:

| V1 `coadd_mode` | V3 equivalent |
|-----------------|---------------|
| `time-resolved` | `window=0` |
| `full-depth` | `window=1.5` |
| `pre-post` | `window=1.5`, `outer_epochs=1` |
| `parallax-enhancing` | `window=100`, `scandir=1` |
| `window-N-year` | `window=N` |
| `window-N-year-parallax-enhancing` | `window=N`, `scandir=1` |
| `parallax-cancelling-*` | `window=0`, `scandir=1` |
| `shift-and-add` | `window=100`, `shift=1` |

The classic UI has **no keyboard shortcuts**. (The React Time Machine does; see
section 3.)

---

## 2. SPHEREx vs unWISE: which controls actually do something

The classic panel is shared, but the backends differ dramatically.

| Control | SPHEREx | unWISE |
|---------|---------|--------|
| RA/Dec, FOV | yes (`/api/spherex/frames`) | yes (external PNG animation API) |
| Detector, wavelength | yes | no (band instead) |
| Band | no | yes |
| Window, difference, exclusion, scan direction, NEOWISE-only, skip middle, skip duplicates, smooth scan, shift-and-add, synthetic objects | **ignored** — not sent, not used in frame building | yes |
| Min/max pixel trim | **ignored** — fixed 0.5/99.8 percentile stretch | yes |
| Stretch linearity | yes (`stretch` query param) | yes (`stretch` param) |
| Invert | yes (server-side, part of the cache key) | yes |
| Zoom, blink interval, border | client-side only | client-side only |
| Gaia overlay | yes, via local `/api/gaia/cone` | yes, via hosted Gaia TAP proxy |

Why: `wv/common/spherex.py:build_frames()` renders exactly one PNG per visit,
cropped to the requested detector rows and stretched server-side. There is no
coaddition stage, so window/difference/shift controls cannot apply. The blink is
temporal (visit-to-visit), not rolling-coadd.

SPHEREx backend details that affect the view:

- Up to `WV_SPHEREX_MAX_VISITS` (default 12) visits, sampled evenly including
  first and last.
- Cutouts are requested at `size` arcsec and rendered to
  `WV_SPHEREX_FRAME_PIXELS` (default 512), letterboxed to a square. Pixel scale
  reported as `cutout_arcsec / 512`.
- Default stretch uses percentile 0.5–99.8 of finite pixels, robust against the
  galaxy core and sky background.
- Rendered PNGs are cached by a hash of file mtime, wavelength, pixels, vmin,
  vmax, stretch, and invert. Changing stretch or invert creates new PNGs.
- If fewer than two cutouts download, the request fails rather than showing a
  single frame.

Wavelength caveat: a small cutout covers only a narrow slice of a detector's
spectral axis (about 0.04 µm in D3 at 600″), and each visit puts a different
slice at the same sky position. Requesting a wavelength therefore also selects
visits, and the blink may mix time and wavelength. The UI puts the warning in
the `#verValue` tooltip and the console.

---

## 3. React SPHEREx Explorer controls (`/`)

Source: `frontend/src/components/TimeMachine.tsx` and
`AstronomicalCanvas.tsx`. This is a separate UI with its own state; it does not
read the classic URL hash.

### 3.1 Time Machine header

| Control | What it does |
|---------|--------------|
| Target dropdown / quick chips | Selects a preconfigured target (`/api/targets`). Changing it reloads observations, difference image, and Gaia. |
| Blink Pair | Alternates between two chosen epochs. Starts playback. |
| Movie Loop | Steps through all epochs in order. |
| Side-by-Side | Two independent epoch canvases with left/right epoch selectors. |
| Difference (I₂−I₁) | Shows `/api/difference` aligned subtraction with peak residual, RMS, and SNR. |
| Live IRSA | Swaps synthetic `/api/observations` for real `/api/spherex/frames` (600″, 512 px, configured detector, stretch 1.0, not inverted). |
| Pan-STARRS | Fetches and shows the optical comparison strip. |
| Invert | Negative/high-contrast view. Keyboard `I`. |
| Levels | Opens the adjustments drawer. |

### 3.2 Playback deck

| Control | What it does |
|---------|--------------|
| Prev / Next | Step one frame; pauses playback. Keyboard ← / →. |
| Play / Pause | Toggle animation. Keyboard Space. |
| Speed 0.5× / 1× / 2× / 4× | Playback interval = `1000 / speed` ms. |
| Loop | Restart at frame 0 instead of stopping. |
| Epoch pills | Jump to a frame. Blink A/B epochs get colored badges. |
| Blink Pair selects (A ↔ B) | Choose the two epochs used by blink mode; also refreshes the difference image. |

### 3.3 Levels drawer

| Control | Range | What it does |
|---------|-------|--------------|
| Contrast | 50–250% | CSS contrast filter on the canvas. |
| Brightness | 50–200% | CSS brightness filter. |
| Colormap | grayscale / infrared cyan / thermal amber | CSS filter recipe applied per colormap. |
| Stretch | asinh / linear / log / sqrt | Selector is stored, but the canvas render path uses CSS filters rather than applying a numeric stretch. |
| Reset Levels | – | Restores 100/100, no invert, grayscale, asinh. |
| Bore Sight | toggle | Center reticle. |
| WCS Grid | toggle | Equatorial grid with RA/Dec labels. |
| Motion Trail | toggle | Synthetic trail points across epochs for the selected candidate. |
| Candidates | toggle | Reticles and labels for detected candidates; click a marker to select. |
| Gaia DR3 (N) | toggle | Gaia sources from `/api/crossmatch/gaia`; loaded on target change. |

### 3.4 Canvas

| Action | Result |
|--------|--------|
| Drag | Pan. |
| Wheel | Zoom 0.4–16×. |
| Click a candidate marker | Select it (opens its detail in the right drawer). |
| Bottom-right buttons | Zoom in, zoom out, fit to screen, reset 1:1, grid, reticle, candidates, Gaia, invert, fullscreen. |
| Cursor HUD | RA/Dec (sexagesimal + decimal), pixel coordinates, estimated flux, zoom and effective FOV. |

Caution: in this checkout the Explorer's `getObservations`, `getDifference`,
`getSpectrum`, and candidate detection use `backend/spherex_service.py`
synthetic data, while `Live IRSA` is the real path. Treat candidate markers,
motion trails, and flux values as demo data unless Live IRSA is on.

---

## 4. Backend routes and tuning knobs

### 4.1 Routes that feed the controls

| Route | Parameters | Used by |
|-------|------------|---------|
| `GET /api/spherex/visits` | `ra`, `dec`, `detector`, `radius_deg`, `collection` | Inspecting available visits without downloading |
| `GET /api/spherex/frames` | `ra`, `dec`, `size` (arcsec), `detector`, `wavelength`, `stretch`, `invert`, `pixels`, `collection` | Classic SPHEREx mode; React Live IRSA |
| `GET/POST /api/gaia/cone` | `ra`, `dec`, `radius_deg` or `radius_arcmin` | Gaia overlay in both UIs |
| `GET /pawnstars` | `ra`, `dec`, `size` (arcsec) | Optical comparison strip |
| `GET /xref` | `ra`, `dec` | Nearest Zooniverse subjects |
| `GET /api/observations` | `target_id`, `channel`, `fov_arcmin` | React Explorer (synthetic unless Live) |
| `GET /api/difference` | `target_id`, `epoch1`, `epoch2` | React difference mode |
| `GET /media/...` | – | Rendered PNG frames |

### 4.2 Environment variables (`wv/config.py`)

| Variable | Default | Effect on the view |
|----------|---------|--------------------|
| `WV_DATA_DIR` | `wiseview/data` | Cache location for cutouts and PNGs |
| `WV_SPHEREX_COLLECTION` | `spherex_dr1` | Which IRSA collection is queried |
| `WV_SPHEREX_MAX_VISITS` | 12 | Number of blink frames; higher = finer time sampling, slower first load |
| `WV_SPHEREX_FRAME_PIXELS` | 512 | Rendered frame size; higher = sharper zoom, slower renders |
| `WV_SPHEREX_CUTOUT_SIZE_DEG` | 0.05 | Fallback cutout size when no `size` given |
| `WV_SPHEREX_RETRIES` | 8 | IRSA retry count |
| `WV_GAIA_TABLE` | `gaiadr3.gaia_source` | Gaia table for the overlay |
| `WV_ASSET_VERSION` | build date | Cache-buster for `flash3.js` / `config.js` |

Frontend endpoints and detector ranges live in
`wv/www/static/config.js` (`window.WV_CONFIG`).

---

## 5. Recipes: using the controls to get a better view

### See whether something really moves
1. unWISE mode, `window=0` (time-resolved) or a small window such as 0.5–1 yr.
2. Turn on **Skip duplicate windows**.
3. Turn on **Border epoch 0** so you notice the wrap.
4. Turn on **Separate scan directions** to reject one-direction artifacts.
5. Blink at 200–400 ms; objects with consistent one-way motion are real.

### Find a faint high-proper-motion object
1. unWISE, moderate window (1–1.5 yr) to build depth.
2. **Difference imaging** on, **Exclusion window** ≈ 1 yr.
3. **Maximize dynamic range** on, then pull the trim slider tighter until the
   background is clean.
4. Stretch linearity around 0.2–0.5 for faint structure.
5. Add **Gaia eDR3 overlay**; red circles are slow stars, green are >100 mas/yr.

### Separate parallax from proper motion
1. **Separate scan directions** on.
2. Move the window all the way right for the parallax-enhancing view.
3. If the source appears only in one scan direction, suspect an artifact.
4. Use **pre/post** (`Skip middle epochs`) for a clean long-baseline pair.

### Measure or validate a candidate's motion
1. Note the RA/Dec and proper motion from a catalog.
2. Enable **Shift and add**, enter `pmra`/`pmdec` in mas/yr. A real source
   sharpens and deepens; a stationary artifact smears.
3. Use the **Synthetic Object** injector with the same magnitude and motion to
   see what a detection of that brightness should look like at your settings.

### Best SPHEREx view of a galaxy or nebula
1. Data mode **SPHEREx**, detector matching the science band (D2 for 1.1–1.6 µm,
   D3 for 1.6–2.4 µm, D4 for 2.4–3.8 µm).
2. Wavelength: leave blank for the full band, or enter a line wavelength to
   isolate a spectral slice.
3. FOV 300–600″: large enough to include background for contrast, small enough
   that IRSA does not clip.
4. Stretch linearity 0.7–1.0; invert off.
5. Remember that window/difference/shift/synthetic controls do nothing here.

### Best SPHEREx view of time variability
1. Keep wavelength blank unless you need a line; a narrow slice reduces visits
   and can make the blink change wavelength as well as time.
2. Increase `WV_SPHEREX_MAX_VISITS` before launching to get more frames.
3. Blink at 500–800 ms; short cadence plus few visits makes fast blinking hard
   to judge.

### Compare against other wavelengths
1. Classic mode has the Pan-STARRS strip permanently under the canvas. Click it
   for the full STScI cutout.
2. Use the Links tab for Legacy Survey (unWISE NEO4 layer), SIMBAD, and VizieR.
3. In the React Explorer, enable **Pan-STARRS** for an in-app optical strip.

### Sharing and reproducing a view
- Classic UI: copy the URL; every visual control except the epoch/legend state
  is in the hash.
- To force the classic UI from a link, append `?legacy=1` or open `/viewer`.
- Pin `zoom=fit` for a layout-independent link, or an explicit number for an
  exact scale.

---

## 6. Suggestions to make the view better (gaps in the current UI)

These follow directly from the code above:

1. **Make SPHEREx coadd controls real or hide them.** Window, difference,
   exclusion, scan direction, NEOWISE-only, skip-middle, skip-duplicates, smooth,
   shift-and-add, and both synthetic injectors are silently ignored in SPHEREx
   mode. Either disable them when `instrument=spherex` or implement coaddition
   server-side in `build_frames()`.
2. **Expose SPHEREx stretch and trim from the UI.** `trimbright` is not sent for
   SPHEREx; only the single `stretch` value is. Sending `minbright`/`maxbright`
   as `vmin`/`vmax` (already supported by `build_frames()`) would give real
   contrast control.
3. **Add a wavelength selector instead of a free-text field.** The backend
   already returns `wave_min_um`, `wave_max_um`, and `frame_waves`; a range or
   slider would prevent the "blink changes wavelength" trap.
4. **Show per-frame wavelength.** `frame_waves` is returned but never displayed.
   A small readout would make spectral blinks honest.
5. **Add coordinate readout and keyboard shortcuts to the classic canvas.**
   Clicks recenter but there is no hover RA/Dec, no arrow-key frame stepping,
   and no play/pause key.
6. **Re-enable the coadd cache** by fixing `if (this.keys.length = this.size)`
   to `===`. It currently evicts on every insert.
7. **Fix or remove the dead `color` URL parameter** (`#colorInput` does not
   exist) and the `uniqueWindowsInput` label typo.
8. **Make shift-and-add affect the Gaia overlay.** Remove the hard-coded
   `shifting = false` in `query_gaia()` if the intent is to compare shifted
   frames with shifted catalog positions.
9. **Surface the epoch legend as labeled rows.** The `+ - .` string is compact
   but unreadable at 12+ epochs; render one row per epoch with date and
   plus/minus state.
10. **Add a frame scrubber and single-frame export** to the classic UI, mirroring
    the React timeline. The React side already has epoch pills and a timeline;
    the classic side only has the blink interval.
11. **Distinguish synthetic and real data in the Explorer UI.** The candidate
    list, motion trails, and flux values come from `spherex_service.py`; label
    them clearly or remove them when Live IRSA is active.
12. **Cache and preload neighbors.** `scripts/fetch_spherex.py` can prefetch a
    field; a "prefetch current field" button would remove the first-load wait.
