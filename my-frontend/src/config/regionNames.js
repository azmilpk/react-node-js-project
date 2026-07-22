// Full region names shown ONLY in the UL Pure pages.
// Keys must match the site/region code stored in the data (row.site).
export const REGION_FULL_NAMES = {
  'Köping': 'Köping',
  'NRV': 'New River Valley',
  'LVLC': 'Lehigh Valley Logistics Center',
  'Macungie': 'Macungie',
  'MEC': 'Mack Experience Center',
  'RT100': 'RT100',
};

export const regionFullName = (site) => REGION_FULL_NAMES[site] || site || '—';