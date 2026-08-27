// Generic demo site descriptions shown in reports and UI.
// Keys match the site code stored in the system (row.site).
export const REGION_FULL_NAMES = {
  'Alpha Plant': 'Demo Manufacturing Site A',
  'Bravo Plant': 'Demo Manufacturing Site B',
  'Charlie Plant': 'Demo Distribution Site',
  'Delta Plant': 'Demo Assembly Site',
  'Echo Plant': 'Demo Engineering Site',
  'Foxtrot Plant': 'Demo Operations Site',
};

export const regionFullName = (site) => REGION_FULL_NAMES[site] || site || '—';
