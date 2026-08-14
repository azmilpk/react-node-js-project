const db = require('../config/db');
const { logChange } = require('./auditService');

// 'YYYY-MM' -> previous month 'YYYY-MM'
function prevMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// Build { V1: number, V2: number, ... } for one site/utility/month
async function slotMap(t, siteId, utilityTypeId, month) {
  const rows = await t.all(
    `SELECT ValueSlot, Consumption
    FROM Gto_Invoices
    WHERE SiteId = ? AND UtilityTypeId = ? AND PostingDateMonth = ?
      AND Hitl IN ('Validated', 'Modified and Validated')`,
    [siteId, utilityTypeId, month]
  );
  const map = {};
  // Accumulate rather than overwrite: two rows can legitimately share a slot
  // (e.g. two invoices for the same meter in a month, or unmapped US rows that
  // both landed on a NULL slot) — dropping one would silently under-count.
  for (const r of rows) map[r.ValueSlot] = (map[r.ValueSlot] || 0) + num(r.Consumption);
  return map;
}

// One function per utility. cur = this month's slots, prev = last month's slots.
//
// Per-site configuration (Option A): formulas are resolved by `${SiteName}|${UtilityName}`
// first, falling back to the plain `${UtilityName}` default below. The generic
// entries here are the defaults used by Köping and any site without an override.
// To give a site different math, add an entry to SITE_FORMULAS (see below) — the
// engine loop never changes.
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
  'ConstantValue_LPGPropGas'({ cur }) {
    return { value: num(cur['V1']), units: 'units', code: 'CONSTANT_PROP_GAS_STD' };
  },
};

// The helpers below build the per-utility formula functions used by SITE_CONFIG
// (the registry lower down). Each returns a formula of the same shape as a
// FORMULAS entry — ({ cur, prev }) => output(s) — and a site-specific formula
// takes precedence over a DIRECT form row so its multiplier / mirrored discharge
// / correct indicator always applies. A US utility can have several meters in a
// month (e.g. two water or electricity meters), each stored as its own slot, so
// the helpers sum every slot; Water always emits a mirrored "Water discharge".
const sumSlots = (cur) => Object.values(cur).reduce((total, v) => total + num(v), 0);
const passThrough = (units, code) => ({ cur }) => ({ value: sumSlots(cur), units, code });
const scaled = (factor, units, code) => ({ cur }) => ({ value: sumSlots(cur) * factor, units, code });
const waterWithDischarge = (useCode) => ({ cur }) => {
  const v = sumSlots(cur);
  return [
    { value: v, units: 'US gallon', code: useCode },
    { indicator: 'Water discharge', utility: 'Water discharge', value: v, units: 'US gallon', code: 'WATER_DISCH_GAL' },
  ];
};

// US natural gas: the metered value is converted straight to MWh with the
// therm->MWh factor (1 unit = 1 therm; no CCF->therm 1.037 step), matching the
// Volvo reference figures.
const NAT_GAS_CCF_TO_MWH = 0.0293071070172;
const KITCHEN_PROPANE_TO_LB = 4.24;
// Plain-English description of the math behind each formula code, shown to
// end users in the UL Pure "Formula" column (INDICATOR_META covers the
// resulting indicator metadata, not the calculation itself).
const FORMULA_DESCRIPTIONS = {
  // Köping
  ELEC_STD: 'V1 (total electricity, MWh) + (V5 − V2 − V3 − V4) ÷ 1000 (E-hallen minus charging meters, kWh→MWh)',
  DH_STD: '(V5 delta) + (V1+V2+V4 delta) + V13 (E-hallen); V3 delta reported separately as recovered energy',
  RECOVERED_ENERGY: 'V3 (Kompressor) month-over-month delta',
  WATER_NET: '(V1+V2+V3+V4 delta) − (V9+V10+V11+V12 delta) — main meters minus cooling',
  WATER_COOL: '(V9+V11+V12) month-over-month delta — cooling-tower meters',
  WATER_PROC: '(V15 × 0.9 + V16 + V17 × 0.9) × 1.25 — fresh-water and evaporation factors',
  WATER_DOM: 'Total (cooling + net + V18) − water used in process − cooling of process',
  WATER_DISCH: '(V15 × 0.9) + Domestic water use',
  LPG_STD: 'V1 (kg) × 12900 ÷ 1,000,000 → MWh',
  DIESEL_STD: 'V1 (litres), passed through unchanged',
  PRODUCED_STD: 'V1, passed through unchanged',
  CONSTANT_PROP_GAS_STD: 'V1, passed through unchanged',
  // US sites (RT100, MEC, Macungie, LVLC)
  ELEC_PASS: 'Sum of all electricity meter slots for the month (kWh)',
  NATGAS_PASS: 'Sum of meter slots × 0.0293071070172 → MWh (therm→MWh)',
  WATER_USE_GAL: 'Sum of water meter slots (US gallon); mirrored to Water discharge',
  WATER_DOM_GAL: 'Sum of water meter slots (US gallon); mirrored to Water discharge',
  WATER_DISCH_GAL: 'Same volume as the paired Water indicator (mirrored)',
  PROPANE_HC_VOL_GAL: 'Sum of propane meter slots (US gallon)',
  PROPANE_IT_VOL_GAL: 'Sum of propane meter slots (US gallon)',
  FORKLIFT_PROPANE: 'Sum of meter slots (lb), passed through unchanged',
  KITCHEN_PROPANE: 'Sum of meter slots × 4.24 → lb',
  GASOLINE_IT: 'Sum of gasoline meter slots (US gallon)',
  DIESEL_PROC_GAL: 'Sum of diesel meter slots, passed through unchanged',
  DIESEL_PROC_L: 'Sum of diesel meter slots, passed through unchanged',
  HVO_TRANSPORT: 'Sum of HVO diesel meter slots (US gallon)',
  PRODUCED_TRUCKS: 'Sum of produced-unit meter slots',
  // NRV (aggregate mode — adds up every raw invoice row tagged with a matching type)
  NRV_ELEC: 'Adds up every invoice row tagged "Electricity" for the month, plus any "Renewable Electricity" rows that are not the Solar PV Array meter.',
  NRV_RENEW_ELEC: 'Adds up every invoice row tagged "Renewable Electricity" whose meter/account is the Solar PV Array.',
  NRV_NATGAS: 'Adds up every invoice row tagged "Natural Gas" for the month.',
  NRV_DIESEL: 'Adds up every invoice row tagged "Diesel" for the month, except rows imported from PowerBI (those are counted separately as "Product Testing" below, so nothing is double-counted).',
  NRV_DIESEL_PT: 'Adds up the "Diesel" invoice rows that were imported from PowerBI (identified by "powerbi" in the account name) — reported separately as Product Testing.',
  NRV_PETROL: 'Adds up every invoice row tagged "Petrol" for the month.',
  NRV_PROPANE: 'Adds up every invoice row tagged "Propane" or "ARC3" for the month.',
  NRV_PRODUCED: 'Adds up every invoice row tagged "Produced Units" for the month.',
  NRV_WATER: 'Adds up every invoice row tagged "Water" for the month.',
  NRV_WT_TREATED: 'Adds up every invoice row tagged "WT_Treated" (water treated) for the month.',
  NRV_WT_RUO: 'Adds up every invoice row tagged "WT_RUO" (water recycled/reused) for the month.',
  NRV_WT_TREATEDFAC: 'Adds up every invoice row tagged "WT_TreatedFacility" (water sent to a treatment facility) for the month.',
  NRV_WT_WS: 'Adds up every invoice row tagged "WT_WS" (water stored) for the month.',
  NRV_WT_WTP: "Fixed answer, not calculated: 'Yes' (NRV has an on-site water treatment plant).",
  NRV_RENEW_COV: 'Fixed answer, not calculated: 100% renewable coverage.',
  NRV_DIESEL_RENEW: 'Fixed answer, not calculated: 0% renewable diesel.',
  NRV_DIESEL_SULPHUR: 'Fixed answer, not calculated: 0 ppm sulphur content.',
  // Manual entries
  DIRECT: 'Manual entry value, used as-is (no calculation)',
};

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
  CONSTANT_PROP_GAS_STD: { id: '64854062', name: 'LPG, Propane/gasol - Renewable (%)', units: '%' },

  // ── US sites (RT100, MEC, Macungie, LVLC) — see SITE_FORMULAS above ──
  ELEC_PASS:          { id: '64885465', name: 'Purchased electricity - Process', units: 'kWh' },
  NATGAS_PASS:        { id: '91310049', name: 'Natural Gas - Heating / Cooling in Energy', units: 'MWh' },
  WATER_USE_GAL:      { id: '64886067', name: 'City water, Water use in process excluded cooling', units: 'US gallon' },
  WATER_DOM_GAL:      { id: '71136904', name: 'City water, Domestic water use', units: 'US gallon' },
  WATER_DISCH_GAL:    { id: '80077162', name: 'Water sent to a municipal, or similar, water treatment facility', units: 'US gallon' },
  PROPANE_HC_VOL_GAL: { id: '65141529', name: 'LPG, Propane/gasol - Heating / Cooling in Volume', units: 'US gallon' },
  PROPANE_IT_VOL_GAL: { id: '65141565', name: 'LPG, Propane/gasol - Internal Transports in Volume', units: 'US gallon' },
  FORKLIFT_PROPANE:   { id: '65141564', name: 'LPG, Propane/gasol - Internal Transports in Mass', units: 'lb' },
  KITCHEN_PROPANE:    { id: '65141527', name: 'LPG, Propane/gasol - Heating / Cooling in Mass', units: 'lb' },
  GASOLINE_IT:        { id: '65208548', name: 'Petrol - Internal Transports in Volume', units: 'US gallon' },
  DIESEL_PROC_GAL:    { id: '65143062', name: 'Diesel Volvo STD - Process in Volume', units: 'US gallon' },
  DIESEL_PROC_L:      { id: '65143062', name: 'Diesel Volvo STD - Process in Volume', units: 'litre' },
  HVO_TRANSPORT:      { id: '65143047', name: 'Diesel Volvo STD - Internal Transports in Volume', units: 'US gallon' },
  PRODUCED_TRUCKS:    { id: '65245952', name: 'Trucks CBU', units: 'Number' },
};

// ── NRV (New River Valley, VA) ───────────────────────────────────────────────
// NRV generates a fixed set of report lines per month. Unlike the slot-based
// sites, most lines are a SUM of GtoInvoices rows matched by TemplateType (and
// sometimes an AccountNumber pattern), filtered to site NRV, the month, and
// Hitl not 'pending'. A few lines are fixed constants. Faithful port of the
// NRV MERGE SQL; handled by a dedicated pass in calculateAll (not SITE_FORMULAS).
const NRV_REGON_ID = '64854091';

// Each summed line: SUM(Consumption) over rows matching `where`; `round` decimals
// (null = no rounding). id/name/units drive the stored indicator metadata.
const NRV_SUM_UTILITIES = [
  { utility: 'Electricity', code: 'NRV_ELEC', round: 3, id: '64885465', name: 'Purchased electricity - Process', units: 'kWh',
    where: "(LOWER(TRIM(TemplateType)) = 'electricity' OR (LOWER(TRIM(TemplateType)) LIKE '%renewable electrici%' AND LOWER(TRIM(AccountNumber)) NOT LIKE '%solar pv array%'))" },
  { utility: 'RenewableElectricity', code: 'NRV_RENEW_ELEC', round: 3, id: '65418678', name: 'Renewable electricity produced and used on site - Process', units: 'kWh',
    where: "LOWER(TRIM(TemplateType)) LIKE '%renewable electrici%' AND LOWER(TRIM(AccountNumber)) LIKE '%solar pv array%'" },
  { utility: 'Naturalgas', code: 'NRV_NATGAS', round: 2, id: '65142759', name: 'Natural Gas - Process in Energy', units: 'MMBTU (US)',
    where: "REPLACE(LOWER(TRIM(TemplateType)), ' ', '') = 'naturalgas'" },
  // Diesel is split into Product Testing (AccountNumber contains 'powerbi', tolerant
  // of the 'disel'/'diesel' spelling) and Internal Transports (every other diesel
  // row) so no diesel row is ever dropped from both lines.
  { utility: 'Diesel', code: 'NRV_DIESEL', round: null, id: '68459062', name: 'Diesel, ULSD, USA - Internal Transports in Volume', units: 'US gallon',
    where: "LOWER(TRIM(TemplateType)) = 'diesel' AND LOWER(TRIM(AccountNumber)) NOT LIKE '%powerbi%'" },
  { utility: 'DieselProductTest', code: 'NRV_DIESEL_PT', round: null, id: '68459053', name: 'Diesel, ULSD, USA - Product Testing in Volume', units: 'litre',
    where: "LOWER(TRIM(TemplateType)) = 'diesel' AND LOWER(TRIM(AccountNumber)) LIKE '%powerbi%'" },
  { utility: 'Petrol', code: 'NRV_PETROL', round: null, id: '65208548', name: 'Petrol - Internal Transports in Volume', units: 'US gallon',
    where: "LOWER(TRIM(TemplateType)) = 'petrol'" },
  { utility: 'Propane', code: 'NRV_PROPANE', round: null, id: '65141619', name: 'LPG, Propane/gasol - Process in Volume', units: 'US gallon',
    where: "LOWER(TRIM(TemplateType)) IN ('propane','arc3')" },
  { utility: 'Producedunits', code: 'NRV_PRODUCED', round: null, id: '65245952', name: 'Trucks CBU', units: 'Number',
    where: "LOWER(TRIM(TemplateType)) = 'produced units'" },
  { utility: 'Water', code: 'NRV_WATER', round: null, id: '64886067', name: 'City water, Water use in process excluded cooling', units: 'US gallon',
    where: "LOWER(TRIM(TemplateType)) = 'water'" },
  { utility: 'WT_Treated', code: 'NRV_WT_TREATED', round: null, id: '81642927', name: 'Total amount of water treated', units: 'US gallon',
    where: "LOWER(TRIM(TemplateType)) = 'wt_treated'" },
  { utility: 'WT_RUO', code: 'NRV_WT_RUO', round: null, id: '80231623', name: 'Total volume of water recycled and reused by the organization', units: 'US gallon',
    where: "LOWER(TRIM(TemplateType)) = 'wt_ruo'" },
  { utility: 'WT_TreatedFacility', code: 'NRV_WT_TREATEDFAC', round: null, id: '80077162', name: 'Water sent to a municipal, or similar, water treatment facility', units: 'US gallon',
    where: "LOWER(TRIM(TemplateType)) = 'wt_treatedfacility'" },
  { utility: 'WT_WS', code: 'NRV_WT_WS', round: null, id: '92084826', name: 'Water stored', units: 'US gallon',
    where: "LOWER(TRIM(TemplateType)) = 'wt_ws'" },
];

// Fixed constant lines (no source rows).
const NRV_CONSTANTS = [
  { utility: 'WT_WTP', code: 'NRV_WT_WTP', value: 'Yes', id: '81642984', name: 'Do you have an on-site water treatment plant?', units: 'Yes/No' },
  { utility: 'RenewableCoverage', code: 'NRV_RENEW_COV', value: 100, id: '95864481', name: 'GTP form entry: Renewable coverage (%)', units: '%' },
  { utility: 'DieselRenewable', code: 'NRV_DIESEL_RENEW', value: 0, id: '68459080', name: 'Diesel, ULSD, USA - Renewable (%)', units: '%' },
  { utility: 'DieselSulphur', code: 'NRV_DIESEL_SULPHUR', value: 0, id: '88341649', name: 'Diesel, ULSD, USA - Sulphur content - site level (ppm)', units: 'ppm.' },
];

// ── Per-site configuration registry ─────────────────────────────────────────
// The single source of truth for how each site calculates. To add a new site,
// add one entry here — the engine below reads everything from this map and never
// needs to change. (You also seed the Sites/UtilityTypes rows in migrate.js and
// the raw account→utility mapping in importGtoInvoices.js.) Fields:
//   mode           'slot'      -> per-utility meter formulas (Köping + US sites)
//                  'aggregate' -> SUM GtoInvoices rows by TemplateType (NRV)
//   rounding       decimals to round each value to (null = keep the raw value)
//   formulas       { UtilityName: ({cur,prev}) => output(s) } site overrides;
//                  any utility not listed falls back to the generic FORMULAS
//   deltaUtilities utilities needing a previous-month baseline (skipped if none)
//   guaranteedRows always emit one row per active month from a single slot
//                  (value or 0) — for utilities with no meter formula
//   sumUtilities / constants   aggregate-mode inputs (see NRV_* above)
//   regonId        reporting id (seeded in migrate.js; kept here for reference)
const SITE_CONFIG = {
  Köping: {
    mode: 'slot',
    rounding: 3,
    regonId: '64854062',
    // Köping uses the generic FORMULAS (Electricity, District Heating, Water,
    // LPG, Produced Units); Diesel is a guaranteed row (no meter formula).
    formulas: {},
    deltaUtilities: ['District Heating', 'Water'],
    guaranteedRows: [
      { utility: 'Diesel', code: 'DIESEL_STD', slot: 'V1', round: 3 },
      {utility: 'ConstantValue_LPGPropGas', code: 'CONSTANT_PROP_GAS_STD', slot: 'V1', round: 3 },
    ],
  },

  RT100: {
    mode: 'slot',
    rounding: null,
    formulas: {
      Propane: passThrough('US gallon', 'PROPANE_HC_VOL_GAL'),
      Electricity: passThrough('kWh', 'ELEC_PASS'),
      Water: waterWithDischarge('WATER_DOM_GAL'),
    },
  },

  MEC: {
    mode: 'slot',
    rounding: null,
    formulas: {
      Diesel: passThrough('US gallon', 'DIESEL_PROC_GAL'),
      'Forklift Propane': passThrough('lb', 'FORKLIFT_PROPANE'),
      'Kitchen Propane': scaled(KITCHEN_PROPANE_TO_LB, 'lb', 'KITCHEN_PROPANE'),
      'Natural Gas': scaled(NAT_GAS_CCF_TO_MWH, 'MWh', 'NATGAS_PASS'),
      Electricity: passThrough('kWh', 'ELEC_PASS'),
      Water: waterWithDischarge('WATER_USE_GAL'),
    },
  },

  Macungie: {
    mode: 'slot',
    rounding: null,
    formulas: {
      Propane: passThrough('US gallon', 'PROPANE_IT_VOL_GAL'),
      'Natural Gas': scaled(NAT_GAS_CCF_TO_MWH, 'MWh', 'NATGAS_PASS'),
      Electricity: passThrough('kWh', 'ELEC_PASS'),
      Gasoline: passThrough('US gallon', 'GASOLINE_IT'),
      'HVO Diesel Transport': passThrough('US gallon', 'HVO_TRANSPORT'),
      'HVO 100 Process': passThrough('litre', 'DIESEL_PROC_L'),
      Water: waterWithDischarge('WATER_USE_GAL'),
      'Produced Units': passThrough('Number', 'PRODUCED_TRUCKS'),
    },
  },

  LVLC: {
    mode: 'slot',
    rounding: null,
    formulas: {
      Propane: passThrough('US gallon', 'PROPANE_HC_VOL_GAL'),
      'Natural Gas': scaled(NAT_GAS_CCF_TO_MWH, 'MWh', 'NATGAS_PASS'),
      Electricity: passThrough('kWh', 'ELEC_PASS'),
      Water: waterWithDischarge('WATER_USE_GAL'),
    },
  },

  NRV: {
    mode: 'aggregate',
    rounding: null,
    regonId: NRV_REGON_ID,
    sumUtilities: NRV_SUM_UTILITIES,
    constants: NRV_CONSTANTS,
  },
};

// Manual form entries land as DIRECT rows: a single, already-final value that
// is echoed straight through instead of being run through a meter formula.
const DIRECT_SQL = `
  SELECT TOP 1 SourceEntryId, Consumption, Units FROM Gto_Invoices
  WHERE SiteId = ? AND UtilityTypeId = ? AND PostingDateMonth = ? AND FormulaCode = 'DIRECT'
  ORDER BY Id DESC
`;

// A form entry promoted via the "Generate UL Pure" button already exists in
// UlpureData as a Manual row; the calc engine must not create a duplicate.
const MANUAL_EXISTS_SQL = `
  SELECT TOP 1 1 AS ok FROM tbl_ulpure_data
  WHERE SourceEntryId = ? AND DataSource = 'Manual'
`;

// Upsert on the natural key (site + utility + month + formula) so a recalculated
// row keeps its Id — and therefore its audit history — instead of being deleted
// and re-inserted with a fresh Id every run.
const FIND_CALC_SQL = `
  SELECT TOP 1 Id, Consumption, ReviewStatus, ulpure_status AS UlpureStatus FROM tbl_ulpure_data
  WHERE SiteId = ? AND UtilityTypeId = ? AND PostingDateMonth = ? AND DataSource = 'Calculated' AND FormulaCode = ?
`;

const INSERT_CALC_SQL = `
  INSERT INTO tbl_ulpure_data
    (PostingDateMonth, UtilityTypeId, SiteId, Utility, Site,
     Consumption, PreviousConsumptionUL, Units, ulpure_status, FormulaCode, [Indicator Name], [Indicator ID], DataSource)
  VALUES (@month, @utilityTypeId, @siteId, @utility, @site,
          @value, @previous, @units, 'Validate', @code, @indicator, @indicatorId, 'Calculated')
`;

const UPDATE_CALC_SQL = `
  UPDATE tbl_ulpure_data
  SET Utility = @utility, Site = @site, Consumption = @value,
      Units = @units, FormulaCode = @code, [Indicator Name] = @indicator, [Indicator ID] = @indicatorId
  WHERE Id = @id
`;

const AGG_FIND_SQL = `
  SELECT TOP 1 Id, Consumption, ReviewStatus, ulpure_status AS UlpureStatus FROM tbl_ulpure_data
  WHERE SiteId = ? AND Utility = ? AND PostingDateMonth = ? AND DataSource = 'Calculated'
`;

async function calculateAll({ site } = {}) {
  // When a site is given, resolve its id and scope everything (combos, the
  // special passes, and the prune) to that site so other sites' Calculated
  // rows are never recomputed or deleted. No site = process every site.
  const siteRow = site
    ? await db.get('SELECT Id FROM Sites WHERE SiteName = ?', [site])
    : null;
  const siteId = siteRow ? siteRow.Id : null;
  if (site && !siteId) return []; // unknown site -> nothing to do

  const combos = await db.all(
    `SELECT DISTINCT g.SiteId, g.UtilityTypeId, g.PostingDateMonth,
           s.SiteName, u.UtilityName
    FROM Gto_Invoices g
    JOIN Sites s ON s.Id = g.SiteId
    JOIN UtilityTypes u ON u.UtilityTypeID = g.UtilityTypeId
    WHERE g.PostingDateMonth IS NOT NULL
      ${siteId ? 'AND g.SiteId = ?' : ''}
    ORDER BY g.PostingDateMonth, s.SiteName, u.UtilityName`,
    siteId ? [siteId] : []
  );

  const results = [];
  // Utility-type id lookup by name, used by the guaranteed-row pass below.
  const utilityTypeRows = await db.all('SELECT UtilityTypeID AS Id, UtilityName FROM UtilityTypes');
  const utilityTypeByName = new Map(utilityTypeRows.map((r) => [r.UtilityName, r]));

  // A site+month must be 100% validated to calculate — one Pending row anywhere
  // in that month excludes the whole month (no partial/incomplete sums), for
  // every site (Köping, NRV, and the US slot sites alike).
  const incompleteRows = await db.all(
    `SELECT DISTINCT SiteId, PostingDateMonth AS month
     FROM Gto_Invoices
     WHERE PostingDateMonth IS NOT NULL AND COALESCE(Hitl, 'Pending') NOT IN ('Validated', 'Modified and Validated')
       ${siteId ? 'AND SiteId = ?' : ''}`,
    siteId ? [siteId] : []
  );
  const incompleteMonthsBySite = new Map(); // SiteId -> Set(month)
  for (const r of incompleteRows) {
    if (!incompleteMonthsBySite.has(r.SiteId)) incompleteMonthsBySite.set(r.SiteId, new Set());
    incompleteMonthsBySite.get(r.SiteId).add(r.month);
  }
  const isMonthComplete = (sId, month) => !incompleteMonthsBySite.get(sId)?.has(month);

  await db.transaction(async (t) => {
    const keptIds = [];
    // Track which site+month combos produced output so we can guarantee a
    // Diesel line (actual value or 0) for each of them below.
    const emittedSiteMonths = new Map(); // `${SiteId}|${month}` -> SiteName
    for (const c of combos) {
      const cfg = SITE_CONFIG[c.SiteName];
      // Unknown sites and aggregate-mode sites (e.g. NRV) are not produced by
      // this per-utility slot loop — aggregate sites run in their own pass below.
      if (!cfg || cfg.mode === 'aggregate') continue;
      // Utilities produced by the guaranteed-row pass (e.g. Köping Diesel) are
      // emitted after this loop, so skip them here.
      if (cfg.guaranteedRows && cfg.guaranteedRows.some((g) => g.utility === c.UtilityName)) continue;
      if (!isMonthComplete(c.SiteId, c.PostingDateMonth)) {
        results.push({ ...c, skipped: true, reason: 'month has pending rows' });
        continue;
      }

      const cur = await slotMap(t, c.SiteId, c.UtilityTypeId, c.PostingDateMonth);
      const prev = await slotMap(t, c.SiteId, c.UtilityTypeId, prevMonth(c.PostingDateMonth));
      // Delta utilities need a previous month baseline to be meaningful.
      const isDelta = cfg.deltaUtilities && cfg.deltaUtilities.includes(c.UtilityName);

      // Each combo can produce one or more indicator rows (e.g. Water emits
      // several). Normalize every path to a list of { indicator, value, units, code }.
      let outputs;

      // A site-specific formula takes precedence over everything (including a
      // DIRECT form row) so its multiplier / mirrored discharge / correct
      // indicator always applies regardless of how the data arrived. Anything
      // not overridden falls back to the generic FORMULAS (Köping's defaults).
      const siteFn = cfg.formulas && cfg.formulas[c.UtilityName];
      const direct = siteFn
        ? null
        : await t.get(DIRECT_SQL, [c.SiteId, c.UtilityTypeId, c.PostingDateMonth]);
      if (siteFn) {
        if (isDelta && Object.keys(prev).length === 0) {
          results.push({ ...c, skipped: true, reason: 'no baseline month' });
          continue;
        }
        const res = siteFn({ cur, prev });
        outputs = Array.isArray(res) ? res : [res];
      } else if (direct) {
        // Manual / form-entry rows are already final values -> pass straight through.
        // Skip if this form entry was already promoted via "Generate UL Pure"
        // (a Manual row exists) so we don't create a duplicate Calculated row.
        if (direct.SourceEntryId && (await t.get(MANUAL_EXISTS_SQL, [direct.SourceEntryId]))) {
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

        if (isDelta && Object.keys(prev).length === 0) {
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

        // Round to the site's configured precision (e.g. Köping -> 3 decimals);
        // sites with rounding: null keep their raw value.
        const factor = cfg.rounding != null ? 10 ** cfg.rounding : null;
        const value = factor ? Math.round(o.value * factor) / factor : o.value;
        // Official indicator name / id / units come from the metadata map when
        // the output has a known formula code; otherwise fall back to raw values.
        const meta = INDICATOR_META[o.code] || {};
        const indicatorName = meta.name || o.indicator || c.UtilityName;
        const indicatorId = meta.id || null;
        const units = meta.units || o.units;

        const existing = await t.get(FIND_CALC_SQL, [c.SiteId, c.UtilityTypeId, c.PostingDateMonth, o.code]);
        if (existing) {
          keptIds.push(existing.Id);
          results.push({ ...c, indicator: indicatorName, value: existing.Consumption, units, locked: true });
        } else {
          const res = await t.run(INSERT_CALC_SQL, {
            month: c.PostingDateMonth,
            utilityTypeId: c.UtilityTypeId,
            siteId: c.SiteId,
            utility: o.utility || c.UtilityName,
            site: c.SiteName,
            value: String(value),
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

    // ── Guaranteed rows ──
    // Some utilities have no meter formula but must still emit exactly one row
    // per active month — their raw slot value when data exists, otherwise 0
    // (e.g. Köping Diesel). Driven entirely by each site's guaranteedRows config,
    // so a new site only needs to list them; the engine never changes.
    for (const [siteName, siteCfg] of Object.entries(SITE_CONFIG)) {
      if (!siteCfg.guaranteedRows || siteCfg.guaranteedRows.length === 0) continue;
      if (site && site !== siteName) continue; // respect the scoped run
      for (const g of siteCfg.guaranteedRows) {
        const ut = utilityTypeByName.get(g.utility);
        if (!ut) continue;
        const meta = INDICATOR_META[g.code] || {};
        // Targets: every month this site produced output, plus any month that
        // actually has this utility's source data (so an entered value shows).
        const targets = new Map();
        for (const [key, sName] of emittedSiteMonths) {
          if (sName === siteName) targets.set(key, sName);
        }
        for (const c of combos) {
          if (c.SiteName === siteName && c.UtilityName === g.utility && isMonthComplete(c.SiteId, c.PostingDateMonth)) {
            targets.set(`${c.SiteId}|${c.PostingDateMonth}`, c.SiteName);
          }
        }
        for (const [key, sName] of targets) {
          const [siteIdStr, month] = key.split('|');
          const gSiteId = Number(siteIdStr);
          const slots = await slotMap(t, gSiteId, ut.Id, month);
          const factor = g.round != null ? 10 ** g.round : null;
          const raw = num(slots[g.slot]);
          const value = factor ? Math.round(raw * factor) / factor : raw;
          const existing = await t.get(FIND_CALC_SQL, [gSiteId, ut.Id, month, g.code]);
          if (existing) {
            keptIds.push(existing.Id);
            results.push({ SiteId: gSiteId, SiteName: sName, PostingDateMonth: month, indicator: meta.name, value: existing.Consumption, units: meta.units, locked: true });
          } else {
            const r = await t.run(INSERT_CALC_SQL, {
              month, utilityTypeId: ut.Id, siteId: gSiteId, utility: g.utility, site: sName,
              value: String(value), previous: null, units: meta.units, code: g.code, indicator: meta.name, indicatorId: meta.id,
            });
            keptIds.push(r.lastInsertRowid);
          }
          results.push({ SiteId: gSiteId, SiteName: sName, PostingDateMonth: month, indicator: meta.name, value, units: meta.units });
        }
      }
    }

    // ── Aggregate-mode sites (e.g. NRV) ──
    // Each summed utility = SUM(Consumption) of the site's rows matching its
    // TemplateType/AccountNumber rule for the month, plus fixed constants. One
    // line per utility per month (0 when no source rows).
    // Any site with mode 'aggregate' in SITE_CONFIG runs here automatically.
    for (const [siteName, siteCfg] of Object.entries(SITE_CONFIG)) {
      if (siteCfg.mode !== 'aggregate') continue;
      if (site && site !== siteName) continue; // respect the scoped run
      const aggSite = await t.get('SELECT Id FROM Sites WHERE SiteName = ?', [siteName]);
      if (!aggSite) continue;

      // Every month with data is a candidate; isMonthComplete then drops any
      // month that has even one Pending row so NRV never sums partial data.
      const aggMonths = (
        await t.all(
          'SELECT DISTINCT PostingDateMonth AS m FROM Gto_Invoices WHERE SiteId = ? AND PostingDateMonth IS NOT NULL',
          [aggSite.Id]
        )
      )
        .map((r) => r.m)
        .filter((m) => isMonthComplete(aggSite.Id, m));

      const upsertAgg = async (month, utility, code, value, units, id, name) => {
        const existing = await t.get(AGG_FIND_SQL, [aggSite.Id, utility, month]);
        if (existing) {
          keptIds.push(existing.Id);
          results.push({ SiteId: aggSite.Id, SiteName: siteName, PostingDateMonth: month, indicator: name, value: existing.Consumption, units, locked: true });
        } else {
          const r = await t.run(INSERT_CALC_SQL, {
            month, utilityTypeId: null, siteId: aggSite.Id, utility, site: siteName,
            value: String(value), previous: null, units, code, indicator: name, indicatorId: id,
          });
          keptIds.push(r.lastInsertRowid);
        }
        results.push({ SiteId: aggSite.Id, SiteName: siteName, PostingDateMonth: month, indicator: name, value, units });
      };

      for (const month of aggMonths) {
        for (const s of (siteCfg.sumUtilities || [])) {
          // Hitl has been retired: every source row for the month is summed.
          const row = await t.get(
            `SELECT COALESCE(SUM(CAST(Consumption AS FLOAT)), 0) AS total
             FROM Gto_Invoices
             WHERE SiteId = @siteId AND PostingDateMonth = @month
               AND Hitl IN ('Validated', 'Modified and Validated')
               AND (${s.where})`,
            { siteId: aggSite.Id, month }
          );
          let value = (row && row.total) || 0;
          if (s.round != null) {
            const f = 10 ** s.round;
            value = Math.round(value * f) / f;
          }
          await upsertAgg(month, s.utility, s.code, value, s.units, s.id, s.name);
        }
        for (const k of (siteCfg.constants || [])) {
          await upsertAgg(month, k.utility, k.code, k.value, k.units, k.id, k.name);
        }
      }
    }

    // Prune calculated rows that no longer produced a value this run (e.g. a
    // month that became skipped). Manual rows are never touched, and when a
    // site filter is active only that site's Calculated rows are pruned.
    const siteClause = siteId ? ' AND SiteId = ?' : '';
    const siteArg = siteId ? [siteId] : [];
    if (keptIds.length > 0) {
      const placeholders = keptIds.map(() => '?').join(',');
      await t.run(
        `DELETE FROM tbl_ulpure_data
         WHERE DataSource = 'Calculated'
           AND Id NOT IN (${placeholders})
           AND COALESCE(ReviewStatus, '') != 'Reviewed'
           AND COALESCE(ulpure_status, '') != 'Validated'
           ${siteClause}`,
        [...keptIds, ...siteArg]
      );
    } else {
      await t.run(
        `DELETE FROM tbl_ulpure_data
         WHERE DataSource = 'Calculated'
           AND COALESCE(ReviewStatus, '') != 'Reviewed'
           AND COALESCE(ulpure_status, '') != 'Validated'
           ${siteClause}`,
        siteArg
      );
    }
  });

  return results;
}

module.exports = { calculateAll, prevMonth, FORMULA_DESCRIPTIONS, NRV_SUM_UTILITIES };