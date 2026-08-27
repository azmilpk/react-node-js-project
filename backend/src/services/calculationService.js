const db = require('../config/db');
const { ids: REPORT_REFERENCES, names: SITE_NAMES } = require('../config/regonIds');

const prevMonth = (month) => {
  const [year, value] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, value - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const FORMULA_DESCRIPTIONS = {
  SUM_VALIDATED: 'Sum of validated source readings for the site, utility, and reporting month.',
};

// Public demo builds do not include organization-specific aggregate rules.
const AGGREGATE_SUM_UTILITIES = [];

const calculateAll = async ({ site } = {}) => {
  const siteRow = site
    ? await db.get('SELECT Id FROM Sites WHERE SiteName = ?', [site])
    : null;
  if (site && !siteRow) return [];

  const combinations = await db.all(
    `SELECT g.SiteId, g.UtilityTypeId, g.PostingDateMonth AS month,
            s.SiteName, u.UtilityName
       FROM Gto_Invoices g
       JOIN Sites s ON s.Id = g.SiteId
       LEFT JOIN UtilityTypes u ON u.Id = g.UtilityTypeId
      WHERE g.PostingDateMonth IS NOT NULL
        AND g.Hitl IN ('Validated', 'Modified and Validated')
        ${siteRow ? 'AND g.SiteId = ?' : ''}
      GROUP BY g.SiteId, g.UtilityTypeId, g.PostingDateMonth, s.SiteName, u.UtilityName
      ORDER BY g.PostingDateMonth, s.SiteName, u.UtilityName`,
    siteRow ? [siteRow.Id] : []
  );

  const results = [];
  await db.transaction(async (transaction) => {
    for (const combination of combinations) {
      const reading = await transaction.get(
        `SELECT COALESCE(SUM(CAST(Consumption AS FLOAT)), 0) AS total,
                MAX(Units) AS units
           FROM Gto_Invoices
          WHERE SiteId = ? AND UtilityTypeId = ? AND PostingDateMonth = ?
            AND Hitl IN ('Validated', 'Modified and Validated')`,
        [combination.SiteId, combination.UtilityTypeId, combination.month]
      );

      const existing = await transaction.get(
        `SELECT Id FROM tbl_ulpure_data
          WHERE SiteId = ? AND UtilityTypeId = ? AND PostingDateMonth = ?
            AND DataSource = 'Calculated' AND FormulaCode = 'SUM_VALIDATED'`,
        [combination.SiteId, combination.UtilityTypeId, combination.month]
      );

      const record = {
        month: combination.month,
        utilityTypeId: combination.UtilityTypeId,
        siteId: combination.SiteId,
        utility: combination.UtilityName || 'Utility',
        site: combination.SiteName,
        value: String(Number(reading.total) || 0),
        units: reading.units || '',
        indicator: `${combination.UtilityName || 'Utility'} consumption`,
        reference: REPORT_REFERENCES[combination.SiteName] || null,
        siteName: SITE_NAMES[combination.SiteName] || combination.SiteName,
      };

      if (existing) {
        await transaction.run(
          `UPDATE tbl_ulpure_data
              SET Consumption = @value, Units = @units, Utility = @utility,
                  Site = @site, [Indicator Name] = @indicator
            WHERE Id = @id`,
          { ...record, id: existing.Id }
        );
      } else {
        await transaction.run(
          `INSERT INTO tbl_ulpure_data
            (PostingDateMonth, UtilityTypeId, SiteId, Utility, Site, Consumption,
             Units, ulpure_status, FormulaCode, [Indicator Name], DataSource,
             [Region ID], [Region Name], date)
           VALUES
            (@month, @utilityTypeId, @siteId, @utility, @site, @value,
             @units, 'Validate', 'SUM_VALIDATED', @indicator, 'Calculated',
             @reference, @siteName, CAST(GETDATE() AS date))`,
          record
        );
      }

      results.push({ ...combination, value: Number(record.value), units: record.units });
    }
  });
  return results;
};

module.exports = { calculateAll, prevMonth, FORMULA_DESCRIPTIONS, AGGREGATE_SUM_UTILITIES };
