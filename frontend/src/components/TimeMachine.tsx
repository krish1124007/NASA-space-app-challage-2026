import React, { useState, useEffect, useRef } from 'react';
import { 
  Target, 
  ObservationsResponse, 
  DetectedCandidate, 
  DifferenceResponse 
} from '../types';
import { ApiService } from '../services/api';
import { AstronomicalCanvas } from './AstronomicalCanvas';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  Sliders, 
  Layers, 
  SplitSquareVertical, 
  MinusCircle, 
  Sparkles, 
  BookmarkPlus, 
  Info,
  Calendar,
  Zap,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface TimeMachineProps {
  targets: Target[];
  currentTargetId?: string;
  onSelectTarget: (targetId: string) => void;
  onOpenCandidateModal: (candidate: DetectedCandidate, fieldName: string) => void;
  activeCoords: { ra: number; dec: number };
}

type ComparisonMode = 'blink' | 'side-by-side' | 'difference';

export const TimeMachine: React.FC<TimeMachineProps> = ({
  targets,
  currentTargetId = 'barnards_star',
  onSelectTarget,
  onOpenCandidateModal,
  activeCoords,
}) => {
  const [mode, setMode] = useState<ComparisonMode>('blink');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0); // 0.5, 1, 2, 4
  const [currentEpochIdx, setCurrentEpochIdx] = useState<number>(0);
  const [blinkEpochA, setBlinkEpochA] = useState<number>(0);
  const [blinkEpochB, setBlinkEpochB] = useState<number>(3);
  const [sideEpochLeft, setSideEpochLeft] = useState<number>(0);
  const [sideEpochRight, setSideEpochRight] = useState<number>(3);
  const [loop, setLoop] = useState<boolean>(true);
  const [opacity, setOpacity] = useState<number>(100);

  // Observations data
  const [observationsData, setObservationsData] = useState<ObservationsResponse | null>(null);
  const [differenceData, setDifferenceData] = useState<DifferenceResponse | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<DetectedCandidate | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingDiff, setLoadingDiff] = useState<boolean>(false);

  // Animation timer ref
  const timerRef = useRef<number | null>(null);

  // Fetch observations on target change
  useEffect(() => {
    loadData(currentTargetId);
  }, [currentTargetId]);

  const loadData = async (targetId: string) => {
    setLoading(true);
    try {
      const res = await ApiService.getObservations({
        target_id: targetId,
        channel: 12,
        fov_arcmin: 10.0,
      });
      setObservationsData(res);
      setCurrentEpochIdx(0);
      setBlinkEpochA(0);
      setBlinkEpochB(res.observations.length - 1);
      setSideEpochLeft(0);
      setSideEpochRight(res.observations.length - 1);
      if (res.detected_candidates.length > 0) {
        setSelectedCandidate(res.detected_candidates[0]);
      }
      // Load difference image between epoch 0 and last epoch
      loadDifference(targetId, 0, res.observations.length - 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDifference = async (targetId: string, ep1: number, ep2: number) => {
    setLoadingDiff(true);
    try {
      const diff = await ApiService.getDifferenceImage({
        target_id: targetId,
        epoch1: ep1,
        epoch2: ep2,
      });
      setDifferenceData(diff);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDiff(false);
    }
  };

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying || !observationsData) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = (1000 / playbackSpeed);

    timerRef.current = window.setInterval(() => {
      if (mode === 'blink') {
        // Toggle between Blink Epoch A and B
        setCurrentEpochIdx((prev) => (prev === blinkEpochA ? blinkEpochB : blinkEpochA));
      } else {
        // Step chronologically through epochs
        setCurrentEpochIdx((prev) => {
          const next = prev + 1;
          if (next >= observationsData.observations.length) {
            if (loop) return 0;
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, mode, blinkEpochA, blinkEpochB, observationsData, loop]);

  const currentEpoch = observationsData?.observations[currentEpochIdx];
  const epochs = observationsData?.observations || [];

  // Generate multi-epoch motion track points for primary candidate
  const motionTracks = selectedCandidate && observationsData ? [
    { x: selectedCandidate.pixel_x - (selectedCandidate.type === 'moving_object' ? 12 : 0), y: selectedCandidate.pixel_y - 8, epoch: 'EP-2025A' },
    { x: selectedCandidate.pixel_x - (selectedCandidate.type === 'moving_object' ? 8 : 0), y: selectedCandidate.pixel_y - 5, epoch: 'EP-2025B' },
    { x: selectedCandidate.pixel_x - (selectedCandidate.type === 'moving_object' ? 4 : 0), y: selectedCandidate.pixel_y - 2, epoch: 'EP-2025C' },
    { x: selectedCandidate.pixel_x, y: selectedCandidate.pixel_y, epoch: 'EP-2026A' },
  ] : undefined;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      {/* Top Controls Toolbar */}
      <div className="bg-surface border-b border-surface-border px-4 sm:px-6 h-12 flex items-center justify-between gap-3 text-xs flex-shrink-0">
        {/* Target Selector */}
        <div className="flex items-center space-x-3">
          <span className="text-text-muted font-mono uppercase text-[11px] tracking-wider">
            Temporal Target:
          </span>
          <select
            value={currentTargetId}
            onChange={(e) => onSelectTarget(e.target.value)}
            className="px-2.5 py-1 rounded bg-surface-elevated border border-surface-border text-xs text-text-main font-mono focus:border-primary focus:outline-none"
          >
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.category === 'moving' ? `${t.proper_motion.total_pm_arcsec_yr}″/yr` : 'Variable'})
              </option>
            ))}
          </select>
        </div>

        {/* Comparison Modes Segmented Control */}
        <div className="flex items-center space-x-1 bg-surface-elevated p-1 rounded border border-surface-border font-mono text-xs">
          <button
            onClick={() => { setMode('blink'); setIsPlaying(true); }}
            className={`flex items-center space-x-1 px-3 py-1 rounded transition-colors ${
              mode === 'blink'
                ? 'bg-primary text-[#0B1016] font-semibold'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>A. Blink Comparison</span>
          </button>
          <button
            onClick={() => { setMode('side-by-side'); setIsPlaying(false); }}
            className={`flex items-center space-x-1 px-3 py-1 rounded transition-colors ${
              mode === 'side-by-side'
                ? 'bg-primary text-[#0B1016] font-semibold'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>B. Side-by-Side</span>
          </button>
          <button
            onClick={() => { setMode('difference'); setIsPlaying(false); }}
            className={`flex items-center space-x-1 px-3 py-1 rounded transition-colors ${
              mode === 'difference'
                ? 'bg-primary text-[#0B1016] font-semibold'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <MinusCircle className="w-3.5 h-3.5" />
            <span>C. Difference Image</span>
          </button>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center space-x-2">
          {mode !== 'difference' && (
            <>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex items-center space-x-1 px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                  isPlaying
                    ? 'bg-scientific-warning text-[#0B1016]'
                    : 'bg-primary text-[#0B1016] hover:bg-primary-hover'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play Timeline'}</span>
              </button>

              <div className="flex items-center space-x-1 bg-surface-elevated border border-surface-border px-1.5 py-0.5 rounded text-[11px] font-mono text-secondary">
                <span className="text-text-muted">Speed:</span>
                {[0.5, 1, 2, 4].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={`px-1 rounded ${playbackSpeed === s ? 'text-primary font-bold' : 'hover:text-text-main'}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* CENTER VIEWPORT (Dynamic based on comparison mode) */}
        <div className="flex-1 flex flex-col bg-[#070B0E] relative overflow-hidden">
          {mode === 'blink' && (
            <div className="flex-1 relative">
              {currentEpoch && (
                <AstronomicalCanvas
                  imageUrl={currentEpoch.image_url}
                  centerRa={observationsData?.ra_deg || activeCoords.ra}
                  centerDec={observationsData?.dec_deg || activeCoords.dec}
                  fovArcmin={observationsData?.fov_arcmin || 10.0}
                  candidates={observationsData?.detected_candidates || []}
                  selectedCandidateId={selectedCandidate?.candidate_id}
                  onSelectCandidate={(c) => setSelectedCandidate(c)}
                  motionTracks={motionTracks}
                  crosshairLabel={`Blinking: ${currentEpoch.epoch_id} (${new Date(currentEpoch.obs_date).toISOString().slice(0, 10)})`}
                  className="w-full h-full"
                />
              )}

              {/* Epoch Indicator Overlay */}
              <div className="absolute top-4 left-4 bg-surface/90 border border-surface-border backdrop-blur p-2.5 rounded font-mono text-xs space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${currentEpochIdx === blinkEpochA ? 'bg-primary' : 'bg-scientific-cyan'} animate-ping`} />
                  <span className="text-text-main font-semibold">Active Epoch: {currentEpoch?.epoch_id}</span>
                </div>
                <div className="text-[11px] text-text-muted">
                  Blinking: <strong className="text-primary">{epochs[blinkEpochA]?.epoch_id}</strong> ↔ <strong className="text-scientific-cyan">{epochs[blinkEpochB]?.epoch_id}</strong>
                </div>
              </div>
            </div>
          )}

          {mode === 'side-by-side' && (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-1 p-1 bg-surface-border">
              {/* Left Viewport */}
              <div className="flex flex-col relative h-full">
                <div className="absolute top-2 left-2 z-10 bg-surface/90 border border-surface-border px-2.5 py-1 rounded text-xs font-mono text-primary flex items-center space-x-2">
                  <span>Epoch Left:</span>
                  <select
                    value={sideEpochLeft}
                    onChange={(e) => setSideEpochLeft(Number(e.target.value))}
                    className="bg-surface-elevated px-1 py-0.5 rounded text-text-main"
                  >
                    {epochs.map((ep, i) => (
                      <option key={ep.epoch_id} value={i}>{ep.epoch_id} ({ep.obs_date.slice(0, 10)})</option>
                    ))}
                  </select>
                </div>
                {epochs[sideEpochLeft] && (
                  <AstronomicalCanvas
                    imageUrl={epochs[sideEpochLeft].image_url}
                    centerRa={observationsData?.ra_deg || activeCoords.ra}
                    centerDec={observationsData?.dec_deg || activeCoords.dec}
                    fovArcmin={observationsData?.fov_arcmin || 10.0}
                    candidates={observationsData?.detected_candidates || []}
                    crosshairLabel={`${epochs[sideEpochLeft].epoch_id}`}
                    className="w-full h-full"
                  />
                )}
              </div>

              {/* Right Viewport */}
              <div className="flex flex-col relative h-full">
                <div className="absolute top-2 left-2 z-10 bg-surface/90 border border-surface-border px-2.5 py-1 rounded text-xs font-mono text-scientific-cyan flex items-center space-x-2">
                  <span>Epoch Right:</span>
                  <select
                    value={sideEpochRight}
                    onChange={(e) => setSideEpochRight(Number(e.target.value))}
                    className="bg-surface-elevated px-1 py-0.5 rounded text-text-main"
                  >
                    {epochs.map((ep, i) => (
                      <option key={ep.epoch_id} value={i}>{ep.epoch_id} ({ep.obs_date.slice(0, 10)})</option>
                    ))}
                  </select>
                </div>
                {epochs[sideEpochRight] && (
                  <AstronomicalCanvas
                    imageUrl={epochs[sideEpochRight].image_url}
                    centerRa={observationsData?.ra_deg || activeCoords.ra}
                    centerDec={observationsData?.dec_deg || activeCoords.dec}
                    fovArcmin={observationsData?.fov_arcmin || 10.0}
                    candidates={observationsData?.detected_candidates || []}
                    motionTracks={motionTracks}
                    crosshairLabel={`${epochs[sideEpochRight].epoch_id}`}
                    className="w-full h-full"
                  />
                )}
              </div>
            </div>
          )}

          {mode === 'difference' && (
            <div className="flex-1 relative">
              {differenceData ? (
                <AstronomicalCanvas
                  imageUrl={differenceData.difference_image_url}
                  centerRa={observationsData?.ra_deg || activeCoords.ra}
                  centerDec={observationsData?.dec_deg || activeCoords.dec}
                  fovArcmin={observationsData?.fov_arcmin || 10.0}
                  candidates={observationsData?.detected_candidates || []}
                  selectedCandidateId={selectedCandidate?.candidate_id}
                  onSelectCandidate={(c) => setSelectedCandidate(c)}
                  crosshairLabel={`Difference Map: ${epochs[blinkEpochB]?.epoch_id} − ${epochs[blinkEpochA]?.epoch_id}`}
                  className="w-full h-full"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-text-muted font-mono text-xs">
                  Computing astrometrically aligned temporal difference...
                </div>
              )}

              {/* Difference Stats HUD */}
              {differenceData && (
                <div className="absolute top-4 left-4 bg-surface/90 border border-surface-border backdrop-blur p-3 rounded font-mono text-xs space-y-2 max-w-sm">
                  <div className="flex items-center space-x-2 text-scientific-cyan">
                    <MinusCircle className="w-4 h-4" />
                    <span className="font-semibold uppercase tracking-wider text-[11px]">
                      Astrometric Difference Profile
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed font-sans">
                    Aligned pixel subtraction: <code className="text-secondary font-mono">I_diff = I_2 − I_1</code>.
                    Reveals positive transient flux (cyan/blue) and negative deficit (red), creating the characteristic dipole of moving bodies.
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[11px] pt-1 border-t border-surface-border">
                    <span className="text-text-muted">Peak Residual:</span>
                    <span className="text-scientific-cyan font-bold">{differenceData.stats.max_positive_residual} MJy/sr</span>
                    <span className="text-text-muted">Background Noise:</span>
                    <span className="text-secondary">{differenceData.stats.rms_noise} MJy/sr</span>
                    <span className="text-text-muted">Dipole SNR:</span>
                    <span className="text-scientific-success font-semibold">{differenceData.stats.snr_peak}σ</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Timeline Scrubber */}
          <div className="bg-surface border-t border-surface-border px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2">
                <Calendar className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-text-muted">Survey Timeline:</span>
                <span className="text-text-main font-semibold">
                  Epoch {currentEpochIdx + 1} of {epochs.length} ({currentEpoch?.epoch_id})
                </span>
                <span className="text-secondary">· {currentEpoch?.obs_date ? new Date(currentEpoch.obs_date).toLocaleDateString() : ''}</span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1.5">
                  <span className="text-text-muted text-[11px]">Blink Pair:</span>
                  <select
                    value={blinkEpochA}
                    onChange={(e) => {
                      setBlinkEpochA(Number(e.target.value));
                      loadDifference(currentTargetId, Number(e.target.value), blinkEpochB);
                    }}
                    className="bg-surface-elevated border border-surface-border rounded px-1.5 py-0.5 text-xs text-text-main"
                  >
                    {epochs.map((ep, i) => (
                      <option key={ep.epoch_id} value={i}>{ep.epoch_id}</option>
                    ))}
                  </select>
                  <span className="text-text-muted">↔</span>
                  <select
                    value={blinkEpochB}
                    onChange={(e) => {
                      setBlinkEpochB(Number(e.target.value));
                      loadDifference(currentTargetId, blinkEpochA, Number(e.target.value));
                    }}
                    className="bg-surface-elevated border border-surface-border rounded px-1.5 py-0.5 text-xs text-text-main"
                  >
                    {epochs.map((ep, i) => (
                      <option key={ep.epoch_id} value={i}>{ep.epoch_id}</option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center space-x-1.5 text-xs text-text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loop}
                    onChange={(e) => setLoop(e.target.checked)}
                    className="rounded bg-surface-elevated border-surface-border text-primary"
                  />
                  <span>Loop</span>
                </label>
              </div>
            </div>

            {/* Visual Timeline Bar with Epoch nodes */}
            <div className="relative flex items-center pt-2">
              <div className="w-full h-1.5 bg-surface-elevated rounded-full relative">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(currentEpochIdx / Math.max(1, epochs.length - 1)) * 100}%` }}
                />
              </div>

              {/* Epoch Ticks */}
              <div className="absolute inset-0 flex justify-between items-center px-1">
                {epochs.map((ep, idx) => {
                  const isCur = currentEpochIdx === idx;
                  return (
                    <button
                      key={ep.epoch_id}
                      onClick={() => {
                        setCurrentEpochIdx(idx);
                        setIsPlaying(false);
                      }}
                      className={`w-4 h-4 rounded-full border-2 transition-transform ${
                        isCur
                          ? 'border-primary bg-primary scale-125 shadow-lg'
                          : 'border-surface-border bg-surface-elevated hover:border-text-muted'
                      }`}
                      title={`${ep.epoch_id}: ${ep.obs_date}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT MOVING OBJECT DETECTION & ASTROMETRY PANEL (~320px) */}
        <div className="w-80 flex-shrink-0 bg-surface border-l border-surface-border flex flex-col overflow-y-auto">
          <div className="p-4 space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Candidate Detection</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-primary/30 bg-primary/10 text-primary">
                  {observationsData?.detected_candidates.length || 0} Detected
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Automated multi-epoch astrometric motion & photometric variability cross-matching.
              </p>
            </div>

            {/* Candidates List */}
            <div className="space-y-2">
              {observationsData?.detected_candidates.map((cand) => {
                const isSelected = selectedCandidate?.candidate_id === cand.candidate_id;
                const isMoving = cand.type === 'moving_object';
                return (
                  <div
                    key={cand.candidate_id}
                    onClick={() => setSelectedCandidate(cand)}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-surface-elevated shadow-md'
                        : 'border-surface-border bg-surface-card hover:bg-surface-elevated'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-semibold text-xs text-text-main font-mono">
                          {cand.candidate_id}
                        </span>
                        <p className="text-[11px] text-scientific-cyan font-mono">
                          {cand.classification}
                        </p>
                      </div>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono border border-surface-border bg-surface text-secondary">
                        {cand.confidence_score}% Conf
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-text-muted mt-2 pt-2 border-t border-surface-border/60">
                      <span>Displacement:</span>
                      <span className="text-text-main text-right">{cand.angular_displacement_arcsec}″</span>
                      <span>Detection SNR:</span>
                      <span className="text-scientific-success text-right">{cand.snr}σ</span>
                      <span>Survey Epochs:</span>
                      <span className="text-secondary text-right">{cand.epochs_detected}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detailed Selected Candidate Inspection */}
            {selectedCandidate && (
              <div className="space-y-3 pt-3 border-t border-surface-border text-xs font-mono">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                  Astrometric Metrics
                </span>

                <div className="space-y-1 bg-surface-elevated p-3 rounded border border-surface-border text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-text-muted">RA (ICRS):</span>
                    <span className="text-secondary">{selectedCandidate.ra_sexagesimal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">DEC (ICRS):</span>
                    <span className="text-secondary">{selectedCandidate.dec_sexagesimal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Angular Motion:</span>
                    <span className="text-primary font-bold">
                      {targets.find(t => t.id === currentTargetId)?.proper_motion.total_pm_arcsec_yr || selectedCandidate.angular_displacement_arcsec}″ / yr
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Astrometric Residual:</span>
                    <span className="text-secondary">&lt; 0.08 arcsec</span>
                  </div>
                </div>

                {/* Scientifically Cautious Classification Notice */}
                <div className="p-2.5 rounded bg-surface-card border border-surface-border text-[11px] text-text-muted leading-relaxed flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-scientific-warning flex-shrink-0 mt-0.5" />
                  <span>
                    Scientifically cautious identification: Pixel displacement confirms high proper motion.
                    Follow-up spectral characterization required for definitive orbital or brown-dwarf classification.
                  </span>
                </div>

                <button
                  onClick={() => onOpenCandidateModal(selectedCandidate, observationsData?.target_name || "Field Observation")}
                  className="w-full py-2 px-3 rounded bg-primary hover:bg-primary-hover text-[#0B1016] text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  <span>Flag as Candidate Discovery</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

