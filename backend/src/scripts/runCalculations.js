require('dotenv').config();
const { calculateAll } = require('../services/calculationService');

const rows = calculateAll();
console.log(`Calculated ${rows.length} site/utility/month rows`);
console.table(rows.map((r) => ({
  month: r.PostingDateMonth,
  site: r.SiteName,
  utility: r.UtilityName,
  value: r.value,
  units: r.units,
  skipped: r.skipped || false,
})));
process.exit(0);