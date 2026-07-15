const db = require('../config/db');
const { logChange } = require('./auditService');

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
    // V1 = total (A+T) electricity, already in MWh. V2/V3/V4 = charging-station
    // meters (kWh) that are excluded; V5 = E-hallen meter (kWh) that is included.
    // Convert the kWh meters to MWh, then combine with the MWh total.
    return { value: v('V1') + (v('V5') - v('V2') - v('V3') - v('V4')) / 1000, units: 'MWh', code: 'ELEC_STD' };
  },
  'District Heating'({ cur, prev }) {
    const c = (k) => num(cur[k]);
    const p = (k) => num(prev[k]);
    const V11 = c('V5') - p('V5');                                  // 85148787 delta
    const V12 = (c('V1') - p('V1')) + (c('V2') - p('V2')) + (c('V4') - p('V4'));
    const V13 = c('V13');                                           // E-hallen (Verklig_Energi)
    // NOTE: V3 (Kompressor) and V6 (degree-day factor) excluded from the purchased-heat total.
    // Value 9 = compressor heat-recovery delta (V3) is reported separately as recovered energy.
    const recoveredEnergy = c('V3') - p('V3');
    return [
      { indicator: 'Purchased heat/steam - Heating / Cooling', value: V11 + V12 + V13, units: 'MWh', code: 'DH_STD' },
      { indicator: 'Recovered or converted energy', value: recoveredEnergy, units: 'MWh', code: 'RECOVERED_ENERGY', utility: 'Recovered or converted energy' },
    ];
  },
  Water({ cur, prev }) {
    const c = (k) => num(cur[k]);
    const p = (k) => num(prev[k]);

    // Water slots as stored in GtoInvoices:
    //   V1–V4  main incoming meters      V9–V12 cooling meters
    //   V15 GKN waste   V16 Stena Fosfat.  V17 Stena Emuls.  V18 E-hallen m3
    const FRESH = 0.9;   // 90% fresh-water share (spec Value 19)
    const EVAP = 1.25;   // 25% evaporation factor (spec Value 24)

    // #1 City water, Water use in process excluded cooling
    const mainDelta = (c('V1') - p('V1')) + (c('V2') - p('V2')) + (c('V3') - p('V3')) + (c('V4') - p('V4'));
    const coolingDeltaAll = (c('V9') - p('V9')) + (c('V10') - p('V10')) + (c('V11') - p('V11')) + (c('V12') - p('V12'));
    const excludedCooling = mainDelta - coolingDeltaAll;

    // #2 City water, Cooling of process (Kyltorn T = V9+V11+V12 delta; Kyltorn A not present)
    const coolingOfProcess = (c('V9') - p('V9')) + (c('V11') - p('V11')) + (c('V12') - p('V12'));

    // #4 Water used in process = (GKN*0.9 + StenaFosf + StenaEmul*0.9) * 1.25
    const value20 = c('V15') * FRESH;
    const value23 = c('V16') + c('V17') * FRESH;
    const waterUsedInProcess = (value20 + value23) * EVAP;

    // #5 Domestic water use = total - waterUsedInProcess - cooling(A+T)
    //    total (V101) = coolingOfProcess + excludedCooling + E-hallen
    const eHallen = c('V18');
    const total = coolingOfProcess + excludedCooling + eHallen;
    const domesticWater = total - waterUsedInProcess - coolingOfProcess;

    // #6 Water Discharge = GKN discharge (Value20) + domestic
    const waterDischarge = value20 + domesticWater;

    return [
      { indicator: 'City water, Water use in process excluded cooling', value: excludedCooling, units: 'm3', code: 'WATER_NET' },
      { indicator: 'City water, Cooling of process', value: coolingOfProcess, units: 'm3', code: 'WATER_COOL' },
      { indicator: 'Water used in process', value: waterUsedInProcess, units: 'm3', code: 'WATER_PROC' },
      { indicator: 'Domestic water use', value: domesticWater, units: 'm3', code: 'WATER_DOM' },
      { indicator: 'Water Discharge', value: waterDischarge, units: 'm3', code: 'WATER_DISCH' },
    ];
  },
     LPG({ cur }) {
    // V1 = LPG mass in KG. 12900 kWh per tonne -> divide kg by 1000 for tonnes,
    // then /1000 again to convert kWh -> MWh, i.e. * 12900 / 1_000_000.
    // Rounded to 3 decimals (1680.2895 -> 1680.29).
    const mwh = (num(cur['V1']) * 12900) / 1_000_000;
    return { value: Math.round(mwh * 1000) / 1000, units: 'MWh', code: 'LPG_STD' };
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

// Official ESG indicator metadata, keyed by the formula code each output uses.
// This drives the Indicator Name / Indicator Id / Units shown in UL Pure so the
// stored rows match the reporting system exactly.
const INDICATOR_META = {
  ELEC_STD:     { id: '64885465', name: 'Purchased electricity - Process', units: 'MWh' },
  DH_STD:       { id: '64885478', name: 'Purchased heat/steam - Heating / Cooling', units: 'MWh' },
  RECOVERED_ENERGY: { id: '64885489', name: 'Recovered or converted energy', units: 'MWh' },
  WATER_NET:    { id: '64886067', name: 'City water, Water use in process excluded cooling', units: 'cubic meters' },
  WATER_COOL:   { id: '64886068', name: 'City water, Cooling of process', units: 'cubic meters' },
  WATER_PROC:   { id: '64886067', name: 'Water used in process', units: 'cubic meters' },
  WATER_DOM:    { id: '71136904', name: 'City water, Domestic water use', units: 'cubic meters' },
  WATER_DISCH:  { id: '80077162', name: 'Water sent to a municipal, or similar, water treatment facility', units: 'cubic meters' },
  LPG_STD:      { id: '65141617', name: 'LPG_Indicator', units: 'MWh' },
  PRODUCED_STD: { id: '65245956', name: 'Gearbox', units: 'Number' },
  DIESEL_STD:   { id: '65143046', name: 'Diesel Volvo STD - Internal Transports in Energy', units: 'MWh' },
};

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

  // Upsert on the natural key (site + utility + month) so a recalculated row
  // keeps its Id — and therefore its audit history — instead of being deleted
  // and re-inserted with a fresh Id every run.
  const findCalcRow = db.prepare(`
    SELECT Id, Consumption FROM UlpureData
    WHERE SiteId = ? AND UtilityTypeId = ? AND PostingDateMonth = ? AND DataSource = 'Calculated' AND FormulaCode = ?
    LIMIT 1
  `);

  const insertCalc = db.prepare(`
    INSERT INTO UlpureData
      (PostingDateMonth, UtilityTypeId, SiteId, Utility, Site,
       Consumption, PreviousConsumptionUL, Units, UlpureStatus, FormulaCode, IndicatorName, IndicatorId, DataSource)
    VALUES (@month, @utilityTypeId, @siteId, @utility, @site,
            @value, @previous, @units, 'Validate', @code, @indicator, @indicatorId, 'Calculated')
  `);

  const updateCalc = db.prepare(`
    UPDATE UlpureData
    SET Utility = @utility, Site = @site, Consumption = @value,
        Units = @units, FormulaCode = @code, IndicatorName = @indicator, IndicatorId = @indicatorId
    WHERE Id = @id
  `);

  const results = [];
  const dieselType = db
    .prepare("SELECT Id FROM UtilityTypes WHERE UtilityName = 'Diesel'")
    .get();
  db.transaction(() => {
    const keptIds = [];
    // Track which site+month combos produced output so we can guarantee a
    // Diesel line (actual value or 0) for each of them below.
    const emittedSiteMonths = new Map(); // `${SiteId}|${month}` -> SiteName
    for (const c of combos) {
      // Diesel is handled entirely by the guaranteed-row pass after this loop
      // (a single row per site+month using its actual V1 value, or 0 when there
      // is no data), so skip it here to avoid producing a duplicate Diesel row.
      if (c.UtilityName === 'Diesel') continue;
      const cur = slotMap(c.SiteId, c.UtilityTypeId, c.PostingDateMonth);
      const prev = slotMap(c.SiteId, c.UtilityTypeId, prevMonth(c.PostingDateMonth));

      // Each combo can produce one or more indicator rows (e.g. Water emits
      // several). Normalize every path to a list of { indicator, value, units, code }.
      let outputs;

      // Manual / form-entry rows are already final values -> pass straight through.
      const direct = directStmt.get(c.SiteId, c.UtilityTypeId, c.PostingDateMonth);
      if (direct) {
        // Skip if this form entry was already promoted via "Generate UL Pure"
        // (a Manual row exists) so we don't create a duplicate Calculated row.
        if (direct.SourceEntryId && manualExistsStmt.get(direct.SourceEntryId)) {
          results.push({ ...c, skipped: true, reason: 'already generated (manual row exists)' });
          continue;
        }
        outputs = [{
          indicator: c.UtilityName,
          value: Number(direct.Consumption) || 0,
          units: direct.Units || '',
          code: 'DIRECT',
        }];
      } else {
        const fn = FORMULAS[c.UtilityName];
        if (!fn) { results.push({ ...c, skipped: true }); continue; }

        // Delta-based utilities are unreliable without a baseline month.
        if (DELTA_UTILITIES.has(c.UtilityName) && Object.keys(prev).length === 0) {
          results.push({ ...c, skipped: true, reason: 'no baseline month' });
          continue;
        }

        const res = fn({ cur, prev });
        outputs = Array.isArray(res) ? res : [res];
      }

      for (const o of outputs) {
        // A negative consumption is never valid (usually missing source rows).
        if (o.value < 0) {
          results.push({ ...c, indicator: o.indicator, skipped: true, reason: 'negative (incomplete data)' });
          continue;
        }

        // Round every stored value to 3 decimals so results are consistent
        // (e.g. LPG 1680.2895 -> 1680.29) instead of carrying float tails.
        const value = Math.round(o.value * 1000) / 1000;
        // Official indicator name / id / units come from the metadata map when
        // the output has a known formula code; otherwise fall back to raw values.
        const meta = INDICATOR_META[o.code] || {};
        const indicatorName = meta.name || o.indicator || c.UtilityName;
        const indicatorId = meta.id || null;
        const units = meta.units || o.units;

        const existing = findCalcRow.get(c.SiteId, c.UtilityTypeId, c.PostingDateMonth, o.code);
        if (existing) {
          // Record recalculated changes so they surface in the History panel.
          if (Number(existing.Consumption) !== value) {
            logChange({
              tableName: 'UlpureData',
              recordId: existing.Id,
              fieldName: 'Consumption',
              oldValue: existing.Consumption,
              newValue: value,
              changedBy: 'System (recalc)',
            });
          }
          updateCalc.run({
            id: existing.Id,
            utility: o.utility || c.UtilityName,
            site: c.SiteName,
            value,
            units,
            code: o.code,
            indicator: indicatorName,
            indicatorId,
          });
          keptIds.push(existing.Id);
        } else {
          const res = insertCalc.run({
            month: c.PostingDateMonth,
            utilityTypeId: c.UtilityTypeId,
            siteId: c.SiteId,
            utility: o.utility || c.UtilityName,
            site: c.SiteName,
            value,
            previous: null,
            units,
            code: o.code,
            indicator: indicatorName,
            indicatorId,
          });
          keptIds.push(res.lastInsertRowid);
        }
        results.push({ ...c, indicator: indicatorName, value, units });
        emittedSiteMonths.set(`${c.SiteId}|${c.PostingDateMonth}`, c.SiteName);
      }
    }

    // Diesel has no meter formula. Guarantee exactly one Diesel indicator row
    // per site+month, showing its actual V1 value when data exists (e.g. an
    // entered/imported value) and 0 otherwise.
    if (dieselType) {
      const meta = INDICATOR_META.DIESEL_STD;
      // Targets: every site+month that produced output, plus any month that
      // actually has Diesel source data (so an entered value still shows).
      const dieselTargets = new Map(emittedSiteMonths);
      for (const c of combos) {
        if (c.UtilityName === 'Diesel') {
          dieselTargets.set(`${c.SiteId}|${c.PostingDateMonth}`, c.SiteName);
        }
      }
      for (const [key, siteName] of dieselTargets) {
        const [siteIdStr, month] = key.split('|');
        const siteId = Number(siteIdStr);
        const slots = slotMap(siteId, dieselType.Id, month);
        const value = Math.round(num(slots['V1']) * 1000) / 1000;
        const existing = findCalcRow.get(siteId, dieselType.Id, month, 'DIESEL_STD');
        if (existing) {
          if (Number(existing.Consumption) !== value) {
            logChange({
              tableName: 'UlpureData',
              recordId: existing.Id,
              fieldName: 'Consumption',
              oldValue: existing.Consumption,
              newValue: value,
              changedBy: 'System (recalc)',
            });
          }
          updateCalc.run({
            id: existing.Id,
            utility: 'Diesel',
            site: siteName,
            value,
            units: meta.units,
            code: 'DIESEL_STD',
            indicator: meta.name,
            indicatorId: meta.id,
          });
          keptIds.push(existing.Id);
        } else {
          const r = insertCalc.run({
            month,
            utilityTypeId: dieselType.Id,
            siteId,
            utility: 'Diesel',
            site: siteName,
            value,
            previous: null,
            units: meta.units,
            code: 'DIESEL_STD',
            indicator: meta.name,
            indicatorId: meta.id,
          });
          keptIds.push(r.lastInsertRowid);
        }
        results.push({ SiteId: siteId, SiteName: siteName, PostingDateMonth: month, indicator: meta.name, value, units: meta.units });
      }
    }

    // Prune calculated rows that no longer produced a value this run (e.g. a
    // month that became skipped). Manual rows are never touched.
    if (keptIds.length > 0) {
      const placeholders = keptIds.map(() => '?').join(',');
      db.prepare(
        `DELETE FROM UlpureData WHERE DataSource = 'Calculated' AND Id NOT IN (${placeholders})`
      ).run(...keptIds);
    } else {
      db.prepare("DELETE FROM UlpureData WHERE DataSource = 'Calculated'").run();
    }
  })();

  return results;
}

module.exports = { calculateAll, prevMonth };