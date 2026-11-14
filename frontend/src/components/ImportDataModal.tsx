import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Database, 
  Globe, 
  Check, 
  AlertCircle, 
  FileCode, 
  Compass, 
  ExternalLink,
  Layers,
  ArrowRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { ApiService } from '../services/api';

interface ImportDataModalProps {
  onClose: () => void;
  onLoadCustomFits: (data: {
    imageUrl: string;
    ra: number;
    dec: number;
    fovArcmin: number;
    targetName: string;
    metadata: any;
  }) => void;
  activeCoords: { ra: number; dec: number };
}

type ImportTab = 'irsa' | 'upload' | 'gaia' | 'guide';

export const ImportDataModal: React.FC<ImportDataModalProps> = ({
  onClose,
  onLoadCustomFits,
  activeCoords,
}) => {
  const [activeTab, setActiveTab] = useState<ImportTab>('irsa');

  // Tab 1: NASA IRSA Query states
  const [irsaRa, setIrsaRa] = useState<string>(activeCoords.ra.toFixed(4));
  const [irsaDec, setIrsaDec] = useState<string>(activeCoords.dec.toFixed(4));
  const [irsaMission, setIrsaMission] = useState<string>('spherex');
  const [irsaFov, setIrsaFov] = useState<number>(10.0);
  const [irsaResult, setIrsaResult] = useState<any>(null);
  const [irsaLoading, setIrsaLoading] = useState<boolean>(false);

  // Tab 2: Upload FITS states
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab 3: Gaia & Multi-Mission Crossmatch states
  const [gaiaStars, setGaiaStars] = useState<any[]>([]);
  const [gaiaLoading, setGaiaLoading] = useState<boolean>(false);

  // Trigger IRSA query
  const handleQueryIrsa = async (e: React.FormEvent) => {
    e.preventDefault();
    setIrsaLoading(true);
    try {
      const res = await fetch('/api/import/irsa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ra: parseFloat(irsaRa),
          dec: parseFloat(irsaDec),
          mission: irsaMission,
          fov_arcmin: irsaFov,
        })
      });
      const data = await res.json();
      setIrsaResult(data);
    } catch (err: any) {
      alert(`IRSA Query Error: ${err.message}`);
    } finally {
      setIrsaLoading(false);
    }
  };

  // Trigger FITS file upload
  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.fits') && !file.name.toLowerCase().endsWith('.fit')) {
      setUploadError('Please select a valid astronomical FITS file (.fits or .fit).');
      return;
    }

    setUploadLoading(true);
    setUploadError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import/fits', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to parse FITS file');
      }
      const data = await res.json();
      setUploadResult(data);
    } catch (err: any) {
      setUploadError(err.message || 'Error processing FITS file');
    } finally {
      setUploadLoading(false);
    }
  };

  // Handle Gaia Crossmatch
  const handleLoadGaia = async () => {
    setGaiaLoading(true);
    try {
      const res = await fetch(`/api/crossmatch/gaia?ra=${activeCoords.ra}&dec=${activeCoords.dec}&radius_arcmin=10.0`);
      const data = await res.json();
      setGaiaStars(data);
    } catch (err) {
      console.error(err);
    } finally {
      setGaiaLoading(false);
    }
  };

  const handleApplyUploadedFits = () => {
    if (!uploadResult) return;
    onLoadCustomFits({
      imageUrl: uploadResult.image_url,
      ra: uploadResult.center_coordinates.ra_deg,
      dec: uploadResult.center_coordinates.dec_deg,
      fovArcmin: uploadResult.fov_arcmin,
      targetName: uploadResult.filename,
      metadata: {
        telescope: uploadResult.telescope,
        instrument: uploadResult.instrument,
        data_release: 'User FITS Import',
        channel: 1,
        detector: 'D1-Custom',
        wavelength_um: 2.5,
        fov_arcmin: uploadResult.fov_arcmin,
        pixel_scale_arcsec: 6.2,
        dimensions: uploadResult.dimensions,
        center_coordinates: {
          ra: uploadResult.center_coordinates.ra_deg,
          dec: uploadResult.center_coordinates.dec_deg,
        },
        background_flux_mjy_sr: uploadResult.mean_flux,
        peak_flux: uploadResult.peak_flux,
        mean_flux: uploadResult.mean_flux,
        rms_noise: uploadResult.rms_noise,
        quality_flags: {
          zodiacal_subtracted: true,
          cosmic_ray_masked: true,
          saturation_detected: false,
          stray_light_fraction: 0.0,
        }
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-lg max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center space-x-2 text-primary font-sans">
            <Database className="w-4 h-4" />
            <h3 className="font-semibold text-sm text-text-main">
              Import Astronomical Data from NASA Archives
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-text-muted hover:text-text-main hover:bg-surface-elevated"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-surface-border bg-surface-elevated/50 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('irsa')}
            className={`pb-2 px-3 flex items-center space-x-1.5 border-b-2 font-medium transition-colors ${
              activeTab === 'irsa'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-main'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>1. NASA IRSA Query</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2 px-3 flex items-center space-x-1.5 border-b-2 font-medium transition-colors ${
              activeTab === 'upload'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-main'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>2. Upload FITS File</span>
          </button>
          <button
            onClick={() => { setActiveTab('gaia'); if (!gaiaStars.length) handleLoadGaia(); }}
            className={`pb-2 px-3 flex items-center space-x-1.5 border-b-2 font-medium transition-colors ${
              activeTab === 'gaia'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-main'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3. Gaia & WISE Overlay</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2 px-3 flex items-center space-x-1.5 border-b-2 font-medium transition-colors ${
              activeTab === 'guide'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-main'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>4. Python / API Guide</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: NASA IRSA Live Query */}
          {activeTab === 'irsa' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-text-main font-sans">
                  Query NASA Infrared Science Archive (IRSA)
                </h4>
                <p className="text-xs text-text-muted font-sans mt-0.5">
                  Direct connection to Caltech/IPAC IRSA protocols (SIA2, Cutout Service, and Image Box Extractor).
                </p>
              </div>

              <form onSubmit={handleQueryIrsa} className="space-y-3 bg-surface-elevated p-4 rounded border border-surface-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-text-muted">Right Ascension (RA deg):</label>
                    <input
                      type="text"
                      value={irsaRa}
                      onChange={(e) => setIrsaRa(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-surface border border-surface-border text-xs text-text-main focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-text-muted">Declination (DEC deg):</label>
                    <input
                      type="text"
                      value={irsaDec}
                      onChange={(e) => setIrsaDec(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-surface border border-surface-border text-xs text-text-main focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-text-muted">Mission / Archive:</label>
                    <select
                      value={irsaMission}
                      onChange={(e) => setIrsaMission(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-surface border border-surface-border text-xs text-text-main"
                    >
                      <option value="spherex">NASA SPHEREx (102 Infrared Bands)</option>
                      <option value="wise">NASA AllWISE (Backyard Worlds Epochs)</option>
                      <option value="2mass">2MASS All-Sky (Near-IR J/H/Ks)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-text-muted">Field of View (FOV):</label>
                    <select
                      value={irsaFov}
                      onChange={(e) => setIrsaFov(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded bg-surface border border-surface-border text-xs text-text-main"
                    >
                      <option value={5}>5 arcminutes (High Resolution)</option>
                      <option value={10}>10 arcminutes (Standard)</option>
                      <option value={15}>15 arcminutes (Wide Field)</option>
                      <option value={30}>30 arcminutes (Fast Asteroid Search)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={irsaLoading}
                  className="w-full py-2 rounded bg-primary hover:bg-primary-hover text-[#0B1016] font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50 font-sans"
                >
                  {irsaLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Contacting IRSA Servers...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5" />
                      <span>Query IRSA SIA2 Protocol</span>
                    </>
                  )}
                </button>
              </form>

              {/* IRSA Result Card */}
              {irsaResult && (
                <div className="space-y-3 p-4 rounded bg-[#070B0E] border border-surface-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-scientific-success font-semibold flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>Connection Established: {irsaResult.archive}</span>
                    </span>
                    <span className="text-secondary">{irsaResult.mission}</span>
                  </div>

                  <div className="space-y-1 text-[11px] text-text-muted">
                    <div className="flex justify-between">
                      <span>SIA2 Endpoint:</span>
                      <span className="text-primary truncate max-w-sm">{irsaResult.protocols.sia2_endpoint}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cutout API:</span>
                      <span className="text-scientific-cyan truncate max-w-sm">{irsaResult.protocols.ibe_cutout_service}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-surface-border text-[11px] text-text-muted space-y-1">
                    <span className="font-semibold text-text-main block">Available Spectro-Spatial Cubes:</span>
                    {irsaResult.available_bands.map((b: any) => (
                      <div key={b.band} className="flex justify-between p-1 rounded bg-surface border border-surface-border">
                        <span className="text-text-main">{b.band}</span>
                        <span className="text-secondary">{b.wavelength} ({b.format})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Upload FITS File */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-text-main font-sans">
                  Direct FITS File Upload (.fits / .fit)
                </h4>
                <p className="text-xs text-text-muted font-sans mt-0.5">
                  Upload any raw FITS image or spectral cutout downloaded from NASA IRSA, MAST, or CDS. 
                  Astropy will extract the WCS header, calibrating celestial coordinates in real time.
                </p>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center space-y-2 ${
                  dragActive
                    ? 'border-primary bg-primary/10'
                    : 'border-surface-border bg-surface-elevated/40 hover:border-primary/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".fits,.fit"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-primary" />
                <span className="text-xs font-semibold text-text-main font-sans">
                  Drag and drop a FITS file here, or click to browse
                </span>
                <span className="text-[11px] text-text-muted">
                  Supports NASA SPHEREx, WISE, Spitzer, Hubble, JWST, and 2MASS FITS arrays
                </span>
              </div>

              {uploadLoading && (
                <div className="flex items-center justify-center space-x-2 p-4 text-xs text-primary">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Parsing FITS header with Astropy...</span>
                </div>
              )}

              {uploadError && (
                <div className="p-3 rounded bg-scientific-danger/10 border border-scientific-danger/30 text-scientific-danger text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Upload Result Preview */}
              {uploadResult && (
                <div className="p-4 rounded bg-[#070B0E] border border-surface-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-text-main text-xs">{uploadResult.filename}</span>
                      <p className="text-[10px] text-text-muted">{uploadResult.telescope} · {uploadResult.instrument}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-scientific-success/10 text-scientific-success border border-scientific-success/30 font-semibold">
                      {uploadResult.has_wcs ? 'WCS Valid' : 'No WCS'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="bg-surface p-2 rounded border border-surface-border">
                      <span className="text-text-muted text-[10px] block">Dimensions:</span>
                      <span className="text-text-main font-semibold">{uploadResult.dimensions[0]} × {uploadResult.dimensions[1]}</span>
                    </div>
                    <div className="bg-surface p-2 rounded border border-surface-border">
                      <span className="text-text-muted text-[10px] block">Center RA:</span>
                      <span className="text-primary font-semibold">{uploadResult.center_coordinates.ra_deg}°</span>
                    </div>
                    <div className="bg-surface p-2 rounded border border-surface-border">
                      <span className="text-text-muted text-[10px] block">Center DEC:</span>
                      <span className="text-primary font-semibold">{uploadResult.center_coordinates.dec_deg}°</span>
                    </div>
                    <div className="bg-surface p-2 rounded border border-surface-border">
                      <span className="text-text-muted text-[10px] block">Field of View:</span>
                      <span className="text-scientific-cyan font-semibold">{uploadResult.fov_arcmin}′</span>
                    </div>
                  </div>

                  <button
                    onClick={handleApplyUploadedFits}
                    className="w-full py-2 rounded bg-scientific-success hover:bg-scientific-success/90 text-[#0B1016] font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5 font-sans"
                  >
                    <span>Load Directly into Sky Explorer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Gaia & Multi-Mission Cross-Matching */}
          {activeTab === 'gaia' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-text-main font-sans">
                    Gaia DR3 Astrometric Reference Stars
                  </h4>
                  <p className="text-xs text-text-muted font-sans mt-0.5">
                    Overlay ESA Gaia DR3 proper motion vectors ($\mu_\alpha, \mu_\delta$) on top of SPHEREx observations to differentiate stationary stars from fast moving asteroids.
                  </p>
                </div>
                <button
                  onClick={handleLoadGaia}
                  disabled={gaiaLoading}
                  className="px-2.5 py-1 rounded bg-surface-elevated border border-surface-border hover:border-primary/50 text-xs text-primary flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3 h-3 ${gaiaLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Field</span>
                </button>
              </div>

              {gaiaLoading ? (
                <div className="text-center py-8 text-text-muted text-xs">
                  Querying Gaia DR3 astrometric catalog...
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-surface-border rounded bg-[#070B0E]">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-surface-elevated border-b border-surface-border text-text-muted">
                      <tr>
                        <th className="p-2">Gaia DR3 Source</th>
                        <th className="p-2">RA / DEC (deg)</th>
                        <th className="p-2 text-right">G Mag</th>
                        <th className="p-2 text-right">Total PM (mas/yr)</th>
                        <th className="p-2 text-right">Dist (pc)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border text-secondary">
                      {gaiaStars.map((s) => (
                        <tr key={s.source_id} className="hover:bg-surface-card">
                          <td className="p-2 font-semibold text-primary">{s.source_id}</td>
                          <td className="p-2">{s.ra_deg.toFixed(4)}, {s.dec_deg.toFixed(4)}</td>
                          <td className="p-2 text-right text-text-main">{s.g_mag}</td>
                          <td className="p-2 text-right text-scientific-cyan">{s.total_pm_mas_yr}</td>
                          <td className="p-2 text-right text-text-muted">{s.dist_pc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Python & Programmatic API Ingest Guide */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-text-main font-sans">
                  How to Ingest SPHEREx Data Programmatically
                </h4>
                <p className="text-xs text-text-muted font-sans mt-0.5">
                  NASA provides access through PyVO and Astroquery. Below is the exact Python code used by our backend to ingest and process SPHEREx cutouts:
                </p>
              </div>

              <div className="p-3.5 rounded bg-[#070B0E] border border-surface-border font-mono text-[11px] leading-relaxed text-secondary overflow-x-auto space-y-2">
                <div className="text-scientific-cyan"># 1. Query NASA IRSA SIA2 Protocol using PyVO</div>
                <div className="text-text-main">import pyvo as vo</div>
                <div>service = vo.dal.SIAService('https://irsa.ipac.caltech.edu/SIA')</div>
                <div>results = service.search(pos=(133.795, -7.245), size=0.15)</div>
                <br />
                <div className="text-scientific-cyan"># 2. Extract 2D FITS and Astrometry using Astropy</div>
                <div className="text-text-main">from astropy.io import fits</div>
                <div className="text-text-main">from astropy.wcs import WCS</div>
                <div>with fits.open(results[0].getdataurl()) as hdul:</div>
                <div className="pl-4">data = hdul[0].data # [102, 256, 256] 3D cube</div>
                <div className="pl-4">wcs = WCS(hdul[0].header)</div>
                <br />
                <div className="text-scientific-cyan"># 3. Temporal Difference Imaging</div>
                <div>diff = epoch2_data - epoch1_data</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-border bg-surface-elevated flex justify-between items-center text-xs text-text-muted font-mono">
          <span>NASA IRSA / SPHEREx Ingest Pipeline</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-surface border border-surface-border hover:border-primary/50 text-text-main text-xs font-sans"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
