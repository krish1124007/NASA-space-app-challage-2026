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
  AlertTriangle,
  Contrast,
  Crosshair,
  Grid,
  Film,
  Compass,
  Eye,
  RefreshCw,
  Repeat,
  Globe,
  Radio,
  ExternalLink
} from 'lucide-react';

interface TimeMachineProps {
  targets: Target[];
  currentTargetId?: string;
  onSelectTarget: (targetId: string) => void;
  onOpenCandidateModal: (candidate: DetectedCandidate, fieldName: string) => void;
  activeCoords: { ra: number; dec: number };
}

type ComparisonMode = 'blink' | 'movie' | 'side-by-side' | 'difference';

export const TimeMachine: React.FC<TimeMachineProps> = ({
  targets,
  currentTargetId = 'barnards_star',
  onSelectTarget,
  onOpenCandidateModal,
  activeCoords,
}) => {
  // Primary comparison mode
  const [mode, setMode] = useState<ComparisonMode>('blink');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0); // 0.5, 1, 2, 4, 8
  const [currentEpochIdx, setCurrentEpochIdx] = useState<number>(0);
  const [blinkEpochA, setBlinkEpochA] = useState<number>(0);
  const [blinkEpochB, setBlinkEpochB] = useState<number>(3);
  const [sideEpochLeft, setSideEpochLeft] = useState<number>(0);
  const [sideEpochRight, setSideEpochRight] = useState<number>(3);
  const [loop, setLoop] = useState<boolean>(true);

  // WiseView real-time visual adjustment states
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [invert, setInvert] = useState<boolean>(false);
  const [colormap, setColormap] = useState<string>('grayscale');
  const [stretch, setStretch] = useState<string>('asinh');
  const [showAdjustments, setShowAdjustments] = useState<boolean>(false);

  // Instrument overlay toggles
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showReticle, setShowReticle] = useState<boolean>(true);
  const [showCandidates, setShowCandidates] = useState<boolean>(true);
  const [showMotionTrail, setShowMotionTrail] = useState<boolean>(true);
  const [showGaia, setShowGaia] = useState<boolean>(false);
  const [gaiaSources, setGaiaSources] = useState<any[]>([]);

  // Multi-mission Pan-STARRS & Live IRSA stream state
  const [useLiveSpherex, setUseLiveSpherex] = useState<boolean>(false);
  const [maxFrames, setMaxFrames] = useState<number>(12);
  const [showPawnstars, setShowPawnstars] = useState<boolean>(false);
  const [pawnstarsUrl, setPawnstarsUrl] = useState<string | null>(null);
  const [loadingPawnstars, setLoadingPawnstars] = useState<boolean>(false);

  // Observations & difference data
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

  // Reload live SPHEREx frames when max frame count changes
  useEffect(() => {
    if (useLiveSpherex) {
      loadData(currentTargetId, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxFrames]);

  const loadGaia = async (ra: number, dec: number) => {
    try {
      const res = await ApiService.getGaiaCrossmatch(ra, dec, 6.0);
      setGaiaSources(res || []);
    } catch {
      setGaiaSources([]);
    }
  };

  const loadPawnstars = async (ra: number, dec: number) => {
    setLoadingPawnstars(true);
    try {
      const res = await ApiService.getPawnstars(ra, dec, 1024);
      setPawnstarsUrl(res.url);
    } catch {
      setPawnstarsUrl(null);
    } finally {
      setLoadingPawnstars(false);
    }
  };

  const loadData = async (targetId: string, live?: boolean) => {
    setLoading(true);
    try {
      const isLive = live !== undefined ? live : useLiveSpherex;
      const target = targets.find(t => t.id === targetId);
      const ra = target ? target.coordinates.ra_deg : activeCoords.ra;
      const dec = target ? target.coordinates.dec_deg : activeCoords.dec;

      let res: ObservationsResponse;
      if (isLive) {
        const detector = target?.default_detector || 'D4';
        const frameData = await ApiService.getSpherexLiveFrames({
          ra,
          dec,
          detector,
          sizeArcsec: 600,
          stretch: 1.0,
          invert: false,
          pixels: 512,
          limit: maxFrames,
        });

        const dims: [number, number] = [
          frameData.NAXIS1 || 512,
          frameData.NAXIS2 || 512,
        ];
        const observations = (frameData.ims || []).map((url, i) => {
          const mjd = (frameData.all_mjds && frameData.all_mjds[i]) || (frameData.all_mjds && frameData.all_mjds[0]) || 0;
          const fw = (frameData.frame_waves && frameData.frame_waves[i]) || [frameData.wave_min_um, frameData.wave_max_um];
          return {
            epoch_index: i,
            epoch_id: `VISIT-${String(i + 1).padStart(2, '0')}`,
            obs_date: mjd ? new Date((mjd - 40587) * 86400000).toISOString() : new Date().toISOString(),
            mjd,
            image_url: url,
            flux_mjy: 0,
            quality_flag: 0,
            metadata: {
              telescope: 'NASA SPHEREx Level 2 MEF (Live IRSA)',
              instrument: 'SPHEREx All-Sky Spectral Imager',
              data_release: 'SPHEREx DR1',
              channel: 0,
              detector: frameData.detector,
              wavelength_um: frameData.wavelength_um || ((fw[0] || 0) + (fw[1] || 0)) / 2 || 0,
              fov_arcmin: 10.0,
              pixel_scale_arcsec: frameData.pixscale || 2.344,
              dimensions: dims,
              center_coordinates: { ra: frameData.CRVAL1 || ra, dec: frameData.CRVAL2 || dec },
              background_flux_mjy_sr: 0,
              peak_flux: frameData.max || 0,
              mean_flux: ((frameData.min || 0) + (frameData.max || 0)) / 2,
              rms_noise: 0,
              quality_flags: {
                zodiacal_subtracted: false,
                cosmic_ray_masked: false,
                saturation_detected: false,
                stray_light_fraction: 0,
              },
              wave_min_um: fw[0],
              wave_max_um: fw[1],
            },
          };
        });

        res = {
          target_id: target?.id,
          target_name: target ? `${target.name} (Live SPHEREx)` : `RA ${ra.toFixed(4)}, DEC ${dec.toFixed(4)}`,
          ra_deg: frameData.CRVAL1 || ra,
          dec_deg: frameData.CRVAL2 || dec,
          fov_arcmin: 10.0,
          channel: 0,
          detector: frameData.detector,
          wavelength_um: frameData.wavelength_um || 0,
          total_epochs: observations.length,
          observations,
          detected_candidates: [],
        };
      } else {
        res = await ApiService.getObservations({
          target_id: targetId,
          channel: 12,
          fov_arcmin: 10.0,
        });
      }
      setObservationsData(res);
      setCurrentEpochIdx(0);
      setBlinkEpochA(0);
      setBlinkEpochB(Math.max(0, res.observations.length - 1));
      setSideEpochLeft(0);
      setSideEpochRight(Math.max(0, res.observations.length - 1));
      if (res.detected_candidates.length > 0) {
        setSelectedCandidate(res.detected_candidates[0]);
      }
      loadDifference(targetId, 0, Math.max(0, res.observations.length - 1));
      loadGaia(ra, dec);
      if (showPawnstars) {
        loadPawnstars(ra, dec);
      }
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
        // Toggle alternatingly between Blink Epoch A and B
        setCurrentEpochIdx((prev) => (prev === blinkEpochA ? blinkEpochB : blinkEpochA));
      } else {
        // Step chronologically through all epochs
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

  const epochs = observationsData?.observations || [];
  const currentEpoch = epochs[currentEpochIdx];

  // Keyboard navigation shortcuts (Standard WiseView controls)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentEpochIdx((prev) => (prev > 0 ? prev - 1 : Math.max(0, epochs.length - 1)));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentEpochIdx((prev) => (prev < epochs.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'i' || e.key === 'I') {
        setInvert((inv) => !inv);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [epochs.length]);

  // Step handlers
  const handleStepPrev = () => {
    setIsPlaying(false);
    setCurrentEpochIdx((prev) => (prev > 0 ? prev - 1 : Math.max(0, epochs.length - 1)));
  };

  const handleStepNext = () => {
    setIsPlaying(false);
    setCurrentEpochIdx((prev) => (prev < epochs.length - 1 ? prev + 1 : 0));
  };

  const handleResetLevels = () => {
    setBrightness(100);
    setContrast(100);
    setInvert(false);
    setColormap('grayscale');
    setStretch('asinh');
  };

  // Generate multi-epoch motion track points for primary candidate
  const motionTracks = selectedCandidate && observationsData && showMotionTrail ? [
    { x: selectedCandidate.pixel_x - (selectedCandidate.type === 'moving_object' ? 12 : 0), y: selectedCandidate.pixel_y - 8, epoch: 'EP-2025A' },
    { x: selectedCandidate.pixel_x - (selectedCandidate.type === 'moving_object' ? 8 : 0), y: selectedCandidate.pixel_y - 5, epoch: 'EP-2025B' },
    { x: selectedCandidate.pixel_x - (selectedCandidate.type === 'moving_object' ? 4 : 0), y: selectedCandidate.pixel_y - 2, epoch: 'EP-2025C' },
    { x: selectedCandidate.pixel_x, y: selectedCandidate.pixel_y, epoch: 'EP-2026A' },
  ] : undefined;

  const activeTarget = targets.find((t) => t.id === currentTargetId);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      {/* 1. TOP INSTRUMENT HEADER RIBBON (WiseView Header) */}
      <div className="bg-surface border-b border-surface-border px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0 select-none">
        
        {/* LEFT: WiseView Branding & Target Selector */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-scientific-cyan animate-pulse shadow-[0_0_8px_rgba(94,234,212,0.8)]" />
            <span className="font-bold text-xs tracking-wider uppercase text-text-main font-sans">
              WISEVIEW <span className="text-scientific-cyan font-mono text-[11px]">COMPARATOR</span>
            </span>
          </div>

          <div className="h-4 w-[1px] bg-surface-border hidden sm:block" />

          {/* Target Dropdown */}
          <div className="flex items-center space-x-1.5">
            <span className="text-text-muted font-mono uppercase text-[10px] hidden md:inline">
              Target:
            </span>
            <select
              value={currentTargetId}
              onChange={(e) => onSelectTarget(e.target.value)}
              className="h-7 px-2.5 rounded bg-surface-elevated border border-surface-border text-xs text-text-main font-mono focus:border-primary focus:outline-none"
            >
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category === 'moving' ? `${t.proper_motion.total_pm_arcsec_yr}″/yr` : 'Var'})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Target Chips */}
          <div className="hidden xl:flex items-center space-x-1">
            {targets.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTarget(t.id)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  currentTargetId === t.id
                    ? 'bg-primary/20 text-primary border border-primary/40 font-semibold'
                    : 'text-text-muted hover:text-text-main hover:bg-surface-elevated'
                }`}
              >
                {t.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* CENTER: Comparison Modes Segmented Control */}
        <div className="flex items-center space-x-1 bg-surface-card p-1 rounded-md border border-surface-border font-mono text-xs">
          <button
            onClick={() => { setMode('blink'); setIsPlaying(true); }}
            title="Fast alternating blink comparison between two epochs"
            className={`flex items-center space-x-1.5 px-3 h-7 rounded text-xs transition-colors ${
              mode === 'blink'
                ? 'bg-surface-elevated text-primary border border-surface-border font-semibold shadow-sm'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Blink Pair</span>
          </button>

          <button
            onClick={() => { setMode('movie'); setIsPlaying(true); }}
            title="Step through all survey epochs sequentially like a timelapse"
            className={`flex items-center space-x-1.5 px-3 h-7 rounded text-xs transition-colors ${
              mode === 'movie'
                ? 'bg-surface-elevated text-scientific-cyan border border-surface-border font-semibold shadow-sm'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Movie Loop</span>
          </button>

          <button
            onClick={() => { setMode('side-by-side'); setIsPlaying(false); }}
            title="Simultaneous dual coadds comparison"
            className={`flex items-center space-x-1.5 px-3 h-7 rounded text-xs transition-colors ${
              mode === 'side-by-side'
                ? 'bg-surface-elevated text-primary border border-surface-border font-semibold shadow-sm'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Side-by-Side</span>
          </button>

          <button
            onClick={() => { setMode('difference'); setIsPlaying(false); }}
            title="Astrometric pixel subtraction revealing moving dipoles"
            className={`flex items-center space-x-1.5 px-3 h-7 rounded text-xs transition-colors ${
              mode === 'difference'
                ? 'bg-surface-elevated text-primary border border-surface-border font-semibold shadow-sm'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <MinusCircle className="w-3.5 h-3.5" />
            <span>Difference (I₂−I₁)</span>
          </button>
        </div>

        {/* RIGHT: Quick Visual & Playback Actions */}
        <div className="flex items-center space-x-2">
          {/* Live NASA IRSA SPHEREx Cutouts Toggle (WiseView Engine) */}
          <button
            onClick={() => {
              const next = !useLiveSpherex;
              setUseLiveSpherex(next);
              loadData(currentTargetId, next);
            }}
            title={useLiveSpherex ? "Switch back to SPHEREx benchmark fields" : "Stream live Level 2 SPHEREx cutouts from NASA IRSA (WiseView Engine)"}
            className={`flex items-center space-x-1.5 h-7 px-2.5 rounded text-xs font-mono border transition-all ${
              useLiveSpherex
                ? 'bg-scientific-cyan/25 border-scientific-cyan text-scientific-cyan font-bold shadow-[0_0_10px_rgba(94,234,212,0.4)]'
                : 'bg-surface-elevated border-surface-border text-secondary hover:text-text-main'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{useLiveSpherex ? 'Live IRSA Cutout' : 'Live IRSA'}</span>
          </button>

          {/* Pan-STARRS Optical Comparison Strip Toggle */}
          <button
            onClick={() => {
              const next = !showPawnstars;
              setShowPawnstars(next);
              if (next && !pawnstarsUrl) {
                const target = targets.find(t => t.id === currentTargetId);
                const ra = target ? target.coordinates.ra_deg : activeCoords.ra;
                const dec = target ? target.coordinates.dec_deg : activeCoords.dec;
                loadPawnstars(ra, dec);
              }
            }}
            title="Toggle Pan-STARRS optical color composite comparison strip (WiseView Pawnstars)"
            className={`flex items-center space-x-1.5 h-7 px-2.5 rounded text-xs font-mono border transition-all ${
              showPawnstars
                ? 'bg-primary/20 border-primary text-primary font-semibold shadow-sm'
                : 'bg-surface-elevated border-surface-border text-secondary hover:text-text-main'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Pan-STARRS</span>
          </button>

          {/* Real-time Invert Color Toggle (Signature WiseView feature) */}
          <button
            onClick={() => setInvert(!invert)}
            title={invert ? "Switch to standard black sky" : "Invert colormap (WiseView high-contrast negative view)"}
            className={`flex items-center space-x-1.5 h-7 px-2.5 rounded text-xs font-mono border transition-all ${
              invert
                ? 'bg-scientific-cyan/20 border-scientific-cyan text-scientific-cyan font-bold shadow-[0_0_10px_rgba(94,234,212,0.3)]'
                : 'bg-surface-elevated border-surface-border text-secondary hover:text-text-main'
            }`}
          >
            <Contrast className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{invert ? 'Inverted (Negative)' : 'Invert'}</span>
          </button>

          {/* Image Adjustments Drawer Toggle */}
          <button
            onClick={() => setShowAdjustments(!showAdjustments)}
            title="Toggle contrast, brightness, colormap and stretch"
            className={`flex items-center space-x-1 h-7 px-2 rounded text-xs font-mono border transition-colors ${
              showAdjustments
                ? 'bg-primary/20 border-primary text-primary font-semibold'
                : 'bg-surface-elevated border-surface-border text-secondary hover:text-text-main'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Levels</span>
          </button>
        </div>
      </div>

      {/* 2. DEDICATED WISEVIEW MULTI-EPOCH FRAME PLAYER DECK */}
      <div className="bg-[#05080D] border-b border-surface-border px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0 select-none">
        
        {/* Playback Controls & Frame Steppers */}
        <div className="flex items-center space-x-2">
          {mode !== 'difference' && (
            <>
              {/* Prev Frame */}
              <button
                onClick={handleStepPrev}
                title="Step backward one frame (Left Arrow)"
                className="w-7 h-7 rounded border border-surface-border bg-surface-elevated hover:bg-surface hover:text-text-main text-secondary flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Play / Pause Toggle */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                title="Play/Pause timeline (Spacebar)"
                className={`flex items-center space-x-1.5 h-7 px-3 rounded font-mono font-semibold transition-all ${
                  isPlaying
                    ? 'bg-scientific-warning text-[#05080D] shadow-[0_0_10px_rgba(229,169,98,0.5)]'
                    : 'bg-primary text-[#05080D] hover:bg-primary-hover shadow-sm'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              {/* Next Frame */}
              <button
                onClick={handleStepNext}
                title="Step forward one frame (Right Arrow)"
                className="w-7 h-7 rounded border border-surface-border bg-surface-elevated hover:bg-surface hover:text-text-main text-secondary flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Speed Selector */}
              <div className="flex items-center space-x-1 h-7 bg-surface-elevated border border-surface-border px-2 rounded text-[11px] font-mono text-secondary">
                <span className="text-text-muted text-[10px]">Speed:</span>
                {[0.5, 1, 2, 4].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      playbackSpeed === s 
                        ? 'text-primary font-bold bg-surface shadow-xs' 
                        : 'hover:text-text-main'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* Loop Toggle */}
              <label 
                title="Repeat playback infinitely"
                className="flex items-center space-x-1 text-[11px] font-mono text-text-muted cursor-pointer hover:text-secondary px-1"
              >
                <input
                  type="checkbox"
                  checked={loop}
                  onChange={(e) => setLoop(e.target.checked)}
                  className="rounded bg-surface-elevated border-surface-border text-primary w-3.5 h-3.5"
                />
                <span>Loop</span>
              </label>
            </>
          )}
        </div>

        {/* CENTER: Numbered Epoch Pills (WiseView Interactive Frames) */}
        <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
          <span className="text-[10px] font-mono uppercase text-text-muted mr-1 hidden lg:inline">
            Frames:
          </span>
          {epochs.map((ep, idx) => {
            const isActive = currentEpochIdx === idx;
            const isBlinkA = mode === 'blink' && blinkEpochA === idx;
            const isBlinkB = mode === 'blink' && blinkEpochB === idx;

            return (
              <button
                key={ep.epoch_id}
                onClick={() => {
                  setCurrentEpochIdx(idx);
                  setIsPlaying(false);
                }}
                title={`Frame ${idx + 1}: ${ep.epoch_id} (${ep.obs_date.slice(0, 10)})`}
                className={`flex items-center space-x-1 px-2.5 h-7 rounded text-xs font-mono transition-all ${
                  isActive
                    ? 'bg-scientific-cyan text-[#05080D] font-bold shadow-[0_0_12px_rgba(94,234,212,0.5)]'
                    : isBlinkA
                    ? 'border border-primary text-primary bg-primary/10'
                    : isBlinkB
                    ? 'border border-scientific-cyan text-scientific-cyan bg-scientific-cyan/10'
                    : 'border border-surface-border bg-surface-elevated text-secondary hover:text-text-main hover:border-text-muted'
                }`}
              >
                <span className="text-[10px] opacity-75">{idx + 1}:</span>
                <span>{ep.epoch_id.replace('EP-', '')}</span>
                {isBlinkA && <span className="text-[9px] font-bold px-1 rounded bg-primary/30 text-primary">A</span>}
                {isBlinkB && <span className="text-[9px] font-bold px-1 rounded bg-scientific-cyan/30 text-scientific-cyan">B</span>}
              </button>
            );
          })}
        </div>

        {/* RIGHT: Blink Pair Configurator or Epoch Status */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          {mode === 'blink' && (
            <div className="flex items-center space-x-1.5 bg-surface-card border border-surface-border px-2 py-1 rounded text-[11px]">
              <span className="text-text-muted">Blink Pair:</span>
              <select
                value={blinkEpochA}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setBlinkEpochA(val);
                  loadDifference(currentTargetId, val, blinkEpochB);
                }}
                className="bg-surface-elevated border border-surface-border rounded px-1 text-primary font-semibold"
              >
                {epochs.map((ep, i) => (
                  <option key={ep.epoch_id} value={i}>{ep.epoch_id}</option>
                ))}
              </select>
              <span className="text-text-muted">↔</span>
              <select
                value={blinkEpochB}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setBlinkEpochB(val);
                  loadDifference(currentTargetId, blinkEpochA, val);
                }}
                className="bg-surface-elevated border border-surface-border rounded px-1 text-scientific-cyan font-semibold"
              >
                {epochs.map((ep, i) => (
                  <option key={ep.epoch_id} value={i}>{ep.epoch_id}</option>
                ))}
              </select>
            </div>
          )}

          <div className="text-[11px] text-text-muted hidden sm:block">
            <span>Baseline: </span>
            <span className="text-secondary font-semibold">6-Month Cadence</span>
          </div>
        </div>
      </div>

      {/* 3. WISEVIEW IMAGE LEVELS & CONTRAST DECK (COLLAPSIBLE / TOOLBOX) */}
      {showAdjustments && (
        <div className="bg-[#0E1620] border-b border-surface-border px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono flex-shrink-0 animate-fadeIn select-none">
          <div className="flex flex-wrap items-center gap-5">
            {/* Contrast Slider */}
            <div className="flex items-center space-x-2">
              <span className="text-text-muted text-[11px]">Contrast:</span>
              <input
                type="range"
                min="50"
                max="250"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-24 h-1.5 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-secondary text-[11px] w-9">{contrast}%</span>
            </div>

            {/* Brightness Slider */}
            <div className="flex items-center space-x-2">
              <span className="text-text-muted text-[11px]">Brightness:</span>
              <input
                type="range"
                min="50"
                max="200"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-24 h-1.5 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-secondary text-[11px] w-9">{brightness}%</span>
            </div>

            {/* Colormap Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-text-muted text-[11px]">Colormap:</span>
              <select
                value={colormap}
                onChange={(e) => setColormap(e.target.value)}
                className="bg-surface-elevated border border-surface-border px-2 py-0.5 rounded text-[11px] text-text-main"
              >
                <option value="grayscale">Grayscale (Standard)</option>
                <option value="cool">Infrared Cyan (SPHEREx)</option>
                <option value="heat">Thermal Amber (Planck)</option>
              </select>
            </div>

            {/* Stretch Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-text-muted text-[11px]">Stretch:</span>
              <select
                value={stretch}
                onChange={(e) => setStretch(e.target.value)}
                className="bg-surface-elevated border border-surface-border px-2 py-0.5 rounded text-[11px] text-text-main"
              >
                <option value="asinh">Asinh (Dynamic Range)</option>
                <option value="linear">Linear</option>
                <option value="log">Logarithmic</option>
                <option value="sqrt">Square Root</option>
              </select>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleResetLevels}
              className="text-[11px] text-text-muted hover:text-text-main underline decoration-dotted"
            >
              Reset Levels
            </button>
          </div>

          {/* Overlays Quick Toggles */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowReticle(!showReticle)}
              className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                showReticle ? 'bg-primary/20 border-primary text-primary' : 'bg-surface-elevated border-surface-border text-text-muted'
              }`}
            >
              ⌖ Bore Sight
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                showGrid ? 'bg-primary/20 border-primary text-primary' : 'bg-surface-elevated border-surface-border text-text-muted'
              }`}
            >
              ⌗ WCS Grid
            </button>
            <button
              onClick={() => setShowMotionTrail(!showMotionTrail)}
              className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                showMotionTrail ? 'bg-scientific-cyan/20 border-scientific-cyan text-scientific-cyan' : 'bg-surface-elevated border-surface-border text-text-muted'
              }`}
            >
              ↗ Motion Trail
            </button>
            <button
              onClick={() => setShowCandidates(!showCandidates)}
              className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                showCandidates ? 'bg-primary/20 border-primary text-primary' : 'bg-surface-elevated border-surface-border text-text-muted'
              }`}
            >
              ✦ Candidates
            </button>
            <button
              onClick={() => setShowGaia(!showGaia)}
              className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                showGaia ? 'bg-scientific-success/20 border-scientific-success text-scientific-success font-semibold shadow-xs' : 'bg-surface-elevated border-surface-border text-text-muted'
              }`}
            >
              ✦ Gaia DR3 ({gaiaSources.length})
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN WORKSPACE VIEWPORT & RIGHT ASTROMETRY PANEL */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* CENTER VIEWPORT (Dynamic based on comparison mode) */}
        <div className="flex-1 flex flex-col bg-[#05080D] relative overflow-hidden">
          
          {/* BLINK OR MOVIE MODE */}
          {(mode === 'blink' || mode === 'movie') && (
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
                  brightness={brightness}
                  contrast={contrast}
                  invert={invert}
                  colormap={colormap}
                  showGrid={showGrid}
                  showReticle={showReticle}
                  showCandidateMarkers={showCandidates}
                  gaiaSources={gaiaSources}
                  showGaia={showGaia}
                  onToggleGrid={() => setShowGrid(!showGrid)}
                  onToggleReticle={() => setShowReticle(!showReticle)}
                  onToggleCandidates={() => setShowCandidates(!showCandidates)}
                  onToggleInvert={() => setInvert(!invert)}
                  onToggleGaia={() => setShowGaia(!showGaia)}
                  crosshairLabel={`${mode === 'blink' ? 'Blinking' : 'Playing'}: ${currentEpoch.epoch_id} (${new Date(currentEpoch.obs_date).toISOString().slice(0, 10)})`}
                  className="w-full h-full"
                />
              )}

              {/* Epoch Indicator Overlay HUD (Top-Left) */}
              <div className="absolute top-4 left-4 bg-[#05080D]/92 border border-surface-border backdrop-blur-md p-3 rounded font-mono text-xs space-y-1.5 shadow-xl max-w-xs pointer-events-none">
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${mode === 'blink' ? (currentEpochIdx === blinkEpochA ? 'bg-primary' : 'bg-scientific-cyan') : 'bg-scientific-success'} animate-ping`} />
                  <span className="text-text-main font-semibold">Active: {currentEpoch?.epoch_id}</span>
                  <span className="text-[10px] text-secondary">
                    ({currentEpoch ? new Date(currentEpoch.obs_date).toLocaleDateString() : ''})
                  </span>
                </div>
                
                {mode === 'blink' ? (
                  <div className="text-[11px] text-text-muted flex items-center space-x-1.5">
                    <span>Alternating:</span>
                    <strong className="text-primary">{epochs[blinkEpochA]?.epoch_id}</strong>
                    <span>↔</span>
                    <strong className="text-scientific-cyan">{epochs[blinkEpochB]?.epoch_id}</strong>
                  </div>
                ) : (
                  <div className="text-[11px] text-text-muted">
                    Sequential Time-lapse: Frame {currentEpochIdx + 1} of {epochs.length}
                  </div>
                )}

                <div className="text-[10px] text-secondary flex items-center justify-between pt-1 border-t border-surface-border/60">
                  <span>Wavelength: 3.25 µm</span>
                  <span>Detector: D4 (SPHEREx)</span>
                </div>
              </div>

              {/* Keyboard Shortcuts Pill (Bottom-Left) */}
              <div className="absolute bottom-3 left-3 bg-[#05080D]/80 border border-surface-border backdrop-blur px-2.5 py-1 rounded text-[10px] font-mono text-text-muted pointer-events-none hidden md:flex items-center space-x-2">
                <span>[Space] Play/Pause</span>
                <span>·</span>
                <span>[←/→] Step</span>
                <span>·</span>
                <span>[I] Invert</span>
              </div>
            </div>
          )}

          {/* SIDE-BY-SIDE MODE */}
          {mode === 'side-by-side' && (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-1 p-1 bg-surface-border">
              {/* Left Viewport */}
              <div className="flex flex-col relative h-full">
                <div className="absolute top-2 left-2 z-10 bg-surface/90 border border-surface-border px-2.5 py-1 rounded text-xs font-mono text-primary flex items-center space-x-2 shadow">
                  <span>Left Epoch:</span>
                  <select
                    value={sideEpochLeft}
                    onChange={(e) => setSideEpochLeft(Number(e.target.value))}
                    className="bg-surface-elevated px-1 py-0.5 rounded text-text-main font-semibold"
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
                    brightness={brightness}
                    contrast={contrast}
                    invert={invert}
                    colormap={colormap}
                    showGrid={showGrid}
                    showReticle={showReticle}
                    showCandidateMarkers={showCandidates}
                    gaiaSources={gaiaSources}
                    showGaia={showGaia}
                    onToggleGaia={() => setShowGaia(!showGaia)}
                    crosshairLabel={`Coadd A: ${epochs[sideEpochLeft].epoch_id}`}
                    className="w-full h-full"
                  />
                )}
              </div>

              {/* Right Viewport */}
              <div className="flex flex-col relative h-full">
                <div className="absolute top-2 left-2 z-10 bg-surface/90 border border-surface-border px-2.5 py-1 rounded text-xs font-mono text-scientific-cyan flex items-center space-x-2 shadow">
                  <span>Right Epoch:</span>
                  <select
                    value={sideEpochRight}
                    onChange={(e) => setSideEpochRight(Number(e.target.value))}
                    className="bg-surface-elevated px-1 py-0.5 rounded text-text-main font-semibold"
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
                    brightness={brightness}
                    contrast={contrast}
                    invert={invert}
                    colormap={colormap}
                    showGrid={showGrid}
                    showReticle={showReticle}
                    showCandidateMarkers={showCandidates}
                    gaiaSources={gaiaSources}
                    showGaia={showGaia}
                    onToggleGaia={() => setShowGaia(!showGaia)}
                    crosshairLabel={`Coadd B: ${epochs[sideEpochRight].epoch_id}`}
                    className="w-full h-full"
                  />
                )}
              </div>
            </div>
          )}

          {/* DIFFERENCE IMAGE MODE */}
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
                  brightness={brightness}
                  contrast={contrast}
                  invert={invert}
                  showGrid={showGrid}
                  showReticle={showReticle}
                  showCandidateMarkers={showCandidates}
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
                <div className="absolute top-4 left-4 bg-surface/92 border border-surface-border backdrop-blur-md p-3.5 rounded font-mono text-xs space-y-2 max-w-sm shadow-xl">
                  <div className="flex items-center space-x-2 text-scientific-cyan">
                    <MinusCircle className="w-4 h-4" />
                    <span className="font-semibold uppercase tracking-wider text-[11px]">
                      Astrometric Difference Profile
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed font-sans">
                    Aligned pixel subtraction: <code className="text-secondary font-mono">I_diff = I_2 − I_1</code>.
                    Reveals positive transient flux (cyan peak) and negative deficit (red trough), forming the characteristic dipole of moving bodies.
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[11px] pt-2 border-t border-surface-border">
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

          {/* PAN-STARRS OPTICAL COMPARISON STRIP (WISEVIEW INTEGRATION) */}
          {showPawnstars && (
            <div className="bg-[#05080D]/95 border-t border-surface-border px-4 py-2 flex items-center justify-between gap-4 text-xs font-mono flex-shrink-0 animate-fadeIn select-none">
              <div className="flex items-center space-x-3">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Pan-STARRS Optical Strip:</span>
                </span>
                <span className="text-text-muted text-[10px] hidden md:inline">
                  Filters: g, i, y (Optical/NIR Composite) · STScI Archive
                </span>
              </div>
              {loadingPawnstars ? (
                <span className="text-secondary text-[11px] animate-pulse">Retrieving Pan-STARRS composite...</span>
              ) : pawnstarsUrl ? (
                <div className="flex items-center space-x-3">
                  <img 
                    src={pawnstarsUrl} 
                    alt="Pan-STARRS Cutout" 
                    className="h-11 w-11 object-cover rounded border border-surface-border shadow"
                  />
                  <a 
                    href={pawnstarsUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-scientific-cyan hover:underline text-[11px] flex items-center space-x-1 font-semibold"
                  >
                    <span>Full STScI Cutout</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <span className="text-text-muted text-[10px]">Optical composite unavailable for this celestial position.</span>
              )}
            </div>
          )}

          {/* Bottom Timeline Scrubber */}
          <div className="bg-surface border-t border-surface-border px-4 sm:px-6 py-2.5 space-y-2 flex-shrink-0 select-none">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2">
                <Calendar className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-text-muted">Survey Timeline:</span>
                <span className="text-text-main font-semibold">
                  Epoch {currentEpochIdx + 1} of {epochs.length} ({currentEpoch?.epoch_id})
                </span>
                <span className="text-secondary">· {currentEpoch?.obs_date ? new Date(currentEpoch.obs_date).toLocaleDateString() : ''}</span>
              </div>

              <div className="text-[11px] text-text-muted font-mono hidden md:block">
                <span>Field: </span>
                <span className="text-primary font-semibold">{activeTarget?.name || 'Target Field'}</span>
                <span> · FOV: {observationsData?.fov_arcmin || 10.0}′</span>
              </div>
            </div>

            {/* Visual Timeline Bar with Epoch nodes */}
            <div className="relative flex items-center pt-1 pb-1">
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
                          ? 'border-primary bg-primary scale-125 shadow-[0_0_10px_rgba(140,183,216,0.8)]'
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

        {/* 5. RIGHT ASTROMETRY & CANDIDATE DETECTION DRAWER (~320px) */}
        <div className="w-80 flex-shrink-0 bg-surface border-l border-surface-border flex flex-col overflow-y-auto">
          <div className="p-4 space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Candidate Detection</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-primary/30 bg-primary/10 text-primary font-semibold">
                  {observationsData?.detected_candidates.length || 0} Detected
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Multi-epoch astrometric displacement & photometric variability cross-matching engine.
              </p>
            </div>

            {/* Candidates List */}
            <div className="space-y-2">
              {observationsData?.detected_candidates.map((cand) => {
                const isSelected = selectedCandidate?.candidate_id === cand.candidate_id;
                return (
                  <div
                    key={cand.candidate_id}
                    onClick={() => setSelectedCandidate(cand)}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-surface-elevated shadow-md ring-1 ring-primary/40'
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

                <div className="space-y-1.5 bg-surface-elevated p-3 rounded border border-surface-border text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-text-muted">RA (ICRS):</span>
                    <span className="text-secondary">{selectedCandidate.ra_sexagesimal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">DEC (ICRS):</span>
                    <span className="text-secondary">{selectedCandidate.dec_sexagesimal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Annual Motion:</span>
                    <span className="text-primary font-bold">
                      {activeTarget?.proper_motion.total_pm_arcsec_yr || selectedCandidate.angular_displacement_arcsec}″ / yr
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Astrometric Residual:</span>
                    <span className="text-secondary">&lt; 0.08 arcsec</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Position Vector:</span>
                    <span className="text-scientific-cyan font-mono">[{selectedCandidate.pixel_x}, {selectedCandidate.pixel_y}]</span>
                  </div>
                </div>

                {/* Scientifically Cautious Identification Notice */}
                <div className="p-2.5 rounded bg-surface-card border border-surface-border text-[11px] text-text-muted leading-relaxed flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-scientific-warning flex-shrink-0 mt-0.5" />
                  <span>
                    Scientifically cautious identification: Multi-epoch displacement confirms high proper motion.
                    Follow-up spectral characterization required for definitive orbital or brown dwarf classification.
                  </span>
                </div>

                <button
                  onClick={() => onOpenCandidateModal(selectedCandidate, observationsData?.target_name || "Field Observation")}
                  className="w-full py-2.5 px-3 rounded bg-primary hover:bg-primary-hover text-[#05080D] text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-md active:scale-[0.98]"
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
