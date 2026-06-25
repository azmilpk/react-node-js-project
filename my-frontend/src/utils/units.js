const UNIT_BY_UTILITY = {
  water: 'Cubic Meters',
  electricity: 'kWh',
  'renewable electricity': 'kWh',
  'natural gas': 'kWh',
};

export function unitForUtility(utility) {
  if (!utility) return '-';
  return UNIT_BY_UTILITY[utility.trim().toLowerCase()] || '-';
}