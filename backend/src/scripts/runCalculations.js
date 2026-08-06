require('dotenv').config();
const { calculateAll } = require('../services/calculationService');

(async () => {
  try {
    const rows = await calculateAll();
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
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();