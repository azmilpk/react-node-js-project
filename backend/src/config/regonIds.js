// Regon (Region) id per site — shown in the UL Pure report's "Regon Id" column.
// Hardcoded on purpose: edit a value here when a RegonId changes, then restart
// the backend. Keys must match the site code stored in the data (row.Site).
module.exports = {
  ids: {
    'Köping': '64854062',
    'NRV': '64854091',
    'LVLC': '80262282',
    'Macungie': '64854089',
    'MEC': '76109541',
    'RT100': '80262304',
  },
  names: {
    'Köping': 'Köping',
    'NRV': 'New River Valley',
    'LVLC': 'Lehigh Valley Logistics Center',
    'Macungie': 'Macungie Vehicle Assembly',
    'MEC': 'Mack Experience Center',
    'RT100': 'Route 100 Methods Lab',
  },
};
