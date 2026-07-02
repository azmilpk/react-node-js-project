const db = require('../config/db');

// 'YYYY-MM' -> previous month 'YYYY-MM'
function prevMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

const num = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);

// Build { V1: number, V2: number, ... } for one site/utility/month
function slotMap(siteId, utilityTypeId, month) {
  const rows = db.prepare(`
    SELECT ValueSlot, Consumption
    FROM GtoInvoices
    WHERE SiteId = ? AND UtilityTypeId = ? AND PostingDateMonth = ?
  `).all(siteId, utilityTypeId, month);
  const map = {};
  for (const r of rows) map[r.ValueSlot] = r.Consumption ?? 0;
  return map;
}

// One function per utility. cur = this month's slots, prev = last month's slots.
const FORMULAS = {
  Electricity({ cur }) {
    const v = (k) => num(cur[k]);
    // (V1 + V5 − V2 − V3 − V4) / 1000
    return { value: (v('V1') + v('V5') - v('V2') - v('V3') - v('V4')) / 1000, units: 'MWh', code: 'ELEC_STD' };
  },
  'District Heating'({ cur, prev }) {
    const c = (k) => num(cur[k]);
    const p = (k) => num(prev[k]);
    const V11 = c('V5') - p('V5');                                  // 85148787 delta
    const V12 = (c('V1') - p('V1')) + (c('V2') - p('V2')) + (c('V4') - p('V4'));
    const V13 = c('V13');                                           // E-hallen (Verklig_Energi)
    // NOTE: V3 (Kompressor) and V6 (degree-day factor) intentionally excluded
    return { value: V11 + V12 + V13, units: 'MWh', code: 'DH_STD' };
  },
  Water({ cur, prev }) {
    const c = (k) => num(cur[k]);
    const p = (k) => num(prev[k]);
    const mainDelta = (c('V1') - p('V1')) + (c('V2') - p('V2')) + (c('V3') - p('V3')) + (c('V4') - p('V4'));
    const coolingDelta = (c('V9') - p('V9')) + (c('V10') - p('V10')) + (c('V11') - p('V11')) + (c('V12') - p('V12'));
    // NOTE: process water V15–V18 not yet included (pending your confirmation)
    return { value: mainDelta - coolingDelta, units: 'm3', code: 'WATER_NET' };
  },
  LPG({ cur }) {
    // Source value is already energy in kWh, so just convert kWh -> MWh.
    return { value: num(cur['V1']) / 1000, units: 'MWh', code: 'LPG_STD' };
  },
  Diesel({ cur }) {
    return { value: num(cur['V1']), units: 'L', code: 'DIESEL_STD' };
  },
  'Produced Units'({ cur }) {
    return { value: num(cur['V1']), units: 'units', code: 'PRODUCED_STD' };
  },
};

// Utilities whose value is a month-over-month meter delta and therefore
// need a previous month as a baseline to be meaningful.
const DELTA_UTILITIES = new Set(['District Heating', 'Water']);

// Manual form entries land as DIRECT rows: a single, already-final value that
// is echoed straight through instead of being run through a meter formula.
const directStmt = db.prepare(`
  SELECT SourceEntryId, Consumption, Units FROM GtoInvoices
  WHERE SiteId = ? AND UtilityTypeId = ? AND PostingDateMonth = ? AND FormulaCode = 'DIRECT'
  ORDER BY Id DESC LIMIT 1
`);

// A form entry promoted via the "Generate UL Pure" button already exists in
// UlpureData as a Manual row; the calc engine must not create a duplicate.
const manualExistsStmt = db.prepare(`
  SELECT 1 FROM UlpureData
  WHERE SourceEntryId = ? AND DataSource = 'Manual' LIMIT 1
`);

function calculateAll() {
  const combos = db.prepare(`
    SELECT DISTINCT g.SiteId, g.UtilityTypeId, g.PostingDateMonth,
           s.SiteName, u.UtilityName
    FROM GtoInvoices g
    JOIN Sites s ON s.Id = g.SiteId
    JOIN UtilityTypes u ON u.Id = g.UtilityTypeId
    WHERE g.PostingDateMonth IS NOT NULL
    ORDER BY g.PostingDateMonth, s.SiteName, u.UtilityName
  `).all();

  const insert = db.prepare(`
    INSERT INTO UlpureData
      (PostingDateMonth, UtilityTypeId, SiteId, Utility, Site,
       Consumption, PreviousConsumptionUL, Units, UlpureStatus, FormulaCode, DataSource)
    VALUES (@month, @utilityTypeId, @siteId, @utility, @site,
            @value, @previous, @units, 'Validated', @code, 'Calculated')
  `);

  const results = [];
  db.transaction(() => {
    // Only recompute calculated rows; manual (form-generated) rows are left intact.
    db.prepare("DELETE FROM UlpureData WHERE DataSource = 'Calculated'").run();
    for (const c of combos) {
      const cur = slotMap(c.SiteId, c.UtilityTypeId, c.PostingDateMonth);
      const prev = slotMap(c.SiteId, c.UtilityTypeId, prevMonth(c.PostingDateMonth));

      let value;
      let units;
      let code;

      // Manual / form-entry rows are already final values -> pass straight through.
      const direct = directStmt.get(c.SiteId, c.UtilityTypeId, c.PostingDateMonth);
      if (direct) {
        // Skip if this form entry was already promoted via "Generate UL Pure"
        // (a Manual row exists) so we don't create a duplicate Calculated row.
        if (direct.SourceEntryId && manualExistsStmt.get(direct.SourceEntryId)) {
          results.push({ ...c, skipped: true, reason: 'already generated (manual row exists)' });
          continue;
        }
        value = Number(direct.Consumption) || 0;
        units = direct.Units || '';
        code = 'DIRECT';
      } else {
        const fn = FORMULAS[c.UtilityName];
        if (!fn) { results.push({ ...c, skipped: true }); continue; }

        // Delta-based utilities are unreliable without a baseline month.
        if (DELTA_UTILITIES.has(c.UtilityName) && Object.keys(prev).length === 0) {
          results.push({ ...c, skipped: true, reason: 'no baseline month' });
          continue;
        }

        ({ value, units, code } = fn({ cur, prev }));
      }

      // A negative consumption is never valid (usually missing source rows).
      if (value < 0) {
        results.push({ ...c, skipped: true, reason: 'negative (incomplete data)' });
        continue;
      }

      insert.run({
        month: c.PostingDateMonth,
        utilityTypeId: c.UtilityTypeId,
        siteId: c.SiteId,
        utility: c.UtilityName,
        site: c.SiteName,
        value,
        previous: null,
        units,
        code,
      });
      results.push({ ...c, value, units });
    }
  })();

  return results;
}

module.exports = { calculateAll, prevMonth };