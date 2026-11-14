import React, { useState } from 'react';
import { Target, ViewTab } from '../types';
import { 
  Search, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  Layers, 
  Telescope, 
  Database, 
  ExternalLink,
  Zap,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  PlusCircle,
  Upload
} from 'lucide-react';

interface OverviewProps {
  targets: Target[];
  onSelectTarget: (targetId: string, openTab?: ViewTab) => void;
  onSearch: (query: string) => void;
  onNavigateTab: (tab: ViewTab) => void;
}

export const Overview: React.FC<OverviewProps> = ({
  targets,
  onSelectTarget,
  onSearch,
  onNavigateTab,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    try {
      setErrorMsg('');
      onSearch(searchInput.trim());
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing search');
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-md border border-surface-border bg-gradient-to-r from-surface via-surface-card to-surface p-6 sm:p-10 shadow-sm">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            <span>NASA SPHEREx Sky Survey · Public Science Workspace</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-main">
            Explore the changing universe.
          </h1>

          <p className="text-sm sm:text-base text-text-muted leading-relaxed">
            Welcome to SPHEREx Explorer — a professional astronomical research platform analyzing NASA's 
            all-sky infrared spectrophotometry. Track high-proper-motion stars, uncover sub-stellar brown dwarfs, 
            detect fast-moving Near-Earth Asteroids, and trace biogenic water and ice across 102 spectral bands.
          </p>

          {/* Unified Coordinate Search Input */}
          <form onSubmit={handleSearchSubmit} className="pt-2">
            <div className="relative flex items-center max-w-2xl">
              <Search className="absolute left-3.5 w-4 h-4 text-text-muted pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter coordinates (e.g. 08h 55m 10.8s, -07° 14′ 42″ or 133.795, -7.245) or target name (WISE 0855)..."
                className="w-full pl-10 pr-28 h-10 rounded bg-surface-elevated border border-surface-border text-xs text-text-main placeholder-text-muted/60 focus:outline-none focus:border-primary font-mono transition-colors"
              />
              <button
                type="submit"
                className="absolute right-1.5 h-7 px-3.5 rounded bg-primary text-[#0B1016] text-xs font-semibold hover:bg-primary-hover transition-colors flex items-center space-x-1.5"
              >
                <span>Explore</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {errorMsg && (
              <p className="text-xs text-scientific-danger mt-1.5 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] text-text-muted">
              <span>Quick tests:</span>
              <button 
                type="button" 
                onClick={() => setSearchInput("08h 55m 10.831s, -07° 14′ 42.53″")}
                className="font-mono text-secondary hover:text-primary underline decoration-dotted"
              >
                WISE 0855 (Sexagesimal)
              </button>
              <span>·</span>
              <button 
                type="button" 
                onClick={() => setSearchInput("269.452, 4.693")}
                className="font-mono text-secondary hover:text-primary underline decoration-dotted"
              >
                Barnard's Star (Decimal)
              </button>
              <span>·</span>
              <button 
                type="button" 
                onClick={() => setSearchInput("RW Aurigae")}
                className="font-mono text-secondary hover:text-primary underline decoration-dotted"
              >
                RW Aurigae
              </button>
            </div>
          </form>
        </div>

        {/* Quick Launch Buttons */}
        <div className="mt-6 pt-6 border-t border-surface-border/60 flex flex-wrap items-center gap-3">
          <button
            onClick={() => onNavigateTab('explorer')}
            className="flex items-center space-x-2 h-8 px-4 rounded bg-surface-elevated border border-surface-border text-text-main text-xs hover:border-primary/60 transition-colors font-medium"
          >
            <Telescope className="w-4 h-4 text-primary" />
            <span>Launch Sky Explorer</span>
          </button>
          <button
            onClick={() => onNavigateTab('time-machine')}
            className="flex items-center space-x-2 h-8 px-4 rounded bg-surface-elevated border border-surface-border text-text-main text-xs hover:border-primary/60 transition-colors font-medium"
          >
            <Clock className="w-4 h-4 text-scientific-cyan" />
            <span>Temporal Time Machine</span>
          </button>
          <button
            onClick={() => onNavigateTab('spectral')}
            className="flex items-center space-x-2 h-8 px-4 rounded bg-surface-elevated border border-surface-border text-text-main text-xs hover:border-primary/60 transition-colors font-medium"
          >
            <Layers className="w-4 h-4 text-scientific-success" />
            <span>102-Band Spectrophotometry</span>
          </button>
        </div>
      </div>

      {/* Featured Scientific Targets Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-main tracking-tight">
              Featured Scientific Targets
            </h2>
            <p className="text-xs text-text-muted">
              Preconfigured astronomical benchmark sources demonstrating extreme proper motion and photometric variability.
            </p>
          </div>
          <span className="text-xs font-mono text-text-muted hidden sm:inline">
            5 Benchmark Targets Loaded · 1 Custom Field
          </span>
        </div>

        {/* Balanced 2x3 Grid with Pinned Bottom Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {targets.map((t) => {
            const isMoving = t.category === 'moving';
            return (
              <div
                key={t.id}
                className="group relative rounded border border-surface-border bg-surface hover:bg-surface-elevated transition-all p-5 flex flex-col justify-between"
              >
                {/* Header & Description */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm text-text-main group-hover:text-primary transition-colors">
                        {t.name}
                      </h3>
                      <p className="text-xs text-text-muted font-mono">{t.classification}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        isMoving
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'border-scientific-warning/30 bg-scientific-warning/10 text-scientific-warning'
                      }`}
                    >
                      {isMoving ? 'Moving Source' : 'Variable Source'}
                    </span>
                  </div>

                  <p className="text-xs text-text-muted leading-relaxed line-clamp-3">
                    {t.description}
                  </p>
                </div>

                {/* Target Scientific Metrics - Pinned to bottom */}
                <div className="space-y-2 pt-4 mt-4 border-t border-surface-border/60 text-xs font-mono">
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <span className="text-text-muted">RA (J2000):</span>
                    <span className="text-secondary text-right">{t.coordinates.ra_sexagesimal}</span>
                    <span className="text-text-muted">DEC (J2000):</span>
                    <span className="text-secondary text-right">{t.coordinates.dec_sexagesimal}</span>
                    <span className="text-text-muted">{isMoving ? 'Proper Motion:' : 'Amplitude Var:'}</span>
                    <span className="text-scientific-cyan text-right font-medium">
                      {isMoving ? `${t.proper_motion.total_pm_arcsec_yr}″/yr` : `Δm > 2.5 mag`}
                    </span>
                    <span className="text-text-muted">Epochs Available:</span>
                    <span className="text-secondary text-right">{t.epochs.length} survey epochs</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      onClick={() => onSelectTarget(t.id, 'explorer')}
                      className="flex-1 h-8 rounded bg-surface-card border border-surface-border hover:border-primary/50 text-[11px] font-medium text-text-main flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <Telescope className="w-3.5 h-3.5 text-primary" />
                      <span>Sky Explorer</span>
                    </button>
                    <button
                      onClick={() => onSelectTarget(t.id, 'time-machine')}
                      className="flex-1 h-8 rounded bg-surface-card border border-surface-border hover:border-scientific-cyan/50 text-[11px] font-medium text-text-main flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5 text-scientific-cyan" />
                      <span>Time Machine</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Balanced 6th Card: Custom Sky Field & NASA Ingest */}
          <div className="group relative rounded border border-dashed border-surface-border/90 hover:border-primary/50 bg-surface/50 hover:bg-surface-elevated transition-all p-5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-text-main group-hover:text-primary transition-colors flex items-center space-x-1.5">
                    <span>Custom Sky Field</span>
                  </h3>
                  <p className="text-xs text-text-muted font-mono">Arbitrary Coordinates / FITS</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-scientific-success/30 bg-scientific-success/10 text-scientific-success">
                  User Defined
                </span>
              </div>

              <p className="text-xs text-text-muted leading-relaxed">
                Explore any right ascension and declination across the sphere, or upload custom FITS cutouts directly from NASA IRSA, WISE, or ESA Gaia.
              </p>
            </div>

            <div className="space-y-2 pt-4 mt-4 border-t border-surface-border/60 text-xs font-mono">
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <span className="text-text-muted">Coordinate System:</span>
                <span className="text-secondary text-right">ICRS J2000 / Galactic</span>
                <span className="text-text-muted">Archive Mode:</span>
                <span className="text-secondary text-right">Live IRSA / Local</span>
                <span className="text-text-muted">Supported Formats:</span>
                <span className="text-scientific-cyan text-right font-medium">.fits / .fit / SIA2</span>
                <span className="text-text-muted">Survey Epochs:</span>
                <span className="text-secondary text-right">All-Sky 2025–2027</span>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={() => onNavigateTab('explorer')}
                  className="flex-1 h-8 rounded bg-primary text-[#0B1016] hover:bg-primary-hover text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Open Custom Sky Field</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Survey Information & Mission Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div className="rounded border border-surface-border bg-surface p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-primary">
              <Database className="w-4 h-4" />
              <h3 className="font-semibold text-xs text-text-main uppercase tracking-wider">
                SPHEREx DR1 Release
              </h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Data Release 1 incorporates all-sky calibrated spectrophotometric cubes, providing 
              unprecedented spatial-spectral data across 0.75 µm to 5.0 µm with ~6.2″ angular resolution.
            </p>
          </div>
          <div className="pt-3 border-t border-surface-border text-[11px] font-mono text-secondary space-y-1">
            <div className="flex justify-between">
              <span>Spectral Bands:</span>
              <span className="text-text-main">102 channels (D1-D6)</span>
            </div>
            <div className="flex justify-between">
              <span>Aperture:</span>
              <span className="text-text-main">20 cm Schmidt telescope</span>
            </div>
          </div>
        </div>

        <div className="rounded border border-surface-border bg-surface p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-scientific-cyan">
              <Clock className="w-4 h-4" />
              <h3 className="font-semibold text-xs text-text-main uppercase tracking-wider">
                Observation Epoch Cadence
              </h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              SPHEREx covers the entire sky every six months in a Sun-synchronous orbit, resulting in 
              four complete survey epochs (EP-2025A through EP-2026B) optimized for temporal difference imaging.
            </p>
          </div>
          <div className="pt-3 border-t border-surface-border text-[11px] font-mono text-secondary space-y-1">
            <div className="flex justify-between">
              <span>Survey Period:</span>
              <span className="text-text-main">2025 – 2027</span>
            </div>
            <div className="flex justify-between">
              <span>Sky Coverage:</span>
              <span className="text-scientific-success font-semibold">100% All-Sky Complete</span>
            </div>
          </div>
        </div>

        <div className="rounded border border-surface-border bg-surface p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-scientific-success">
              <CheckCircle2 className="w-4 h-4" />
              <h3 className="font-semibold text-xs text-text-main uppercase tracking-wider">
                Citizen Science Pipeline
              </h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Directly contribute to minor planet recovery, high proper motion discovery, and protostellar 
              variability tracking. All flagged candidates are archived with precise astrometric WCS coordinates.
            </p>
          </div>
          <div className="pt-3 border-t border-surface-border">
            <button
              onClick={() => onNavigateTab('discoveries')}
              className="text-xs text-primary hover:underline font-mono inline-flex items-center space-x-1"
            >
              <span>View Candidate Discoveries Table</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
