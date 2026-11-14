import React from 'react';
import { X, FileText, Telescope, Clock, Layers, Award, CheckCircle2 } from 'lucide-react';

interface DocumentationModalProps {
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center space-x-2 text-primary">
            <FileText className="w-4 h-4" />
            <h3 className="font-semibold text-sm text-text-main font-sans">
              SPHEREx Explorer User & Scientific Research Guide
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-text-muted hover:text-text-main hover:bg-surface-elevated"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-text-muted leading-relaxed font-sans">
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-text-main flex items-center space-x-2">
              <Telescope className="w-4 h-4 text-primary" />
              <span>1. Sky Explorer Navigation</span>
            </h4>
            <p>
              Use decimal degrees (e.g. <code className="text-primary font-mono">133.795, -7.245</code>) or sexagesimal formats 
              (e.g. <code className="text-primary font-mono">08h 55m 10.831s, -07° 14′ 42.53″</code>) to center the scientific image canvas. 
              The viewer displays calibrated flux values in physical surface brightness units ($MJy/sr$) with true astronomical WCS orientation (North Up, East Left).
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-text-main flex items-center space-x-2">
              <Clock className="w-4 h-4 text-scientific-cyan" />
              <span>2. Temporal Time Machine & Difference Imaging</span>
            </h4>
            <p>
              SPHEREx surveys the entire sky every six months, establishing discrete observation epochs. 
              In the Time Machine:
            </p>
            <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] text-secondary">
              <li><strong className="text-text-main">Blink Mode:</strong> Rapidly alternates between two epochs to immediately trigger human visual motion perception.</li>
              <li><strong className="text-text-main">Side-by-Side:</strong> Allows synchronized dual-pan comparison of morphology and surrounding astrometric reference stars.</li>
              <li><strong className="text-text-main">Difference Image:</strong> Pixel subtraction (<code className="text-scientific-cyan">I_diff = I_2 − I_1</code>) eliminates static background stars. A moving source leaves a characteristic "dipole" (negative red hole where it was, positive blue peak where it moved).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-text-main flex items-center space-x-2">
              <Layers className="w-4 h-4 text-scientific-success" />
              <span>3. 102-Band Infrared Spectrophotometry</span>
            </h4>
            <p>
              Each of SPHEREx's 6 focal plane arrays features a Linear Variable Filter (LVF) covering 17 discrete bands (102 bands total, 0.75 µm to 5.0 µm). 
              The Spectral Analysis workspace plots the Spectral Energy Distribution (SED). Key molecular absorption features indicate:
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-1">
              <div className="bg-surface-elevated p-2 rounded border border-surface-border">
                <span className="text-scientific-cyan font-bold block">3.05 µm: H2O Water Ice</span>
                <span>Circumstellar dust grains and protoplanetary discs</span>
              </div>
              <div className="bg-surface-elevated p-2 rounded border border-surface-border">
                <span className="text-scientific-cyan font-bold block">4.27 µm: CO2 Carbon Dioxide Ice</span>
                <span>Interstellar ice grain mantles</span>
              </div>
              <div className="bg-surface-elevated p-2 rounded border border-surface-border">
                <span className="text-scientific-cyan font-bold block">4.67 µm: CO Carbon Monoxide Ice</span>
                <span>Volatile ice in cold molecular clouds</span>
              </div>
              <div className="bg-surface-elevated p-2 rounded border border-surface-border">
                <span className="text-scientific-cyan font-bold block">1.66 & 3.3 µm: CH4 Methane</span>
                <span>Atmospheres of cold sub-stellar Y & T brown dwarfs</span>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-text-main flex items-center space-x-2">
              <Award className="w-4 h-4 text-scientific-warning" />
              <span>4. Citizen-Science Verification Standards</span>
            </h4>
            <p>
              Candidates flagged in SPHEREx Explorer undergo astrometric cross-matching against the NASA Minor Planet Center (MPC) 
              and Gaia DR3 astrometric catalogs. Always verify that candidate shifts are not instrumental artifacts (such as detector edge reflections or single-frame cosmic ray strikes).
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-border bg-surface-elevated flex justify-between items-center text-xs font-mono text-text-muted">
          <span>SPHEREx Explorer v1.0.0</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-primary hover:bg-primary-hover text-[#0B1016] font-semibold text-xs font-sans"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};

