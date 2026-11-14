import React, { useState, useEffect } from 'react';
import { 
  Target, 
  ObservationsResponse, 
  DetectedCandidate, 
  ViewTab 
} from '../types';
import { ApiService } from '../services/api';
import { AstronomicalCanvas } from './AstronomicalCanvas';
import { 
  Search, 
  RotateCcw, 
  Sliders, 
  FileCode, 
  Info, 
  Clock, 
  Layers, 
  ChevronRight, 
  ChevronLeft,
  AlertCircle,
  Sparkles,
  BookmarkPlus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Compass
} from 'lucide-react';

interface SkyExplorerProps {
  targets: Target[];
  currentTargetId?: string;
  onSelectTarget: (targetId: string) => void;
  onNavigateTab: (tab: ViewTab) => void;
  onOpenHeaderModal: (metadata: any) => void;
  onOpenCandidateModal: (candidate: DetectedCandidate, fieldName: string) => void;
  activeCoords: { ra: number; dec: number };
  setActiveCoords: (coords: { ra: number; dec: number }) => void;
}

export const SkyExplorer: React.FC<SkyExplorerProps> = ({
  targets,
  currentTargetId,
  onSelectTarget,
  onNavigateTab,
  onOpenHeaderModal,
  onOpenCandidateModal,
  activeCoords,
  setActiveCoords,
}) => {
  // Input states
  const [raInput, setRaInput] = useState<string>('08h 55m 10.831s');
  const [decInput, setDecInput] = useState<string>('-07° 14′ 42.53″');
  const [fovArcmin, setFovArcmin] = useState<number>(10.0);
  const [dataRelease, setDataRelease] = useState<string>('DR1-Science');
  const [selectedDetector, setSelectedDetector] = useState<string>('D4');
  const [selectedChannel, setSelectedChannel] = useState<number>(60);
  const [stretch, setStretch] = useState<string>('asinh');
  const [colormap, setColormap] = useState<string>('astronomical');

  // Viewer toggles
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showReticle, setShowReticle] = useState<boolean>(true);
  const [showCandidates, setShowCandidates] = useState<boolean>(true);

  // Data states
  const [observationsData, setObservationsData] = useState<ObservationsResponse | null>(null);
  const [currentEpochIdx, setCurrentEpochIdx] = useState<number>(0);
  const [selectedCandidate, setSelectedCandidate] = useState<DetectedCandidate | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Sidebar collapse states for responsive layout
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState<boolean>(false);

  // Preconfigured channel to detector mapping
  const detectorChannels: Record<string, [number, number]> = {
    'D1': [1, 17],
    'D2': [18, 34],
    'D3': [35, 51],
    'D4': [52, 68],
    'D5': [69, 85],
    'D6': [86, 102],
  };

  // Sync when currentTargetId changes
  useEffect(() => {
    if (currentTargetId) {
      const t = targets.find((x) => x.id === currentTargetId);
      if (t) {
        setRaInput(t.coordinates.ra_sexagesimal);
        setDecInput(t.coordinates.dec_sexagesimal);
        setFovArcmin(t.fov_arcmin);
        setSelectedDetector(t.default_detector);
        setSelectedChannel(t.default_channel);
        setActiveCoords({ ra: t.coordinates.ra_deg, dec: t.coordinates.dec_deg });
        loadObservationData(t.id, t.coordinates.ra_deg, t.coordinates.dec_deg, t.fov_arcmin, t.default_channel);
      }
    } else {
      // Default to WISE 0855
      loadObservationData('wise_0855', 133.79513, -7.24515, 10.0, 60);
    }
  }, [currentTargetId]);

  const loadObservationData = async (
    targetId?: string,
    ra?: number,
    dec?: number,
    fov?: number,
    ch?: number,
    str?: string,
    cmap?: string
  ) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await ApiService.getObservations({
        target_id: targetId,
        ra: ra ?? activeCoords.ra,
        dec: dec ?? activeCoords.dec,
        fov_arcmin: fov ?? fovArcmin,
        channel: ch ?? selectedChannel,
        stretch: str ?? stretch,
        colormap: cmap ?? colormap,
      });
      setObservationsData(res);
      setCurrentEpochIdx(0);
      if (res.detected_candidates.length > 0) {
        setSelectedCandidate(res.detected_candidates[0]);
      } else {
        setSelectedCandidate(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading observation data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const searchRes = await ApiService.searchCoordinates({
        ra: raInput,
        dec: decInput,
        fov_arcmin: fovArcmin,
        channel: selectedChannel,
      });

      setActiveCoords({ ra: searchRes.ra_deg, dec: searchRes.dec_deg });
      setRaInput(searchRes.ra_sexagesimal);
      setDecInput(searchRes.dec_sexagesimal);

      if (searchRes.matched_target) {
        onSelectTarget(searchRes.matched_target.id);
      } else {
        await loadObservationData(undefined, searchRes.ra_deg, searchRes.dec_deg, fovArcmin, selectedChannel);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid astronomical coordinates');
    } finally {
      setLoading(false);
    }
  };

  const handleDetectorChange = (det: string) => {
    setSelectedDetector(det);
    const [minCh] = detectorChannels[det] || [1, 17];
    setSelectedChannel(minCh);
  };

  const currentEpoch = observationsData?.observations[currentEpochIdx];
  const metadata = currentEpoch?.metadata;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Top Workspace Bar */}
      <div className="bg-surface border-b border-surface-border px-4 sm:px-6 h-12 flex items-center justify-between text-xs font-mono flex-shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-text-muted">Target:</span>
            <span className="text-text-main font-semibold">
              {observationsData?.target_name || "Custom Coordinates"}
            </span>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-secondary">
            <span>RA: <strong className="text-text-main">{observationsData?.ra_deg.toFixed(4)}°</strong></span>
            <span>DEC: <strong className="text-text-main">{observationsData?.dec_deg.toFixed(4)}°</strong></span>
          </div>
          <div className="hidden md:flex items-center space-x-2 text-text-muted">
            <span>Epoch:</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-elevated text-primary font-medium">
              {currentEpoch?.epoch_id || 'EP-2025A'} ({currentEpochIdx + 1}/{observationsData?.total_epochs || 4})
            </span>
            <span className="text-secondary">{currentEpoch?.obs_date ? new Date(currentEpoch.obs_date).toLocaleDateString() : ''}</span>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center space-x-2">
          {metadata && (
            <button
              onClick={() => onOpenHeaderModal(metadata)}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-surface-elevated border border-surface-border hover:border-primary/50 text-secondary hover:text-text-main transition-colors"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">FITS Header</span>
            </button>
          )}

          <button
            onClick={() => onNavigateTab('time-machine')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-surface-elevated border border-surface-border hover:border-scientific-cyan/50 text-scientific-cyan transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Time Machine</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column Astronomical Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT CONTROL SIDEBAR (~20%) */}
        <div 
          className={`${
            isLeftCollapsed ? 'w-0 hidden' : 'w-72 sm:w-80'
          } flex-shrink-0 bg-surface border-r border-surface-border flex flex-col overflow-y-auto transition-all duration-200 z-10`}
        >
          <div className="p-4 space-y-5">
            {/* Target Preset Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                Benchmark Targets
              </label>
              <select
                value={currentTargetId || ''}
                onChange={(e) => onSelectTarget(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-surface-elevated border border-surface-border text-xs text-text-main focus:outline-none focus:border-primary font-mono"
              >
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.classification.split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>

            {/* Coordinate Search Form */}
            <form onSubmit={handleSearchSubmit} className="space-y-3 pt-2 border-t border-surface-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Coordinates (J2000)
                </span>
                <span className="text-[10px] text-text-muted font-mono">ICRS</span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-text-muted font-mono">Right Ascension (RA):</label>
                <input
                  type="text"
                  value={raInput}
                  onChange={(e) => setRaInput(e.target.value)}
                  placeholder="08h 55m 10.831s or 133.795"
                  className="w-full px-2.5 py-1.5 rounded bg-surface-elevated border border-surface-border text-xs text-text-main font-mono focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-text-muted font-mono">Declination (DEC):</label>
                <input
                  type="text"
                  value={decInput}
                  onChange={(e) => setDecInput(e.target.value)}
                  placeholder="-07° 14′ 42.53″ or -7.245"
                  className="w-full px-2.5 py-1.5 rounded bg-surface-elevated border border-surface-border text-xs text-text-main font-mono focus:outline-none focus:border-primary"
                />
              </div>

              {/* Field of View */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-text-muted">
                  <span>Field of View (FOV):</span>
                  <span className="font-mono text-primary font-medium">{fovArcmin}′</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[5, 8, 10, 15, 30].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFovArcmin(f)}
                      className={`py-1 text-xs font-mono rounded border ${
                        fovArcmin === f
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-surface-border bg-surface-elevated text-text-muted hover:text-text-main'
                      }`}
                    >
                      {f}′
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Release */}
              <div className="space-y-1">
                <label className="text-[11px] text-text-muted">Data Release:</label>
                <select
                  value={dataRelease}
                  onChange={(e) => setDataRelease(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-surface-elevated border border-surface-border text-xs text-text-main font-mono"
                >
                  <option value="DR1-Science">SPHEREx DR1 (Calibrated Science)</option>
                  <option value="QR3-QuickLook">SPHEREx QR3 (Quick-Look Survey)</option>
                  <option value="All-Sky-Cube">SPHEREx All-Sky Spectral Cube</option>
                </select>
              </div>

              {/* Detector Selector */}
              <div className="space-y-1">
                <label className="text-[11px] text-text-muted">Detector Array (D1–D6):</label>
                <div className="grid grid-cols-6 gap-1">
                  {['D1', 'D2', 'D3', 'D4', 'D5', 'D6'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleDetectorChange(d)}
                      className={`py-1 text-xs font-mono rounded border ${
                        selectedDetector === d
                          ? 'border-primary bg-primary/15 text-primary font-semibold'
                          : 'border-surface-border bg-surface-elevated text-text-muted hover:text-text-main'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spectral Channel Selector */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-text-muted">Spectral Channel:</span>
                  <span className="font-mono text-scientific-cyan">
                    Ch {selectedChannel} ({metadata?.wavelength_um.toFixed(3) || '...'} µm)
                  </span>
                </div>
                <input
                  type="range"
                  min={detectorChannels[selectedDetector]?.[0] || 1}
                  max={detectorChannels[selectedDetector]?.[1] || 17}
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(Number(e.target.value))}
                  className="w-full h-1.5 bg-surface-elevated rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Load / Resolve Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-3 rounded bg-primary hover:bg-primary-hover text-[#0B1016] text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Querying IRSA...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Search & Load Cutout</span>
                  </>
                )}
              </button>
            </form>

            {errorMessage && (
              <div className="p-2.5 rounded bg-scientific-danger/10 border border-scientific-danger/30 text-scientific-danger text-xs flex items-start space-x-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-tight">{errorMessage}</span>
              </div>
            )}

            {/* Display Intensity & Colormap Controls */}
            <div className="space-y-3 pt-3 border-t border-surface-border">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                Intensity Stretch & Palette
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">Stretch:</label>
                  <select
                    value={stretch}
                    onChange={(e) => {
                      setStretch(e.target.value);
                      loadObservationData(undefined, undefined, undefined, undefined, undefined, e.target.value, colormap);
                    }}
                    className="w-full px-2 py-1 rounded bg-surface-elevated border border-surface-border font-mono text-xs text-text-main"
                  >
                    <option value="asinh">Asinh (Astropy)</option>
                    <option value="log">Logarithmic</option>
                    <option value="linear">Linear</option>
                    <option value="sqrt">Square Root</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-text-muted block mb-1">Colormap:</label>
                  <select
                    value={colormap}
                    onChange={(e) => {
                      setColormap(e.target.value);
                      loadObservationData(undefined, undefined, undefined, undefined, undefined, stretch, e.target.value);
                    }}
                    className="w-full px-2 py-1 rounded bg-surface-elevated border border-surface-border font-mono text-xs text-text-main"
                  >
                    <option value="astronomical">Astronomical (Ice/Deep)</option>
                    <option value="grayscale">Grayscale</option>
                    <option value="inverted">Inverted (Black on White)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Left Sidebar Button */}
        <button
          onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-surface border border-surface-border text-text-muted hover:text-text-main p-1 rounded-r shadow"
          title={isLeftCollapsed ? "Expand Controls" : "Collapse Controls"}
        >
          {isLeftCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* CENTER PRIMARY ASTRONOMICAL VIEWER (~60-70%) */}
        <div className="flex-1 flex flex-col bg-[#070B0E] relative overflow-hidden">
          {currentEpoch ? (
            <AstronomicalCanvas
              imageUrl={currentEpoch.image_url}
              centerRa={observationsData?.ra_deg || activeCoords.ra}
              centerDec={observationsData?.dec_deg || activeCoords.dec}
              fovArcmin={observationsData?.fov_arcmin || fovArcmin}
              candidates={observationsData?.detected_candidates || []}
              selectedCandidateId={selectedCandidate?.candidate_id}
              onSelectCandidate={(cand) => setSelectedCandidate(cand)}
              showGrid={showGrid}
              showReticle={showReticle}
              showCandidateMarkers={showCandidates}
              crosshairLabel={`${currentEpoch.epoch_id} · Ch ${metadata?.channel} (${metadata?.wavelength_um.toFixed(2)}µm)`}
              onToggleGrid={() => setShowGrid(!showGrid)}
              onToggleReticle={() => setShowReticle(!showReticle)}
              onToggleCandidates={() => setShowCandidates(!showCandidates)}
              className="flex-1"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-muted text-xs font-mono">
              {loading ? 'Retrieving SPHEREx spectral images...' : 'No observation loaded.'}
            </div>
          )}

          {/* Bottom Epoch Selector Slider */}
          {observationsData && observationsData.observations.length > 0 && (
            <div className="bg-surface/90 border-t border-surface-border px-4 py-2 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-text-muted text-[11px] font-mono">Survey Epoch:</span>
                <div className="flex space-x-1">
                  {observationsData.observations.map((obs, idx) => (
                    <button
                      key={obs.epoch_id}
                      onClick={() => setCurrentEpochIdx(idx)}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                        currentEpochIdx === idx
                          ? 'bg-primary text-[#0B1016] font-semibold'
                          : 'bg-surface-elevated text-secondary hover:text-text-main border border-surface-border'
                      }`}
                    >
                      {obs.epoch_id}
                    </button>
                  ))}
                </div>
              </div>

              <div className="hidden sm:flex items-center space-x-4 text-xs font-mono text-secondary">
                <span>Obs Date: {new Date(currentEpoch?.obs_date || '').toISOString().slice(0, 10)}</span>
                <span>MJD: {currentEpoch?.mjd.toFixed(2)}</span>
                <button
                  onClick={() => onNavigateTab('time-machine')}
                  className="text-scientific-cyan hover:underline inline-flex items-center space-x-1"
                >
                  <span>Animate in Time Machine</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Toggle Right Sidebar Button */}
        <button
          onClick={() => setIsRightCollapsed(!isRightCollapsed)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-surface border border-surface-border text-text-muted hover:text-text-main p-1 rounded-l shadow"
          title={isRightCollapsed ? "Expand Inspector" : "Collapse Inspector"}
        >
          {isRightCollapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* RIGHT SCIENTIFIC METADATA INSPECTOR PANEL (~20%) */}
        <div 
          className={`${
            isRightCollapsed ? 'w-0 hidden' : 'w-72 sm:w-80'
          } flex-shrink-0 bg-surface border-l border-surface-border flex flex-col overflow-y-auto transition-all duration-200 z-10`}
        >
          <div className="p-4 space-y-5">
            {/* Target Identification */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Target Telemetry
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-scientific-success/30 bg-scientific-success/10 text-scientific-success">
                  Valid WCS
                </span>
              </div>
              <h3 className="text-sm font-semibold text-text-main">
                {observationsData?.target_name || "Custom Region"}
              </h3>
              <p className="text-[11px] text-text-muted font-mono">
                {targets.find(t => t.id === currentTargetId)?.classification || 'Astrometric Field'}
              </p>
            </div>

            {/* Instrument & Optics */}
            <div className="space-y-2 pt-2 border-t border-surface-border text-xs font-mono">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                Instrument & Bandpass
              </span>
              <div className="grid grid-cols-2 gap-1 text-[11px] bg-surface-elevated p-2.5 rounded border border-surface-border">
                <span className="text-text-muted">Detector:</span>
                <span className="text-text-main font-semibold">{metadata?.detector || selectedDetector}</span>
                <span className="text-text-muted">Channel:</span>
                <span className="text-primary font-semibold">{metadata?.channel || selectedChannel} / 102</span>
                <span className="text-text-muted">Wavelength:</span>
                <span className="text-scientific-cyan font-semibold">{metadata?.wavelength_um.toFixed(3) || '...'} µm</span>
                <span className="text-text-muted">Pixel Scale:</span>
                <span className="text-secondary">{metadata?.pixel_scale_arcsec || 6.2}″ / pix</span>
                <span className="text-text-muted">Dimensions:</span>
                <span className="text-secondary">256 × 256 px</span>
              </div>
            </div>

            {/* Photometric & Flux Readout */}
            <div className="space-y-2 pt-2 border-t border-surface-border text-xs font-mono">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                Photometry (MJy/sr)
              </span>
              <div className="space-y-1 bg-surface-elevated p-2.5 rounded border border-surface-border text-[11px]">
                <div className="flex justify-between">
                  <span className="text-text-muted">Peak Surface Flux:</span>
                  <span className="text-text-main font-medium">{metadata?.peak_flux || '...'} MJy/sr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Mean Field Flux:</span>
                  <span className="text-secondary">{metadata?.mean_flux || '...'} MJy/sr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Zodiacal Background:</span>
                  <span className="text-secondary">{metadata?.background_flux_mjy_sr || '...'} MJy/sr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">RMS Noise (1σ):</span>
                  <span className="text-scientific-cyan">{metadata?.rms_noise || '...'} MJy/sr</span>
                </div>
              </div>
            </div>

            {/* Quality & Contamination Flags */}
            <div className="space-y-2 pt-2 border-t border-surface-border text-xs">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                Data Quality Flags
              </span>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between p-1.5 rounded bg-surface-elevated border border-surface-border">
                  <span className="text-text-muted">Zodiacal Light Subtracted:</span>
                  <span className="text-secondary">Raw Mode</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-surface-elevated border border-surface-border">
                  <span className="text-text-muted">Stray Light Ratio:</span>
                  <span className="text-scientific-success">0.012 (Pass)</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-surface-elevated border border-surface-border">
                  <span className="text-text-muted">Detector Saturation:</span>
                  <span className="text-scientific-success">None</span>
                </div>
              </div>
            </div>

            {/* Detected Candidate Card if present */}
            {selectedCandidate && (
              <div className="space-y-2 pt-2 border-t border-surface-border">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-primary uppercase tracking-wider flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Candidate Target</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/30">
                    {selectedCandidate.confidence_score}% Conf
                  </span>
                </div>

                <div className="p-2.5 rounded bg-surface-elevated border border-surface-border font-mono text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-text-muted">ID:</span>
                    <span className="text-text-main font-semibold">{selectedCandidate.candidate_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Classification:</span>
                    <span className="text-scientific-cyan text-right text-[11px]">{selectedCandidate.classification}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Displacement:</span>
                    <span className="text-text-main">{selectedCandidate.angular_displacement_arcsec}″</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">SNR:</span>
                    <span className="text-scientific-success">{selectedCandidate.snr}σ</span>
                  </div>

                  <button
                    onClick={() => onOpenCandidateModal(selectedCandidate, observationsData?.target_name || "Custom Field")}
                    className="w-full mt-2 py-1 px-2 rounded bg-surface-card border border-primary/40 hover:border-primary text-primary text-xs flex items-center justify-center space-x-1 transition-colors"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>Save Candidate Discovery</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="pt-2 border-t border-surface-border space-y-2">
              <button
                onClick={() => onNavigateTab('spectral')}
                className="w-full py-2 px-3 rounded bg-surface-elevated border border-surface-border hover:border-scientific-success/50 text-xs font-mono text-scientific-success flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Open 102-Band Spectral Analysis</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

