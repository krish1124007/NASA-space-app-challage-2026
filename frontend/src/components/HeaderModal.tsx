import React from 'react';
import { ObservationMetadata } from '../types';
import { X, FileCode, Copy, Check } from 'lucide-react';

interface HeaderModalProps {
  metadata: ObservationMetadata | null;
  onClose: () => void;
}

export const HeaderModal: React.FC<HeaderModalProps> = ({ metadata, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  if (!metadata) return null;

  const headerCards = [
    { key: 'SIMPLE', val: 'T', comment: 'Standard FITS format conformance' },
    { key: 'BITPIX', val: '-32', comment: 'IEEE single precision floating point' },
    { key: 'NAXIS', val: '2', comment: 'Number of spatial array axes' },
    { key: 'NAXIS1', val: metadata.dimensions[0], comment: 'Fast axis array dimension' },
    { key: 'NAXIS2', val: metadata.dimensions[1], comment: 'Slow axis array dimension' },
    { key: 'EXTEND', val: 'T', comment: 'FITS dataset may contain extensions' },
    { key: 'TELESCOP', val: `'${metadata.telescope}'`, comment: 'Space observatory platform' },
    { key: 'INSTRUME', val: `'${metadata.instrument}'`, comment: 'Focal plane spectrometer assembly' },
    { key: 'RELEASE', val: `'${metadata.data_release}'`, comment: 'Public data release tag' },
    { key: 'DETECTOR', val: `'${metadata.detector}'`, comment: 'HgCdTe focal plane array assembly' },
    { key: 'CHANNEL', val: metadata.channel, comment: 'Nominal linear variable filter band (1-102)' },
    { key: 'WAVELEN', val: metadata.wavelength_um.toFixed(4), comment: 'Central bandpass wavelength [microns]' },
    { key: 'BUNIT', val: "'MJy/sr'", comment: 'Physical flux surface brightness units' },
    { key: 'CRPIX1', val: (metadata.dimensions[0] / 2 + 0.5).toFixed(1), comment: 'X-axis reference pixel coordinate' },
    { key: 'CRPIX2', val: (metadata.dimensions[1] / 2 + 0.5).toFixed(1), comment: 'Y-axis reference pixel coordinate' },
    { key: 'CRVAL1', val: metadata.center_coordinates.ra.toFixed(6), comment: 'Right Ascension at reference pixel [deg]' },
    { key: 'CRVAL2', val: metadata.center_coordinates.dec.toFixed(6), comment: 'Declination at reference pixel [deg]' },
    { key: 'CDELT1', val: (-(metadata.fov_arcmin / 60) / metadata.dimensions[0]).toFixed(8), comment: 'RA plate scale degrees/pixel' },
    { key: 'CDELT2', val: ((metadata.fov_arcmin / 60) / metadata.dimensions[1]).toFixed(8), comment: 'DEC plate scale degrees/pixel' },
    { key: 'CTYPE1', val: "'RA---TAN'", comment: 'Gnomonic projection Right Ascension' },
    { key: 'CTYPE2', val: "'DEC--TAN'", comment: 'Gnomonic projection Declination' },
    { key: 'RADESYS', val: "'ICRS'", comment: 'International Celestial Reference System' },
    { key: 'EQUINOX', val: '2000.0', comment: 'Equinox of celestial coordinates' },
    { key: 'PEAKFLUX', val: metadata.peak_flux.toFixed(3), comment: 'Maximum image pixel flux [MJy/sr]' },
    { key: 'MEANFLUX', val: metadata.mean_flux.toFixed(3), comment: 'Mean image pixel flux [MJy/sr]' },
    { key: 'RMSNOISE', val: metadata.rms_noise.toFixed(4), comment: 'Estimated 1-sigma background standard deviation' },
  ];

  const handleCopy = () => {
    const text = headerCards.map(c => `${c.key.padEnd(8)} = ${c.val.toString().padEnd(20)} / ${c.comment}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center space-x-2 text-primary">
            <FileCode className="w-4 h-4" />
            <h3 className="font-semibold text-sm text-text-main font-mono">
              FITS Primary Header Inspector (WCS & Metadata)
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-surface-elevated border border-surface-border hover:border-primary/50 text-xs font-mono text-secondary hover:text-text-main"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-scientific-success" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-text-muted hover:text-text-main hover:bg-surface-elevated"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="p-4 overflow-y-auto flex-1 font-mono text-xs space-y-1">
          <div className="bg-[#070B0E] p-4 rounded border border-surface-border space-y-1 overflow-x-auto text-[11px] leading-relaxed">
            {headerCards.map((c) => (
              <div key={c.key} className="flex">
                <span className="w-24 font-bold text-primary flex-shrink-0">{c.key}</span>
                <span className="text-text-muted mr-2">=</span>
                <span className="w-28 text-scientific-cyan flex-shrink-0">{c.val}</span>
                <span className="text-text-muted/60 mr-2">/</span>
                <span className="text-text-muted italic">{c.comment}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-surface-border bg-surface-elevated flex items-center justify-between text-xs text-text-muted font-mono">
          <span>Standard: IAU WCS / FITS v4.0</span>
          <span>SPHEREx Science Data Center (IPAC)</span>
        </div>
      </div>
    </div>
  );
};

