export interface Coordinates {
  ra_deg: number;
  dec_deg: number;
  ra_sexagesimal: string;
  dec_sexagesimal: string;
  epoch?: string;
}

export interface EpochData {
  epoch_id: string;
  obs_date: string;
  mjd: number;
  delta_pos_arcsec: [number, number];
  flux_mjy: number;
  quality_flag: number;
}

export interface Target {
  id: string;
  name: string;
  designations: string[];
  classification: string;
  description: string;
  coordinates: Coordinates;
  distance_ly?: number;
  proper_motion: {
    pm_ra_mas_yr: number;
    pm_dec_mas_yr: number;
    total_pm_arcsec_yr: number;
    motion_type: string;
  };
  category: 'moving' | 'variable';
  fov_arcmin: number;
  default_detector: string;
  default_channel: number;
  epochs: EpochData[];
  spectral_signature: string;
}

export interface ObservationMetadata {
  telescope: string;
  instrument: string;
  data_release: string;
  channel: number;
  detector: string;
  wavelength_um: number;
  fov_arcmin: number;
  pixel_scale_arcsec: number;
  dimensions: [number, number];
  center_coordinates: { ra: number; dec: number };
  background_flux_mjy_sr: number;
  peak_flux: number;
  mean_flux: number;
  rms_noise: number;
  quality_flags: {
    zodiacal_subtracted: boolean;
    cosmic_ray_masked: boolean;
    saturation_detected: boolean;
    stray_light_fraction: number;
  };
}

export interface ObservationEpoch {
  epoch_index: number;
  epoch_id: string;
  obs_date: string;
  mjd: number;
  image_url: string;
  flux_mjy: number;
  quality_flag: number;
  metadata: ObservationMetadata;
}

export interface DetectedCandidate {
  candidate_id: string;
  type: 'moving_object' | 'variable_source' | 'stationary';
  classification: string;
  ra_deg: number;
  dec_deg: number;
  ra_sexagesimal: string;
  dec_sexagesimal: string;
  pixel_x: number;
  pixel_y: number;
  angular_displacement_arcsec: number;
  confidence_score: number;
  snr: number;
  epochs_detected: number;
  status: string;
}

export interface ObservationsResponse {
  target_id?: string;
  target_name: string;
  ra_deg: number;
  dec_deg: number;
  fov_arcmin: number;
  channel: number;
  detector: string;
  wavelength_um: number;
  total_epochs: number;
  observations: ObservationEpoch[];
  detected_candidates: DetectedCandidate[];
}

export interface SpectralChannel {
  channel: number;
  detector: string;
  wavelength_um: number;
  bandwidth_um: number;
  resolving_power: number;
  flux_mjy: number | null;
  flux_err_mjy: number | null;
  snr: number | null;
  is_valid: boolean;
  status_flag: string;
}

export interface ReferenceFeature {
  name: string;
  wavelength_um: number;
  type: 'absorption' | 'emission';
  significance: string;
}

export interface SpectrumResponse {
  target_id?: string;
  target_name: string;
  spectral_signature: string;
  total_channels: number;
  valid_channels_count: number;
  peak_flux_mjy: number;
  min_flux_mjy: number;
  mean_flux_mjy: number;
  channels: SpectralChannel[];
  reference_features: ReferenceFeature[];
}

export interface DifferenceResponse {
  epoch1_index: number;
  epoch2_index: number;
  difference_image_url: string;
  stats: {
    rms_noise: number;
    max_positive_residual: number;
    min_negative_residual: number;
    snr_peak: number;
  };
}

export interface DiscoveryItem {
  id: string;
  name: string;
  target_field: string;
  ra_deg: number;
  dec_deg: number;
  ra_sexagesimal: string;
  dec_sexagesimal: string;
  category: 'moving_object' | 'variable_source' | 'unclassified';
  classification: string;
  angular_displacement_arcsec: number;
  proper_motion_arcsec_yr: number;
  brightness_mag_var: number;
  confidence_score: number;
  epochs_detected: number;
  status: string;
  date_flagged: string;
  notes: string;
}

export type ViewTab = 'overview' | 'explorer' | 'time-machine' | 'spectral' | 'discoveries' | 'about';

