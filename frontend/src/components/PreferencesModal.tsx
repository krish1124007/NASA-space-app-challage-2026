import React from 'react';
import { X, Settings, Check } from 'lucide-react';

interface PreferencesModalProps {
  onClose: () => void;
  coordFormat: 'sexagesimal' | 'decimal';
  setCoordFormat: (fmt: 'sexagesimal' | 'decimal') => void;
  units: 'mjy_sr' | 'dn';
  setUnits: (u: 'mjy_sr' | 'dn') => void;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  onClose,
  coordFormat,
  setCoordFormat,
  units,
  setUnits,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-lg max-w-md w-full shadow-2xl overflow-hidden font-mono text-xs">
        <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center space-x-2 text-primary">
            <Settings className="w-4 h-4" />
            <h3 className="font-semibold text-sm text-text-main font-sans">
              Astronomical Instrument Preferences
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-text-muted hover:text-text-main hover:bg-surface-elevated"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-text-muted text-[11px] block">Celestial Coordinate Display:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCoordFormat('sexagesimal')}
                className={`py-2 px-3 rounded border text-left ${
                  coordFormat === 'sexagesimal'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-surface-border bg-surface-elevated text-secondary'
                }`}
              >
                <div>Sexagesimal</div>
                <div className="text-[10px] text-text-muted font-normal mt-0.5">08h 55m 10s, -07° 14′</div>
              </button>
              <button
                type="button"
                onClick={() => setCoordFormat('decimal')}
                className={`py-2 px-3 rounded border text-left ${
                  coordFormat === 'decimal'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-surface-border bg-surface-elevated text-secondary'
                }`}
              >
                <div>Decimal Degrees</div>
                <div className="text-[10px] text-text-muted font-normal mt-0.5">133.7951°, -7.2451°</div>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-text-muted text-[11px] block">Physical Flux Units:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUnits('mjy_sr')}
                className={`py-2 px-3 rounded border text-left ${
                  units === 'mjy_sr'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-surface-border bg-surface-elevated text-secondary'
                }`}
              >
                <div>MJy / sr</div>
                <div className="text-[10px] text-text-muted font-normal mt-0.5">Physical Surface Brightness</div>
              </button>
              <button
                type="button"
                onClick={() => setUnits('dn')}
                className={`py-2 px-3 rounded border text-left ${
                  units === 'dn'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-surface-border bg-surface-elevated text-secondary'
                }`}
              >
                <div>DN (Data Numbers)</div>
                <div className="text-[10px] text-text-muted font-normal mt-0.5">Instrument Detector ADU</div>
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-surface-border bg-surface-elevated flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-primary hover:bg-primary-hover text-[#0B1016] font-semibold text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

