import React from 'react';
import { 
  Telescope, 
  Layers, 
  Database, 
  Award, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles, 
  Globe,
  Radio,
  FileCode,
  Compass
} from 'lucide-react';

export const AboutSPHEREx: React.FC = () => {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Title Banner */}
      <div className="border-b border-surface-border pb-6 space-y-3">
        <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-primary/10 border border-primary/30 text-primary text-xs font-mono">
          <Globe className="w-3.5 h-3.5" />
          <span>NASA Astrophysics Mid-Scale Explorer Mission</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text-main">
          About NASA's SPHEREx Mission
        </h1>
        <p className="text-sm text-text-muted max-w-4xl leading-relaxed">
          The Spectro-Photometer for the History of the Universe, Epoch of Reionization, and Ices Explorer (SPHEREx) 
          is a NASA space observatory designed to perform the first near-infrared all-sky spectral survey. 
          By taking spectra of 450+ million galaxies and 100+ million stars across 102 distinct infrared bands, 
          SPHEREx maps the cosmos across space and time.
        </p>
      </div>

      {/* Three Science Pillars Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-text-main tracking-tight">
          Three Primary Scientific Pillars
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Pillar 1: Cosmic Inflation */}
          <div className="p-5 rounded border border-surface-border bg-surface space-y-3">
            <div className="w-8 h-8 rounded bg-primary/10 border border-primary/30 text-primary flex items-center justify-center font-mono font-bold text-xs">
              01
            </div>
            <h3 className="font-semibold text-sm text-text-main">
              The Origin of the Universe: Cosmic Inflation
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              SPHEREx measures non-Gaussianity in cosmological primordial density perturbations by charting 
              the three-dimensional spatial distribution of hundreds of millions of galaxies, testing 
              models of cosmic inflation occurring in the first fraction of a microsecond after the Big Bang.
            </p>
          </div>

          {/* Pillar 2: Cosmic Light */}
          <div className="p-5 rounded border border-surface-border bg-surface space-y-3">
            <div className="w-8 h-8 rounded bg-scientific-cyan/10 border border-scientific-cyan/30 text-scientific-cyan flex items-center justify-center font-mono font-bold text-xs">
              02
            </div>
            <h3 className="font-semibold text-sm text-text-main">
              The Origin of Galaxies: Cosmic Light & EOR
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Using spatial fluctuation analysis of the Extragalactic Background Light (EBL), SPHEREx traces 
              the total aggregated photon emission of the earliest stars, proto-galaxies, and black holes 
              during the Epoch of Reionization, revealing light inaccessible to single-object imaging.
            </p>
          </div>

          {/* Pillar 3: Biogenic Ices */}
          <div className="p-5 rounded border border-surface-border bg-surface space-y-3">
            <div className="w-8 h-8 rounded bg-scientific-success/10 border border-scientific-success/30 text-scientific-success flex items-center justify-center font-mono font-bold text-xs">
              03
            </div>
            <h3 className="font-semibold text-sm text-text-main">
              The Origin of Water: Interstellar Biogenic Ices
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              SPHEREx surveys absorption bands of water ice ($H_2O$ at 3.05 µm), carbon dioxide ice ($CO_2$ at 4.27 µm), 
              carbon monoxide ice ($CO$ at 4.67 µm), and organic molecules in interstellar molecular clouds 
              and protoplanetary disks, mapping prebiotic ingredients available to emerging planetary systems.
            </p>
          </div>
        </div>
      </div>

      {/* Technical Instrument Specifications */}
      <div className="rounded border border-surface-border bg-surface p-6 space-y-5">
        <h2 className="text-lg font-semibold text-text-main tracking-tight flex items-center space-x-2">
          <Telescope className="w-4 h-4 text-primary" />
          <span>Instrument Architecture & Optics</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="bg-surface-elevated p-3 rounded border border-surface-border">
            <span className="text-text-muted text-[10px] block">Telescope Aperture:</span>
            <span className="text-text-main font-semibold text-sm">20 cm (Schmidt)</span>
            <span className="text-[10px] text-text-muted block mt-1">Wide 3.5° × 11.3° total FOV</span>
          </div>

          <div className="bg-surface-elevated p-3 rounded border border-surface-border">
            <span className="text-text-muted text-[10px] block">Detector Arrays:</span>
            <span className="text-text-main font-semibold text-sm">6 × 2048² HgCdTe</span>
            <span className="text-[10px] text-text-muted block mt-1">Hawaii-2RG focal planes</span>
          </div>

          <div className="bg-surface-elevated p-3 rounded border border-surface-border">
            <span className="text-text-muted text-[10px] block">Spectral Coverage:</span>
            <span className="text-scientific-cyan font-semibold text-sm">0.75 µm – 5.00 µm</span>
            <span className="text-[10px] text-text-muted block mt-1">102 spectral bands</span>
          </div>

          <div className="bg-surface-elevated p-3 rounded border border-surface-border">
            <span className="text-text-muted text-[10px] block">Spatial Pixel Scale:</span>
            <span className="text-scientific-success font-semibold text-sm">6.2″ per pixel</span>
            <span className="text-[10px] text-text-muted block mt-1">All-Sky Nyquist sampled</span>
          </div>
        </div>

        {/* 6 Detectors Table */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left font-mono text-xs border border-surface-border">
            <thead className="bg-surface-elevated text-[11px] text-text-muted uppercase">
              <tr>
                <th className="p-2.5">Detector</th>
                <th className="p-2.5">Wavelength Range</th>
                <th className="p-2.5">Channels</th>
                <th className="p-2.5">Resolving Power (R)</th>
                <th className="p-2.5">Key Astrophysical Tracers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border text-secondary">
              <tr>
                <td className="p-2.5 font-semibold text-primary">Detector 1 (D1)</td>
                <td className="p-2.5">0.75 – 1.11 µm</td>
                <td className="p-2.5">Channels 1–17</td>
                <td className="p-2.5">R ≈ 41</td>
                <td className="p-2.5 text-text-main">Hα, Paschen lines, M-dwarf TiO/VO continua</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-primary">Detector 2 (D2)</td>
                <td className="p-2.5">1.11 – 1.64 µm</td>
                <td className="p-2.5">Channels 18–34</td>
                <td className="p-2.5">R ≈ 41</td>
                <td className="p-2.5 text-text-main">Near-IR J/H continuum, T-dwarf methane $CH_4$</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-primary">Detector 3 (D3)</td>
                <td className="p-2.5">1.64 – 2.42 µm</td>
                <td className="p-2.5">Channels 35–51</td>
                <td className="p-2.5">R ≈ 41</td>
                <td className="p-2.5 text-text-main">Paschen α (1.875µm), CO bandhead (2.3µm), $H_2$ 1-0 S(1)</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-primary">Detector 4 (D4)</td>
                <td className="p-2.5">2.42 – 3.82 µm</td>
                <td className="p-2.5">Channels 52–68</td>
                <td className="p-2.5">R ≈ 35</td>
                <td className="p-2.5 text-text-main">Water ice $H_2O$ libration (3.05µm), PAH 3.3µm emission</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-primary">Detector 5 (D5)</td>
                <td className="p-2.5">3.82 – 4.42 µm</td>
                <td className="p-2.5">Channels 69–85</td>
                <td className="p-2.5">R ≈ 110</td>
                <td className="p-2.5 text-text-main">Pure & mixed $CO_2$ ice (4.27µm), Brackett α (4.05µm)</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-primary">Detector 6 (D6)</td>
                <td className="p-2.5">4.42 – 5.00 µm</td>
                <td className="p-2.5">Channels 86–102</td>
                <td className="p-2.5">R ≈ 130</td>
                <td className="p-2.5 text-text-main">Carbon monoxide $CO$ ice (4.67µm), cold brown dwarf flux peak</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* NASA IRSA Data Architecture & Citizen Science */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded border border-surface-border bg-surface space-y-3 font-mono text-xs">
          <div className="flex items-center space-x-2 text-primary font-sans font-semibold">
            <Database className="w-4 h-4" />
            <span>NASA IRSA Archive & Protocols</span>
          </div>
          <p className="text-text-muted leading-relaxed font-sans">
            SPHEREx data products are hosted by the NASA/IPAC Infrared Science Archive (IRSA).
            The SPHEREx Explorer interfaces with standard IVOA protocols:
          </p>
          <ul className="space-y-1.5 text-secondary">
            <li>• <strong className="text-text-main">SIA2:</strong> Simple Image Access v2 for cone queries and footprint matching</li>
            <li>• <strong className="text-text-main">IRSA Cutout API:</strong> Sub-cube extraction and WCS resampling</li>
            <li>• <strong className="text-text-main">MOST:</strong> Moving Object Search Tool for solar system ephemerides</li>
            <li>• <strong className="text-text-main">DR1 All-Sky Cube:</strong> Calibrated 3D spectro-spatial tiles</li>
          </ul>
        </div>

        <div className="p-5 rounded border border-surface-border bg-surface space-y-3 text-xs">
          <div className="flex items-center space-x-2 text-scientific-success font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Citizen-Science Motion Detection Guide</span>
          </div>
          <p className="text-text-muted leading-relaxed">
            Follow these best practices when discovering candidates:
          </p>
          <ul className="space-y-1.5 text-text-muted font-mono text-[11px]">
            <li>1. Use the <strong className="text-primary">Blink Comparison</strong> mode to quickly flag pixel jumps.</li>
            <li>2. Inspect the <strong className="text-scientific-cyan">Difference Map</strong>: real moving targets exhibit clear positive/negative dipoles.</li>
            <li>3. Check against diffraction spikes and detector edge contamination flags.</li>
            <li>4. Record findings into the <strong className="text-scientific-success">Discovery Registry</strong> for follow-up review.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

