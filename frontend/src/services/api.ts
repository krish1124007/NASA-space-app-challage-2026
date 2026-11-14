import { Target, ObservationsResponse, SpectrumResponse, DifferenceResponse, DiscoveryItem } from '../types';

const API_BASE = '/api';

export const ApiService = {
  async health(): Promise<{ status: string; service: string; astropy_version: string }> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Backend health check failed');
    return res.json();
  },

  async getTargets(): Promise<Target[]> {
    const res = await fetch(`${API_BASE}/targets`);
    if (!res.ok) throw new Error('Failed to fetch targets');
    return res.json();
  },

  async getTargetDetails(targetId: string): Promise<Target> {
    const res = await fetch(`${API_BASE}/targets/${targetId}`);
    if (!res.ok) throw new Error(`Failed to fetch target ${targetId}`);
    return res.json();
  },

  async searchCoordinates(params: {
    query?: string;
    ra?: string;
    dec?: string;
    fov_arcmin?: number;
    channel?: number;
  }): Promise<{
    matched_target: Target | null;
    is_preconfigured: boolean;
    ra_deg: number;
    dec_deg: number;
    ra_sexagesimal: string;
    dec_sexagesimal: string;
    fov_arcmin: number;
    default_channel: number;
  }> {
    const res = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Coordinate parsing error' }));
      throw new Error(err.detail || 'Failed to search coordinates');
    }
    return res.json();
  },

  async getObservations(params: {
    target_id?: string;
    ra?: number;
    dec?: number;
    fov_arcmin?: number;
    channel?: number;
    stretch?: string;
    colormap?: string;
  }): Promise<ObservationsResponse> {
    const query = new URLSearchParams();
    if (params.target_id) query.append('target_id', params.target_id);
    if (params.ra !== undefined) query.append('ra', params.ra.toString());
    if (params.dec !== undefined) query.append('dec', params.dec.toString());
    if (params.fov_arcmin !== undefined) query.append('fov_arcmin', params.fov_arcmin.toString());
    if (params.channel !== undefined) query.append('channel', params.channel.toString());
    if (params.stretch) query.append('stretch', params.stretch);
    if (params.colormap) query.append('colormap', params.colormap);

    const res = await fetch(`${API_BASE}/observations?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load observations');
    return res.json();
  },

  async getDifferenceImage(params: {
    target_id?: string;
    ra?: number;
    dec?: number;
    fov_arcmin?: number;
    channel?: number;
    epoch1: number;
    epoch2: number;
    stretch?: string;
  }): Promise<DifferenceResponse> {
    const query = new URLSearchParams();
    if (params.target_id) query.append('target_id', params.target_id);
    if (params.ra !== undefined) query.append('ra', params.ra.toString());
    if (params.dec !== undefined) query.append('dec', params.dec.toString());
    if (params.fov_arcmin !== undefined) query.append('fov_arcmin', params.fov_arcmin.toString());
    if (params.channel !== undefined) query.append('channel', params.channel.toString());
    query.append('epoch1', params.epoch1.toString());
    query.append('epoch2', params.epoch2.toString());
    if (params.stretch) query.append('stretch', params.stretch);

    const res = await fetch(`${API_BASE}/difference?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to compute difference image');
    return res.json();
  },

  async getSpectrum(params: {
    target_id?: string;
    ra?: number;
    dec?: number;
  }): Promise<SpectrumResponse> {
    const query = new URLSearchParams();
    if (params.target_id) query.append('target_id', params.target_id);
    if (params.ra !== undefined) query.append('ra', params.ra.toString());
    if (params.dec !== undefined) query.append('dec', params.dec.toString());

    const res = await fetch(`${API_BASE}/spectrum?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch spectrum');
    return res.json();
  },

  async getDiscoveries(category?: string, sortBy: string = 'confidence_score'): Promise<DiscoveryItem[]> {
    const query = new URLSearchParams();
    if (category && category !== 'all') query.append('category', category);
    query.append('sort_by', sortBy);

    const res = await fetch(`${API_BASE}/discoveries?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch discoveries');
    return res.json();
  },

  async saveDiscovery(candidate: Partial<DiscoveryItem>): Promise<{ message: string; candidate: DiscoveryItem }> {
    const res = await fetch(`${API_BASE}/discoveries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidate),
    });
    if (!res.ok) throw new Error('Failed to save discovery candidate');
    return res.json();
  },

  getExportUrl(): string {
    return `${API_BASE}/discoveries/export`;
  },

  // -------------------------------------------------------------------------
  // WiseView Engine Integration: SPHEREx IRSA, Gaia TAP, Pan-STARRS & unWISE
  // -------------------------------------------------------------------------

  async getSpherexVisits(ra: number, dec: number, detector: string = 'D2', radiusDeg: number = 0.05): Promise<{
    ra: number;
    dec: number;
    detector: string;
    collection: string;
    count: number;
    visits: any[];
  }> {
    const res = await fetch(`${API_BASE}/spherex/visits?ra=${ra}&dec=${dec}&detector=${detector}&radius_deg=${radiusDeg}`);
    if (!res.ok) throw new Error('Failed to fetch SPHEREx visits from NASA IRSA');
    return res.json();
  },

  async getSpherexLiveFrames(params: {
    ra: number;
    dec: number;
    detector?: string;
    wavelength?: number;
    sizeArcsec?: number;
    stretch?: number;
    invert?: boolean;
    pixels?: number;
  }): Promise<{
    instrument: string;
    dataset: string;
    field_id: string;
    detector: string;
    wavelength_um: number | null;
    ims: string[];
    all_mjds: number[];
    mjds: number[][];
    epochs: number[][];
    min: number;
    max: number;
    CRPIX1: number;
    CRPIX2: number;
    CRVAL1: number;
    CRVAL2: number;
    pixscale: number;
    n_visits: number;
    wavelength_note?: string;
  }> {
    const query = new URLSearchParams();
    query.append('ra', params.ra.toString());
    query.append('dec', params.dec.toString());
    if (params.detector) query.append('detector', params.detector);
    if (params.wavelength) query.append('wavelength', params.wavelength.toString());
    if (params.sizeArcsec) query.append('size_arcsec', params.sizeArcsec.toString());
    if (params.stretch !== undefined) query.append('stretch', params.stretch.toString());
    if (params.invert !== undefined) query.append('invert', params.invert ? '1' : '0');
    if (params.pixels) query.append('pixels', params.pixels.toString());

    const res = await fetch(`${API_BASE}/spherex/frames?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to render live SPHEREx frames from NASA IRSA');
    return res.json();
  },

  async getGaiaCone(ra: number, dec: number, radiusDeg: number = 0.05): Promise<{
    ra: number;
    dec: number;
    radius_deg: number;
    count: number;
    sources: Array<{
      source_id: string | number;
      ra: number;
      dec: number;
      parallax: number | null;
      pmra: number | null;
      pmdec: number | null;
      phot_g_mean_mag: number | null;
    }>;
  }> {
    const res = await fetch(`${API_BASE}/gaia/cone?ra=${ra}&dec=${dec}&radius_deg=${radiusDeg}`);
    if (!res.ok) throw new Error('Failed to query Gaia DR3 catalog');
    return res.json();
  },

  async getGaiaCrossmatch(ra: number, dec: number, radiusArcmin: number = 6.0): Promise<any[]> {
    const res = await fetch(`${API_BASE}/crossmatch/gaia?ra=${ra}&dec=${dec}&radius_arcmin=${radiusArcmin}`);
    if (!res.ok) throw new Error('Failed to fetch Gaia crossmatch');
    return res.json();
  },

  async getPawnstars(ra: number, dec: number, size: number = 1024): Promise<{ url: string }> {
    const res = await fetch(`${API_BASE}/pawnstars?ra=${ra}&dec=${dec}&size=${size}`);
    if (!res.ok) throw new Error('Failed to query Pan-STARRS optical cutout');
    return res.json();
  }
};

