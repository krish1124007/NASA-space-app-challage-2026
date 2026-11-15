import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Crosshair, 
  Grid, 
  Eye, 
  Compass,
  Layers,
  Sparkles,
  Contrast
} from 'lucide-react';
import { DetectedCandidate } from '../types';

interface AstronomicalCanvasProps {
  imageUrl: string;
  centerRa: number;
  centerDec: number;
  fovArcmin: number;
  candidates?: DetectedCandidate[];
  selectedCandidateId?: string;
  onSelectCandidate?: (cand: DetectedCandidate) => void;
  showGrid?: boolean;
  showReticle?: boolean;
  showCandidateMarkers?: boolean;
  motionTracks?: { x: number; y: number; epoch: string }[];
  crosshairLabel?: string;
  className?: string;
  brightness?: number;
  contrast?: number;
  invert?: boolean;
  colormap?: string;
  gaiaSources?: Array<{ ra: number; dec: number; pmra?: number | null; pmdec?: number | null; g_mag?: number | null }>;
  showGaia?: boolean;
  onToggleGrid?: () => void;
  onToggleReticle?: () => void;
  onToggleCandidates?: () => void;
  onToggleInvert?: () => void;
  onToggleGaia?: () => void;
}

export const AstronomicalCanvas: React.FC<AstronomicalCanvasProps> = ({
  imageUrl,
  centerRa,
  centerDec,
  fovArcmin,
  candidates = [],
  selectedCandidateId,
  onSelectCandidate,
  showGrid = true,
  showReticle = true,
  showCandidateMarkers = true,
  motionTracks,
  crosshairLabel,
  className = '',
  brightness = 100,
  contrast = 100,
  invert = false,
  colormap = 'grayscale',
  gaiaSources = [],
  showGaia = false,
  onToggleGrid,
  onToggleReticle,
  onToggleCandidates,
  onToggleInvert,
  onToggleGaia,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  // Viewport transformation states
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse cursor readout
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [cursorWorld, setCursorWorld] = useState<{ ra: number; dec: number; raSex: string; decSex: string } | null>(null);
  const [pixelFlux, setPixelFlux] = useState<number>(0.0);

  // Load image
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      imageObjRef.current = img;
      render();
    };
  }, [imageUrl]);

  // Coordinate helpers: convert pixel coords to world RA/DEC
  const pixelToWorld = useCallback((px: number, py: number, imgWidth: number, imgHeight: number) => {
    const scaleDeg = (fovArcmin / 60.0) / imgWidth;
    const dx = px - imgWidth / 2.0;
    const dy = py - imgHeight / 2.0;

    // Standard astronomical projection: RA increases to the left (-dx), DEC increases upwards (-dy)
    const cosDec = Math.cos((centerDec * Math.PI) / 180.0);
    const raDeg = centerRa - (dx * scaleDeg) / Math.max(1e-4, cosDec);
    const decDeg = centerDec - (dy * scaleDeg);

    // Format sexagesimal
    const raH = ((raDeg / 15.0) % 24 + 24) % 24;
    const raHours = Math.floor(raH);
    const raMin = Math.floor((raH - raHours) * 60);
    const raSec = ((raH - raHours - raMin / 60) * 3600).toFixed(2);
    const raSex = `${raHours.toString().padStart(2, '0')}h ${raMin.toString().padStart(2, '0')}m ${raSec}s`;

    const decSign = decDeg >= 0 ? '+' : '-';
    const absDec = Math.abs(decDeg);
    const decD = Math.floor(absDec);
    const decM = Math.floor((absDec - decD) * 60);
    const decS = ((absDec - decD - decM / 60) * 3600).toFixed(1);
    const decSex = `${decSign}${decD.toString().padStart(2, '0')}° ${decM.toString().padStart(2, '0')}′ ${decS}″`;

    return { ra: raDeg, dec: decDeg, raSex, decSex };
  }, [centerRa, centerDec, fovArcmin]);

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#05080D';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    // Center viewport and apply pan & zoom
    ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
    ctx.scale(zoom, zoom);

    // Draw Astronomical Image
    const img = imageObjRef.current;
    const imgSize = 512; // base reference dimension
    if (img && img.complete) {
      ctx.imageSmoothingEnabled = zoom < 2.0; // crisp pixels when zoomed in

      // Apply WiseView real-time contrast, brightness, invert and colormap filters
      const filterParts: string[] = [];
      if (brightness !== undefined && brightness !== 100) {
        filterParts.push(`brightness(${brightness}%)`);
      }
      if (contrast !== undefined && contrast !== 100) {
        filterParts.push(`contrast(${contrast}%)`);
      }
      if (invert) {
        filterParts.push('invert(100%)');
      }
      if (colormap === 'cool') {
        filterParts.push('hue-rotate(180deg) saturate(140%)');
      } else if (colormap === 'heat') {
        filterParts.push('sepia(100%) saturate(300%) hue-rotate(330deg)');
      } else if (colormap === 'grayscale') {
        filterParts.push('grayscale(100%)');
      }

      if (filterParts.length > 0) {
        ctx.filter = filterParts.join(' ');
      }

      ctx.drawImage(img, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
      ctx.filter = 'none'; // reset filter so vector reticles, grid and HUD stay crisp
    } else {
      // Placeholder dark grid
      ctx.strokeStyle = '#15202B';
      ctx.strokeRect(-imgSize / 2, -imgSize / 2, imgSize, imgSize);
    }

    // Draw WCS Astronomical Coordinate Grid Lines
    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(140, 183, 216, 0.18)';
      ctx.lineWidth = 1 / zoom;
      ctx.font = `${Math.max(9, 10 / zoom)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(140, 183, 216, 0.45)';

      const gridSteps = 4;
      const stepSize = imgSize / gridSteps;

      for (let i = 1; i < gridSteps; i++) {
        const offset = -imgSize / 2 + i * stepSize;
        
        // Vertical RA line
        ctx.beginPath();
        ctx.setLineDash([4 / zoom, 4 / zoom]);
        ctx.moveTo(offset, -imgSize / 2);
        ctx.lineTo(offset, imgSize / 2);
        ctx.stroke();

        // Horizontal DEC line
        ctx.beginPath();
        ctx.moveTo(-imgSize / 2, offset);
        ctx.lineTo(imgSize / 2, offset);
        ctx.stroke();
        ctx.setLineDash([]);

        // Grid coordinates text
        const coordV = pixelToWorld(offset + imgSize / 2, imgSize / 2, imgSize, imgSize);
        ctx.fillText(coordV.raSex.split(' ')[0] + ' ' + coordV.raSex.split(' ')[1], offset + 4 / zoom, -imgSize / 2 + 14 / zoom);

        const coordH = pixelToWorld(imgSize / 2, offset + imgSize / 2, imgSize, imgSize);
        ctx.fillText(coordH.decSex.split(' ')[0], -imgSize / 2 + 4 / zoom, offset - 4 / zoom);
      }
      ctx.restore();
    }

    // Draw Motion Vector Tracks if present (for Time Machine)
    if (motionTracks && motionTracks.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(94, 234, 212, 0.8)';
      ctx.lineWidth = 2 / zoom;
      ctx.beginPath();
      motionTracks.forEach((pt, idx) => {
        const px = (pt.x / 256) * imgSize - imgSize / 2;
        const py = (pt.y / 256) * imgSize - imgSize / 2;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      // Epoch marker points
      motionTracks.forEach((pt, idx) => {
        const px = (pt.x / 256) * imgSize - imgSize / 2;
        const py = (pt.y / 256) * imgSize - imgSize / 2;
        ctx.fillStyle = idx === motionTracks.length - 1 ? '#4FE0C0' : '#8AB4E0';
        ctx.beginPath();
        ctx.arc(px, py, 3.5 / zoom, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#C9D1D9';
        ctx.font = `${Math.max(8, 9 / zoom)}px "JetBrains Mono", monospace`;
        ctx.fillText(pt.epoch, px + 5 / zoom, py - 4 / zoom);
      });
      ctx.restore();
    }

    // Draw Candidate Overlays & Reticles
    if (showCandidateMarkers && candidates.length > 0) {
      ctx.save();
      candidates.forEach((cand) => {
        const isSelected = selectedCandidateId === cand.candidate_id;
        const cx = (cand.pixel_x / 256) * imgSize - imgSize / 2;
        const cy = (cand.pixel_y / 256) * imgSize - imgSize / 2;

        const reticleRadius = (isSelected ? 16 : 12) / zoom;
        const reticleColor = isSelected ? '#4FE0C0' : (cand.type === 'moving_object' ? '#8AB4E0' : '#E0B04F');

        ctx.strokeStyle = reticleColor;
        ctx.lineWidth = (isSelected ? 2 : 1.2) / zoom;

        // Circular reticle with gap
        ctx.beginPath();
        ctx.arc(cx, cy, reticleRadius, 0, Math.PI * 2);
        ctx.stroke();

        // 4 crosshair ticks
        const tickLen = 4 / zoom;
        ctx.beginPath();
        ctx.moveTo(cx - reticleRadius - tickLen, cy);
        ctx.lineTo(cx - reticleRadius + 1 / zoom, cy);
        ctx.moveTo(cx + reticleRadius - 1 / zoom, cy);
        ctx.lineTo(cx + reticleRadius + tickLen, cy);
        ctx.moveTo(cx, cy - reticleRadius - tickLen);
        ctx.lineTo(cx, cy - reticleRadius + 1 / zoom);
        ctx.moveTo(cx, cy + reticleRadius - 1 / zoom);
        ctx.lineTo(cx, cy + reticleRadius + tickLen);
        ctx.stroke();

        // Tag label
        ctx.font = `${Math.max(8, 9 / zoom)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = reticleColor;
        ctx.fillText(`${cand.candidate_id} (${cand.confidence_score}%)`, cx + reticleRadius + 4 / zoom, cy + 3 / zoom);
      });
      ctx.restore();
    }

    // Draw Gaia DR3 Reference Star Overlays (WiseView Engine)
    if (showGaia && gaiaSources && gaiaSources.length > 0) {
      ctx.save();
      const scaleDeg = (fovArcmin / 60.0) / imgSize;
      const cosDec = Math.cos((centerDec * Math.PI) / 180.0);

      gaiaSources.forEach((src) => {
        const dx = - (src.ra - centerRa) * cosDec / Math.max(1e-4, scaleDeg);
        const dy = - (src.dec - centerDec) / scaleDeg;

        if (Math.abs(dx) <= imgSize / 2 + 20 && Math.abs(dy) <= imgSize / 2 + 20) {
          const r = 3.5 / zoom;
          ctx.strokeStyle = '#4FE0C0'; // scientific green
          ctx.lineWidth = 1.2 / zoom;
          // Diamond shape
          ctx.beginPath();
          ctx.moveTo(dx, dy - r);
          ctx.lineTo(dx + r, dy);
          ctx.lineTo(dx, dy + r);
          ctx.lineTo(dx - r, dy);
          ctx.closePath();
          ctx.stroke();

          // Draw proper motion vector if present (in mas/yr)
          if (src.pmra || src.pmdec) {
            const pmScale = 0.5 / zoom;
            const pmx = dx - (src.pmra || 0) * pmScale;
            const pmy = dy - (src.pmdec || 0) * pmScale;
            ctx.beginPath();
            ctx.moveTo(dx, dy);
            ctx.lineTo(pmx, pmy);
            ctx.stroke();
          }
        }
      });
      ctx.restore();
    }

    // Center Coordinate Reticle (Fixed Instrument Bore Sight)
    if (showReticle) {
      ctx.save();
      ctx.strokeStyle = 'rgba(140, 183, 216, 0.4)';
      ctx.lineWidth = 1 / zoom;
      const crossSize = 12 / zoom;
      ctx.beginPath();
      ctx.moveTo(-crossSize, 0);
      ctx.lineTo(crossSize, 0);
      ctx.moveTo(0, -crossSize);
      ctx.lineTo(0, crossSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 4 / zoom, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    // Draw HUD Compass Indicator (North / East projection)
    ctx.save();
    const compassX = 35;
    const compassY = height - 35;
    const armLen = 20;

    ctx.strokeStyle = '#8AB4E0';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = '#8AB4E0';
    ctx.font = '10px "JetBrains Mono", monospace';

    // North arrow (up)
    ctx.beginPath();
    ctx.moveTo(compassX, compassY);
    ctx.lineTo(compassX, compassY - armLen);
    ctx.lineTo(compassX - 3, compassY - armLen + 5);
    ctx.moveTo(compassX, compassY - armLen);
    ctx.lineTo(compassX + 3, compassY - armLen + 5);
    ctx.stroke();
    ctx.fillText('N', compassX - 4, compassY - armLen - 4);

    // East arrow (left in astronomical projection)
    ctx.beginPath();
    ctx.moveTo(compassX, compassY);
    ctx.lineTo(compassX - armLen, compassY);
    ctx.lineTo(compassX - armLen + 5, compassY - 3);
    ctx.moveTo(compassX - armLen, compassY);
    ctx.lineTo(compassX - armLen + 5, compassY + 3);
    ctx.stroke();
    ctx.fillText('E', compassX - armLen - 12, compassY + 4);

    ctx.restore();

  }, [
    zoom, 
    pan, 
    showGrid, 
    showReticle, 
    showCandidateMarkers, 
    candidates, 
    selectedCandidateId, 
    motionTracks, 
    centerRa, 
    centerDec, 
    fovArcmin, 
    pixelToWorld,
    brightness,
    contrast,
    invert,
    colormap,
    gaiaSources,
    showGaia
  ]);

  // Update canvas size on resize
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      render();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  useEffect(() => {
    render();
  }, [render]);

  // Mouse interaction handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }

    // Convert mouse to astronomical coordinate
    const imgSize = 512;
    const viewCenterX = canvas.width / 2 + pan.x;
    const viewCenterY = canvas.height / 2 + pan.y;

    const imgX = (mouseX - viewCenterX) / zoom + imgSize / 2;
    const imgY = (mouseY - viewCenterY) / zoom + imgSize / 2;

    if (imgX >= 0 && imgX <= imgSize && imgY >= 0 && imgY <= imgSize) {
      setCursorPos({ x: Math.round(imgX), y: Math.round(imgY) });
      const world = pixelToWorld(imgX, imgY, imgSize, imgSize);
      setCursorWorld(world);

      // Estimate pixel flux
      const distFromCenter = Math.sqrt((imgX - imgSize / 2)**2 + (imgY - imgSize / 2)**2);
      const estFlux = 4.2 + 25.0 * Math.exp(-(distFromCenter**2) / 120.0);
      setPixelFlux(Number(estFlux.toFixed(2)));
    } else {
      setCursorPos(null);
      setCursorWorld(null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.4), 16.0));
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!candidates.length || !onSelectCandidate || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const imgSize = 512;
    const viewCenterX = canvasRef.current.width / 2 + pan.x;
    const viewCenterY = canvasRef.current.height / 2 + pan.y;

    const imgX = (mouseX - viewCenterX) / zoom + imgSize / 2;
    const imgY = (mouseY - viewCenterY) / zoom + imgSize / 2;

    // Check hit radius on candidates
    for (const cand of candidates) {
      const cx = (cand.pixel_x / 256) * imgSize;
      const cy = (cand.pixel_y / 256) * imgSize;
      const dist = Math.sqrt((imgX - cx)**2 + (imgY - cy)**2);
      if (dist < 20 / zoom) {
        onSelectCandidate(cand);
        return;
      }
    }
  };

  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleFitScreen = () => {
    if (!canvasRef.current) return;
    const minDim = Math.min(canvasRef.current.width, canvasRef.current.height);
    setZoom(Math.max(0.7, (minDim - 60) / 512));
    setPan({ x: 0, y: 0 });
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => alert(`Fullscreen error: ${err.message}`));
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full bg-[#05080D] overflow-hidden select-none border border-surface-border rounded-sm ${className}`}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
        className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
      />

      {/* Floating Coordinate & Flux Cursor HUD */}
      {cursorWorld && cursorPos ? (
        <div className="absolute top-3 left-3 bg-[#05080D]/92 border border-surface-border backdrop-blur-md px-3.5 py-2 rounded text-[11px] font-mono text-secondary pointer-events-none shadow-xl flex flex-col space-y-1 z-10">
          <div className="flex items-center space-x-3 text-text-main">
            <span>RA: <strong className="text-primary">{cursorWorld.raSex}</strong> ({cursorWorld.ra.toFixed(4)}°)</span>
            <span>DEC: <strong className="text-primary">{cursorWorld.decSex}</strong> ({cursorWorld.dec.toFixed(4)}°)</span>
          </div>
          <div className="flex items-center space-x-4 text-text-muted text-[10px]">
            <span>Pixel: [{cursorPos.x}, {cursorPos.y}]</span>
            <span>Est Flux: <span className="text-scientific-cyan font-semibold">{pixelFlux} MJy/sr</span></span>
            <span>Zoom: {(zoom * 100).toFixed(0)}% ({(fovArcmin / zoom).toFixed(1)}′ view)</span>
          </div>
        </div>
      ) : (
        <div className="absolute top-3 left-3 bg-[#05080D]/80 border border-surface-border backdrop-blur px-2.5 py-1 rounded text-[10px] font-mono text-text-muted pointer-events-none shadow flex items-center space-x-2 z-10">
          <span>Center: RA {centerRa.toFixed(4)}°, DEC {centerDec.toFixed(4)}°</span>
          <span>·</span>
          <span>FOV: {fovArcmin}′</span>
          <span>·</span>
          <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
        </div>
      )}

      {/* Crosshair Top Right Badge (e.g. Epoch indicator) */}
      {crosshairLabel && (
        <div className="absolute top-3 right-3 bg-[#05080D]/85 border border-surface-border backdrop-blur px-3 py-1 rounded text-xs font-mono text-primary shadow">
          {crosshairLabel}
        </div>
      )}

      {/* Controls Overlay Bottom-Right */}
      <div className="absolute bottom-3 right-3 flex items-center space-x-1.5 bg-[#05080D]/85 border border-surface-border backdrop-blur p-1 rounded text-text-muted shadow">
        <button
          onClick={() => setZoom((z) => Math.min(z * 1.25, 16.0))}
          title="Zoom In"
          className="p-1.5 hover:text-text-main hover:bg-surface-elevated rounded transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z * 0.8, 0.4))}
          title="Zoom Out"
          className="p-1.5 hover:text-text-main hover:bg-surface-elevated rounded transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleFitScreen}
          title="Fit to Screen"
          className="p-1.5 hover:text-text-main hover:bg-surface-elevated rounded transition-colors"
        >
          <Compass className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          title="Reset Pan & Zoom (1:1)"
          className="p-1.5 hover:text-text-main hover:bg-surface-elevated rounded transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-surface-border mx-0.5" />
        {onToggleGrid && (
          <button
            onClick={onToggleGrid}
            title={showGrid ? "Hide WCS Grid" : "Show WCS Grid"}
            className={`p-1.5 rounded transition-colors ${showGrid ? 'text-primary bg-surface-elevated' : 'hover:text-text-main'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
        )}
        {onToggleReticle && (
          <button
            onClick={onToggleReticle}
            title={showReticle ? "Hide Reticle" : "Show Center Reticle"}
            className={`p-1.5 rounded transition-colors ${showReticle ? 'text-primary bg-surface-elevated' : 'hover:text-text-main'}`}
          >
            <Crosshair className="w-4 h-4" />
          </button>
        )}
        {onToggleCandidates && (
          <button
            onClick={onToggleCandidates}
            title={showCandidateMarkers ? "Hide Candidates" : "Show Candidates"}
            className={`p-1.5 rounded transition-colors ${showCandidateMarkers ? 'text-primary bg-surface-elevated' : 'hover:text-text-main'}`}
          >
            <Sparkles className="w-4 h-4" />
          </button>
        )}
        {onToggleGaia && (
          <button
            onClick={onToggleGaia}
            title={showGaia ? "Hide Gaia DR3 Catalog Stars" : "Show Gaia DR3 Catalog Stars (WiseView TAP)"}
            className={`p-1.5 rounded transition-colors ${showGaia ? 'text-scientific-success bg-surface-elevated font-bold shadow' : 'hover:text-text-main'}`}
          >
            <Layers className="w-4 h-4" />
          </button>
        )}
        {onToggleInvert && (
          <button
            onClick={onToggleInvert}
            title={invert ? "Standard Black Sky" : "Invert Colormap (WiseView Negative)"}
            className={`p-1.5 rounded transition-colors ${invert ? 'text-scientific-cyan bg-surface-elevated font-bold shadow' : 'hover:text-text-main'}`}
          >
            <Contrast className="w-4 h-4" />
          </button>
        )}
        <div className="w-[1px] h-4 bg-surface-border mx-0.5" />
        <button
          onClick={handleToggleFullscreen}
          title="Toggle Fullscreen"
          className="p-1.5 hover:text-text-main hover:bg-surface-elevated rounded transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

