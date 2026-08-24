// Full region names shown in reports and UI.
// Keys match the site code stored in the system (row.site).
export const REGION_FULL_NAMES = {
  'Köping': 'Nordic Manufacturing Hub',
  'NRV': 'New River Valley Assembly',
  'LVLC': 'Logistics & Distribution Center',
  'Macungie': 'Eastern Vehicle Assembly',
  'MEC': 'Modular Engineering Center',
  'RT100': 'Regional Operations Facility',
};

export const regionFullName = (site) => REGION_FULL_NAMES[site] || site || '—';