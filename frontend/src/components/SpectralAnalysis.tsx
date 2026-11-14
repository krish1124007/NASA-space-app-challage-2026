import React, { useState, useEffect, useMemo } from 'react';
import { Target, SpectrumResponse, SpectralChannel, ReferenceFeature } from '../types';
import { ApiService } from '../services/api';
import { 
  Activity, 
  Layers, 
  Info, 
  Sliders, 
  Download, 
  Eye, 
  AlertCircle, 
  Sparkles,
  Maximize2,
  ZoomIn
} from 'lucide-react';

interface SpectralAnalysisProps {
  targets: Target[];
  currentTargetId?: string;
  onSelectTarget: (targetId: string) => void;
  activeCoords: { ra: number; dec: number };
}

export const SpectralAnalysis: React.FC<SpectralAnalysisProps> = ({
  targets,
  currentTargetId = 'wise_0855',
  onSelectTarget,
  activeCoords,
}) => {
  const [spectrumData, setSpectrumData] = useState<SpectrumResponse | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<number>(60);
  const [hoveredChannel, setHoveredChannel] = useState<SpectralChannel | null>(null);
  const [filterDetector, setFilterDetector] = useState<string>('all');
  const [showFeatures, setShowFeatures] = useState<boolean>(true);
  const [showErrorBars, setShowErrorBars] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  // RGB Composite simulation channels
  const [rgbR, setRgbR] = useState<number>(90); // ~4.6 um
  const [rgbG, setRgbG] = useState<number>(60); // ~3.0 um
  const [rgbB, setRgbB] = useState<number>(20); // ~1.2 um

  useEffect(() => {
    loadSpectrum(currentTargetId);
  }, [currentTargetId]);

  const loadSpectrum = async (targetId: string) => {
    setLoading(true);
    try {
      const res = await ApiService.getSpectrum({
        target_id: targetId,
        ra: activeCoords.ra,
        dec: activeCoords.dec,
      });
      setSpectrumData(res);
      // Auto-set selected channel near target's peak or default
      const defaultCh = targets.find(t => t.id === targetId)?.default_channel || 60;
      setSelectedChannel(defaultCh);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentChannelInfo = useMemo(() => {
    if (!spectrumData) return null;
    return spectrumData.channels.find(c => c.channel === selectedChannel) || null;
  }, [spectrumData, selectedChannel]);

  // Compute SVG plot dimensions
  const svgWidth = 900;
  const svgHeight = 360;
  const padding = { top: 40, right: 30, bottom: 50, left: 65 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Wavelength extent: 0.75 um to 5.00 um
  const minWavelength = 0.75;
  const maxWavelength = 5.00;

  // Flux extent
  const maxFlux = spectrumData ? Math.max(...spectrumData.channels.map(c => (c.flux_mjy || 0) + (c.flux_err_mjy || 0)), 1.0) * 1.15 : 100;
  const minFlux = 0.0;

  const getX = (w: number) => padding.left + ((w - minWavelength) / (maxWavelength - minWavelength)) * plotWidth;
  const getY = (f: number) => padding.top + plotHeight - ((f - minFlux) / (maxFlux - minFlux)) * plotHeight;

  // Filter channels based on detector filter
  const visibleChannels = useMemo(() => {
    if (!spectrumData) return [];
    if (filterDetector === 'all') return spectrumData.channels;
    return spectrumData.channels.filter(c => c.detector === filterDetector);
  }, [spectrumData, filterDetector]);

  // Build SVG path for continuous spectral curve
  const spectralPath = useMemo(() => {
    if (!visibleChannels.length) return '';
    let path = '';
    let inSegment = false;

    visibleChannels.forEach((c) => {
      if (c.flux_mjy !== null && c.is_valid) {
        const x = getX(c.wavelength_um);
        const y = getY(c.flux_mjy);
        if (!inSegment) {
          path += `M ${x} ${y}`;
          inSegment = true;
        } else {
          path += ` L ${x} ${y}`;
        }
      } else {
        inSegment = false; // Break path on missing/flagged channels
      }
    });

    return path;
  }, [visibleChannels, maxFlux]);

  // Detector region bands
  const detectorBands = [
    { id: 'D1', min: 0.75, max: 1.11, label: 'D1 (0.75–1.11µm)', color: 'rgba(140, 183, 216, 0.08)' },
    { id: 'D2', min: 1.11, max: 1.64, label: 'D2 (1.11–1.64µm)', color: 'rgba(166, 182, 196, 0.08)' },
    { id: 'D3', min: 1.64, max: 2.42, label: 'D3 (1.64–2.42µm)', color: 'rgba(94, 234, 212, 0.08)' },
    { id: 'D4', min: 2.42, max: 3.82, label: 'D4 (2.42–3.82µm)', color: 'rgba(229, 169, 98, 0.08)' },
    { id: 'D5', min: 3.82, max: 4.42, label: 'D5 (3.82–4.42µm)', color: 'rgba(120, 185, 154, 0.08)' },
    { id: 'D6', min: 4.42, max: 5.00, label: 'D6 (4.42–5.00µm)', color: 'rgba(224, 108, 117, 0.08)' },
  ];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      {/* Top Controls Bar */}
      <div className="bg-surface border-b border-surface-border px-4 sm:px-6 h-12 flex items-center justify-between gap-3 text-xs font-mono flex-shrink-0">
        <div className="flex items-center space-x-3">
          <span className="text-text-muted uppercase text-[11px] tracking-wider">
            Spectral Source:
          </span>
          <select
            value={currentTargetId}
            onChange={(e) => onSelectTarget(e.target.value)}
            className="px-2.5 py-1 rounded bg-surface-elevated border border-surface-border text-xs text-text-main font-mono focus:border-primary focus:outline-none"
          >
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.classification.split(' ')[0]})
              </option>
            ))}
          </select>
          <span className="text-secondary text-[11px]">
            {spectrumData?.valid_channels_count} / 102 Nominal Channels Valid
          </span>
        </div>

        {/* Filter by Detector */}
        <div className="flex items-center space-x-1 bg-surface-elevated p-1 rounded border border-surface-border">
          <span className="text-text-muted text-[11px] px-2">Array:</span>
          {['all', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6'].map((d) => (
            <button
              key={d}
              onClick={() => setFilterDetector(d)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                filterDetector === d
                  ? 'bg-primary text-[#0B1016] font-semibold'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              {d.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Display Toggles */}
        <div className="flex items-center space-x-3 text-text-muted text-xs">
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showFeatures}
              onChange={(e) => setShowFeatures(e.target.checked)}
              className="rounded bg-surface-elevated border-surface-border text-primary"
            />
            <span>Molecular Lines</span>
          </label>
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showErrorBars}
              onChange={(e) => setShowErrorBars(e.target.checked)}
              className="rounded bg-surface-elevated border-surface-border text-primary"
            />
            <span>Flux 1σ Errors</span>
          </label>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* CENTER SPECTRAL PLOT AREA (~70%) */}
        <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
          {/* Main SVG Spectral Energy Distribution Plot */}
          <div className="rounded border border-surface-border bg-surface p-4 relative shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-semibold text-text-main tracking-wider uppercase flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span>Spectral Energy Distribution (SED) · 102 SPHEREx Infrared Channels</span>
                </h3>
                <p className="text-[11px] text-text-muted">
                  Linear Variable Filter (LVF) calibrated spectrophotometry across 0.75 µm to 5.00 µm
                </p>
              </div>

              {hoveredChannel && (
                <div className="px-2.5 py-1 rounded bg-surface-elevated border border-surface-border font-mono text-[11px] text-primary flex items-center space-x-3">
                  <span>Ch {hoveredChannel.channel} ({hoveredChannel.detector})</span>
                  <span>λ: {hoveredChannel.wavelength_um.toFixed(3)} µm</span>
                  <span>Flux: {hoveredChannel.flux_mjy?.toFixed(2) ?? 'Flagged'} mJy</span>
                  <span>SNR: {hoveredChannel.snr ?? 'N/A'}σ</span>
                </div>
              )}
            </div>

            {/* SVG Plot Canvas */}
            <div className="w-full overflow-x-auto">
              <svg 
                viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                className="w-full h-auto min-w-[700px] select-none font-mono"
              >
                {/* Background grid */}
                <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} fill="#090E14" stroke="#1F2D3D" />

                {/* 6 Detector Background Bands */}
                {detectorBands.map((band) => {
                  const x1 = getX(band.min);
                  const x2 = getX(band.max);
                  return (
                    <g key={band.id}>
                      <rect 
                        x={x1} 
                        y={padding.top} 
                        width={x2 - x1} 
                        height={plotHeight} 
                        fill={band.color} 
                        stroke="#1F2D3D" 
                        strokeWidth="0.5" 
                      />
                      <text 
                        x={x1 + 6} 
                        y={padding.top + 14} 
                        fill="#8795A3" 
                        fontSize="9" 
                        opacity="0.8"
                      >
                        {band.id}
                      </text>
                    </g>
                  );
                })}

                {/* Horizontal Grid Lines (Flux) */}
                {[0.25, 0.5, 0.75, 1.0].map((frac) => {
                  const fVal = minFlux + frac * (maxFlux - minFlux);
                  const y = getY(fVal);
                  return (
                    <g key={frac}>
                      <line x1={padding.left} y1={y} x2={padding.left + plotWidth} y2={y} stroke="#17222F" strokeDasharray="3 3" />
                      <text x={padding.left - 8} y={y + 3} fill="#5A6875" fontSize="10" textAnchor="end">
                        {fVal.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical Grid Lines (Wavelength in um) */}
                {[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map((w) => {
                  const x = getX(w);
                  return (
                    <g key={w}>
                      <line x1={x} y1={padding.top} x2={x} y2={padding.top + plotHeight} stroke="#17222F" strokeDasharray="3 3" />
                      <text x={x} y={padding.top + plotHeight + 18} fill="#8795A3" fontSize="10" textAnchor="middle">
                        {w.toFixed(1)} µm
                      </text>
                    </g>
                  );
                })}

                {/* Molecular Lines & Astrochemical Signatures */}
                {showFeatures && spectrumData?.reference_features.map((feat) => {
                  if (feat.wavelength_um < minWavelength || feat.wavelength_um > maxWavelength) return null;
                  const x = getX(feat.wavelength_um);
                  const isAbsorption = feat.type === 'absorption';
                  return (
                    <g key={feat.name}>
                      <line 
                        x1={x} 
                        y1={padding.top} 
                        x2={x} 
                        y2={padding.top + plotHeight} 
                        stroke={isAbsorption ? "rgba(94, 234, 212, 0.4)" : "rgba(229, 169, 98, 0.4)"} 
                        strokeDasharray="2 3"
                        strokeWidth="1"
                      />
                      <text 
                        x={x} 
                        y={padding.top + 28} 
                        fill={isAbsorption ? "#5EEAD4" : "#E5A962"} 
                        fontSize="8.5" 
                        textAnchor="middle"
                        transform={`rotate(-90 ${x} ${padding.top + 28})`}
                      >
                        {feat.name}
                      </text>
                    </g>
                  );
                })}

                {/* Error Bars */}
                {showErrorBars && visibleChannels.map((c) => {
                  if (!c.is_valid || c.flux_mjy === null || c.flux_err_mjy === null) return null;
                  const x = getX(c.wavelength_um);
                  const yTop = getY(c.flux_mjy + c.flux_err_mjy);
                  const yBottom = getY(Math.max(0, c.flux_mjy - c.flux_err_mjy));
                  return (
                    <line 
                      key={`err-${c.channel}`}
                      x1={x} 
                      y1={yTop} 
                      x2={x} 
                      y2={yBottom} 
                      stroke="rgba(140, 183, 216, 0.35)" 
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Main Continuous Spectrum Curve */}
                <path 
                  d={spectralPath} 
                  fill="none" 
                  stroke="#8CB7D8" 
                  strokeWidth="2" 
                />

                {/* Channel Data Points */}
                {visibleChannels.map((c) => {
                  if (!c.is_valid || c.flux_mjy === null) {
                    // Render missing/flagged channel symbol (cross)
                    const x = getX(c.wavelength_um);
                    const y = getY(0.5);
                    return (
                      <g key={`flag-${c.channel}`}>
                        <line x1={x - 3} y1={y - 3} x2={x + 3} y2={y + 3} stroke="#E06C75" strokeWidth="1.2" />
                        <line x1={x + 3} y1={y - 3} x2={x - 3} y2={y + 3} stroke="#E06C75" strokeWidth="1.2" />
                      </g>
                    );
                  }

                  const x = getX(c.wavelength_um);
                  const y = getY(c.flux_mjy);
                  const isSel = selectedChannel === c.channel;

                  return (
                    <circle
                      key={`pt-${c.channel}`}
                      cx={x}
                      cy={y}
                      r={isSel ? 5 : 2.5}
                      fill={isSel ? '#5EEAD4' : '#8CB7D8'}
                      stroke={isSel ? '#FFFFFF' : '#0B1016'}
                      strokeWidth={isSel ? 1.5 : 0.8}
                      className="cursor-pointer hover:scale-150 transition-transform"
                      onMouseEnter={() => setHoveredChannel(c)}
                      onMouseLeave={() => setHoveredChannel(null)}
                      onClick={() => setSelectedChannel(c.channel)}
                    />
                  );
                })}

                {/* Selected Channel Vertical Indicator */}
                {currentChannelInfo && currentChannelInfo.is_valid && (
                  <g>
                    <line 
                      x1={getX(currentChannelInfo.wavelength_um)} 
                      y1={padding.top} 
                      x2={getX(currentChannelInfo.wavelength_um)} 
                      y2={padding.top + plotHeight} 
                      stroke="#5EEAD4" 
                      strokeWidth="1"
                      strokeDasharray="4 2"
                    />
                    <circle 
                      cx={getX(currentChannelInfo.wavelength_um)} 
                      cy={getY(currentChannelInfo.flux_mjy || 0)} 
                      r="6" 
                      fill="none" 
                      stroke="#5EEAD4" 
                      strokeWidth="2" 
                    />
                  </g>
                )}

                {/* Axis Labels */}
                <text 
                  x={padding.left + plotWidth / 2} 
                  y={svgHeight - 12} 
                  fill="#E6EDF3" 
                  fontSize="11" 
                  textAnchor="middle"
                >
                  Wavelength λ (micrometers, µm)
                </text>
                <text 
                  x={-padding.top - plotHeight / 2} 
                  y={18} 
                  fill="#E6EDF3" 
                  fontSize="11" 
                  textAnchor="middle" 
                  transform="rotate(-90)"
                >
                  Flux Density F_ν (mJy)
                </text>
              </svg>
            </div>
          </div>

          {/* Interactive Channel Scrubber & Band Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scrubber & Channel Inspector */}
            <div className="rounded border border-surface-border bg-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Channel Selector & Scrubber
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-primary/10 text-primary border border-primary/30">
                  Channel {selectedChannel} of 102
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="102"
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(Number(e.target.value))}
                className="w-full h-2 bg-surface-elevated rounded appearance-none cursor-pointer"
              />

              {currentChannelInfo && (
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-surface-border">
                  <div className="bg-surface-elevated p-2 rounded border border-surface-border">
                    <span className="text-text-muted text-[10px] block">Detector Group:</span>
                    <span className="text-text-main font-semibold">{currentChannelInfo.detector}</span>
                  </div>
                  <div className="bg-surface-elevated p-2 rounded border border-surface-border">
                    <span className="text-text-muted text-[10px] block">Central Wavelength:</span>
                    <span className="text-scientific-cyan font-semibold">{currentChannelInfo.wavelength_um.toFixed(4)} µm</span>
                  </div>
                  <div className="bg-surface-elevated p-2 rounded border border-surface-border">
                    <span className="text-text-muted text-[10px] block">Flux Density:</span>
                    <span className="text-primary font-semibold">{currentChannelInfo.flux_mjy?.toFixed(3) ?? 'Flagged (Null)'} mJy</span>
                  </div>
                  <div className="bg-surface-elevated p-2 rounded border border-surface-border">
                    <span className="text-text-muted text-[10px] block">Resolving Power (R):</span>
                    <span className="text-secondary">{currentChannelInfo.resolving_power}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Molecular Species Key & Astrochemical Signatures */}
            <div className="rounded border border-surface-border bg-surface p-4 space-y-2">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                SPHEREx Molecular Ice Library
              </span>
              <p className="text-xs text-text-muted leading-relaxed">
                Key astrophysical absorption lines measured across the 102 infrared bands:
              </p>
              <div className="space-y-1.5 font-mono text-[11px] max-h-40 overflow-y-auto pr-1">
                {spectrumData?.reference_features.map((feat) => (
                  <div 
                    key={feat.name}
                    className="flex items-center justify-between p-1.5 rounded bg-surface-elevated border border-surface-border"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${feat.type === 'absorption' ? 'bg-scientific-cyan' : 'bg-scientific-warning'}`} />
                      <span className="text-text-main">{feat.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-primary">{feat.wavelength_um} µm</span>
                      <span className="text-text-muted text-[10px]">{feat.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT MULTI-BAND SYNTHESIS & RGB COLOR TOOL (~300px) */}
        <div className="w-80 flex-shrink-0 bg-surface border-l border-surface-border flex flex-col p-4 space-y-5 overflow-y-auto font-mono text-xs">
          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>Multi-Band Synthesis</span>
            </span>
            <p className="text-[11px] text-text-muted font-sans mt-1">
              Compose false-color scientific infrared visualizations using arbitrary SPHEREx channels.
            </p>
          </div>

          {/* RGB Band Assignment */}
          <div className="space-y-3 bg-surface-elevated p-3 rounded border border-surface-border">
            <span className="text-[11px] font-semibold text-text-main block">
              False-Color Channel Mapping
            </span>

            {/* Red Channel */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-scientific-danger">Red (Long-IR):</span>
                <span className="text-text-main">Ch {rgbR}</span>
              </div>
              <input
                type="range"
                min="1"
                max="102"
                value={rgbR}
                onChange={(e) => setRgbR(Number(e.target.value))}
                className="w-full h-1.5 bg-surface rounded appearance-none cursor-pointer accent-scientific-danger"
              />
            </div>

            {/* Green Channel */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-scientific-success">Green (Mid-IR):</span>
                <span className="text-text-main">Ch {rgbG}</span>
              </div>
              <input
                type="range"
                min="1"
                max="102"
                value={rgbG}
                onChange={(e) => setRgbG(Number(e.target.value))}
                className="w-full h-1.5 bg-surface rounded appearance-none cursor-pointer accent-scientific-success"
              />
            </div>

            {/* Blue Channel */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-primary">Blue (Near-IR):</span>
                <span className="text-text-main">Ch {rgbB}</span>
              </div>
              <input
                type="range"
                min="1"
                max="102"
                value={rgbB}
                onChange={(e) => setRgbB(Number(e.target.value))}
                className="w-full h-1.5 bg-surface rounded appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>

          {/* Synthetic Composite Preview Thumbnail */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
              Tri-Color Infrared Composite
            </span>
            <div className="w-full aspect-square rounded border border-surface-border bg-gradient-to-br from-[#121c27] via-[#1a2d3f] to-[#0c1822] flex flex-col items-center justify-center p-3 text-center space-y-2">
              <div className="w-20 h-20 rounded-full border border-primary/40 bg-radial from-scientific-cyan/30 via-primary/10 to-transparent flex items-center justify-center animate-pulse">
                <Sparkles className="w-6 h-6 text-scientific-cyan" />
              </div>
              <span className="text-[11px] text-text-main font-semibold">
                R: Ch{rgbR} · G: Ch{rgbG} · B: Ch{rgbB}
              </span>
              <span className="text-[10px] text-text-muted">
                Highlights ices ($H_2O, CO_2$) and circumstellar disk dust
              </span>
            </div>
          </div>

          {/* Export Spectrum Data */}
          <div className="pt-2 border-t border-surface-border space-y-2">
            <button
              onClick={() => {
                if (!spectrumData) return;
                const rows = [
                  ['channel', 'detector', 'wavelength_um', 'flux_mjy', 'flux_err_mjy', 'snr'],
                  ...spectrumData.channels.map(c => [c.channel, c.detector, c.wavelength_um, c.flux_mjy ?? 'NULL', c.flux_err_mjy ?? 'NULL', c.snr ?? 'NULL'])
                ];
                const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement('a');
                link.setAttribute('href', encodedUri);
                link.setAttribute('download', `${currentTargetId}_spherex_102bands.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="w-full py-2 px-3 rounded bg-surface-elevated border border-surface-border hover:border-primary/50 text-text-main text-xs flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export 102-Band Spectrum CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

