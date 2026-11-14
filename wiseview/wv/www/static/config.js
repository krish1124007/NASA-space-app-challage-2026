/*
 * WiseView runtime configuration.
 *
 * Loaded before flash3.js. All values can be changed without touching the
 * viewer code. Local SPHEREx/Gaia routes are relative, so the same file works
 * on any host or port.
 */
window.WV_CONFIG = {
  // "spherex" (IRSA cutouts) or "unwise" (legacy public AWS frames).
  defaultInstrument: "spherex",

  // Local backend routes.
  spherexFramesUrl: "/api/spherex/frames",
  spherexGaiaUrl: "/api/gaia/cone",

  // Legacy unWISE endpoints. Kept as a fallback; no local index files needed.
  unwiseAnimationUrl: "https://vjxontvb73.execute-api.us-west-2.amazonaws.com/png-animation",
  unwiseMediaBase: "https://amnh-citsci-public.s3-us-west-2.amazonaws.com/",
  unwiseGaiaUrl: "https://n7z4i9pzx8.execute-api.us-west-2.amazonaws.com/prod/catalog/gaiadr2",

  // Detector wavelength ranges (microns), used for UI hints.
  detectorRanges: {
    D1: [0.75, 1.11],
    D2: [1.11, 1.64],
    D3: [1.64, 2.42],
    D4: [2.42, 3.82],
    D5: [3.82, 4.42],
    D6: [4.42, 5.00]
  }
};
