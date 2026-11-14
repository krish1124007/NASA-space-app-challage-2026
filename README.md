# SPHEREx Explorer — Professional Scientific Sky Observation Platform

> *"Discover What Moves Beyond Our Eyes."*

A production-grade, public-facing citizen-science and astronomical research instrument web application built for exploring NASA's SPHEREx (Spectro-Photometer for the History of the Universe, Epoch of Reionization, and Ices Explorer) infrared sky observations, comparing multi-epoch survey imagery, and uncovering moving or variable astrophysical objects.

---

## 🛰️ 1. Scientific Overview & Capabilities

### **Sky Explorer (Primary Workspace)**
- Large astronomical image canvas occupying ~70% of the viewport.
- True **World Coordinate System (WCS)** coordinate grid lines with live RA/DEC tick marks and cursor HUD tracking.
- Cursor readout: Sub-pixel position $[X, Y]$, right ascension (sexagesimal & decimal), declination (sexagesimal & decimal), and calibrated physical surface brightness ($MJy/sr$).
- Cardinal compass orientation reticle (North Up, East Left) adhering to standard astronomical projection conventions.
- Interactive intensity stretch functions: **Asinh** (Astropy standard), **Logarithmic**, **Linear**, and **Square Root**.
- Scientific colormaps: **Astronomical (Ice/Deep)**, **Inverted Astronomical** (black stars on white sky for source inspection), and **Grayscale**.
- Full **FITS Primary Header Inspector** displaying standard IAU FITS header cards (`TELESCOP`, `INSTRUME`, `DETECTOR`, `BUNIT`, `CRVAL1/2`, `CDELT1/2`, `CTYPE1/2`, etc.).

### **Temporal Time Machine (Core Scientific Feature)**
- Chronological alignment of survey epochs (EP-2025A through EP-2026B).
- **Three Comparison Modes**:
  1. **Mode A — Blink Comparison**: Rapidly toggles between two selected epochs (with adjustable interval from 0.5s to 2.5s) to leverage human optical persistence and identify moving point sources.
  2. **Mode B — Side-by-Side Comparison**: Dual synchronized viewports with lock-step pan, zoom, and crosshair tracking.
  3. **Mode C — Difference Image**: Direct astrometric pixel subtraction ($I_{\text{diff}} = I_2 - I_1$). Static background stars cancel out completely; moving sources display the classic **dipolar signature** (negative red depression at $t_1$, positive cyan/blue peak at $t_2$).
- Interactive timeline scrubber with epoch nodes, play/pause controls, loop mode, and variable playback speeds ($0.5\times, 1\times, 2\times, 4\times$).

### **Moving Object & Transient Candidate Detection**
- Automated multi-epoch centroid tracking, calculating:
  - Angular displacement ($\Delta\theta$ in arcseconds)
  - Estimated proper motion rate ($\mu$ in $\text{arcsec/year}$)
  - Detection confidence score ($0\% - 100\%$)
  - Detection signal-to-noise ratio ($SNR$ in units of $\sigma$)
  - Photometric flux variation ($\Delta m$)
- Scientifically cautious classifications (**Candidate Moving Object**, **Variable Source**, **Stationary Reference Star**, **Unclassified Candidate**).
- Direct submission pipeline to the **Citizen-Science Discovery Registry**.

### **102-Band Infrared Spectrophotometry**
- Comprehensive coverage of all **102 nominal SPHEREx spectral channels** across **6 HgCdTe detector groups** ($D1$ through $D6$), spanning $0.75\,\mu\text{m}$ to $5.00\,\mu\text{m}$.
- High-resolution interactive Spectral Energy Distribution (SED) chart with $1\sigma$ error bars and resolving power indicators.
- **Astrochemical Molecular Ice Overlays**:
  - $\text{H}_2\text{O}$ ice (broad libration feature at $3.05\,\mu\text{m}$)
  - $\text{CO}_2$ ice ($4.27\,\mu\text{m}$)
  - $\text{CO}$ ice ($4.67\,\mu\text{m}$)
  - Methanol ice ($\text{CH}_3\text{OH}$ at $3.53\,\mu\text{m}$)
  - Methane ($\text{CH}_4$ at $1.66\,\mu\text{m}$ & $3.32\,\mu\text{m}$)
  - Polycyclic Aromatic Hydrocarbons (PAHs at $3.29\,\mu\text{m}$)
  - Hydrogen recombination lines: $\text{Pa}\alpha$ ($1.875\,\mu\text{m}$) and $\text{Br}\alpha$ ($4.052\,\mu\text{m}$)
- Scientifically handles detector edge dropouts and flagged channels.
- Multi-band RGB false-color composition simulator (assigning arbitrary channels to Red, Green, and Blue).
- Downloadable 102-band spectrum CSV.

### **Scientific Benchmark Targets Included**
1. **Barnard's Star** (GJ 699, M4.0V) — Highest known proper motion star ($10.39\,\text{arcsec/yr}$).
2. **WISE 0855-0714** (Y4 Dwarf) — Coldest known sub-stellar brown dwarf ($\sim 250\,\text{K}$) with massive proper motion ($8.16\,\text{arcsec/yr}$) and deep methane/water vapor absorption.
3. **Epsilon Indi B** (T1+T6 Binary) — Close binary brown dwarf system ($4.70\,\text{arcsec/yr}$) showing rich methane bandheads in D2 and D3.
4. **RW Aurigae** (CTTS) — Classical T Tauri protostellar variable with dusty circumstellar accretion disk and dramatic photometric dimming events ($\Delta m > 2.4$).
5. **R Draconis** (Mira Variable) — High-amplitude pulsating asymptotic giant branch red giant with $\sim 245.5$-day period and strong infrared molecular opacities.

---

## 🎨 2. Design System

Adheres strictly to the professional astronomical research instrument design philosophy:
- **Palette**: Deep charcoal and midnight navy backgrounds (`#0B1016`, `#111923`, `#18232E`), black astronomical canvas (`#070B0E`), restrained icy-blue and muted cyan accents (`#8CB7D8`, `#5EEAD4`, `#A6B6C4`), subtle borders (`#1F2D3D`).
- **Typography**: `Inter` for interface structure and labels; `JetBrains Mono` for coordinates, timestamps, pixel values, and scientific metadata.
- **Strictly Avoided**: Cartoon planets, rockets, purple gradients, generic SaaS dashboards, and unscientific decorations.

---

## 🛠️ 3. Architecture & Tech Stack

```
Nasa-space-2026/
├── backend/
│   ├── main.py               # FastAPI REST endpoints & CORS
│   ├── catalog.py            # Preconfigured targets, detectors, channels, lines
│   ├── astrometry.py         # Astropy WCS, sexagesimal/decimal math, coordinate parsing
│   ├── spherex_service.py    # Image synthesis, FITS arrays, difference imaging, candidate detection
│   └── spectrum_service.py   # 102-channel SED generator with molecular ice absorption physics
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TopNav.tsx               # Top header, data release badge, link share
│   │   │   ├── Overview.tsx             # Welcome dashboard, quick search, featured targets
│   │   │   ├── SkyExplorer.tsx          # 70% astronomical canvas workspace + control sidebars
│   │   │   ├── TimeMachine.tsx          # Blink, Side-by-Side, and Difference Image engine
│   │   │   ├── SpectralAnalysis.tsx     # 102-channel SED chart + molecular ice library
│   │   │   ├── Discoveries.tsx          # Citizen science candidate registry & CSV exporter
│   │   │   ├── AboutSPHEREx.tsx         # Mission background, 3 science pillars, instrument optics
│   │   │   ├── AstronomicalCanvas.tsx   # Interactive HTML5 Canvas with WCS grid & reticles
│   │   │   ├── HeaderModal.tsx          # FITS primary header card inspector
│   │   │   ├── CandidateModal.tsx       # Flag and save candidate modal
│   │   │   ├── PreferencesModal.tsx     # Coordinate format and unit preferences
│   │   │   └── DocumentationModal.tsx   # Research guide modal
│   │   ├── services/
│   │   │   └── api.ts                   # Backend client with intelligent offline fallback
│   │   ├── types.ts                     # TypeScript definitions
│   │   ├── App.tsx                      # Primary router and application state
│   │   └── main.tsx                     # Vite entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
└── README.md
```

---

## 🚀 4. How to Run Locally

### Prerequisites
- **Python 3.10+** (Astropy, FastAPI, NumPy, SciPy, Uvicorn, Pillow)
- **Node.js 18+** & **npm**

### Step 1: Start the Backend Server
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
API Documentation will be available at: `http://127.0.0.1:8000/docs`.

### Step 2: Start the Frontend Application
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 3000
```
Open your browser at: **`http://127.0.0.1:3000/`**.

