/*
 * Import the Köping Excel backup into the improved raw table `GtoInvoices`.
 *
 * Usage:
 *   cd backend
 *   node src/scripts/importGtoInvoices.js "C:/Users/A500399/Downloads/JOPINGData_Bacup.xlsx"
 */

const XLSX = require('xlsx');
const db = require('../config/db');
require('../config/migrate'); // ensure tables + seed lookups exist

// ─── EDITABLE MAPPINGS ───────────────────────────────────────────────────────

// Excel `Accountnumber` (exact text) -> ValueSlot used by the calc formulas.
// Slots are scoped per utility, so V1 for Electricity is independent of V1 for Water.
const ACCOUNT_VALUE_SLOT = {
  // ── Electricity (Electricity_Calculation sheet) ──
  'Elektricitet, totalt A+T kWh': 'V1',
  'Elektricitet_billaddplatser_kWh': 'V2',
  'Elektricitet, publik lastbilsladdare (T3) kWh': 'V3',
  'Elektricitet_publik lastbilsladdare_(E)_kWh': 'V4',
  'Elförbruk E-hallen kWh': 'V5',

  // ── District Heating (Distrcit Heating sheet: raw meter inputs V1–V6, E-hallen V13) ──
  'Huvudmätare_T_MWh': 'V1',
  'Omk.rum_mätare_T_(nya mätaren_MWh)': 'V2',
  'Kompressor_återvinning _VS 3_MWh': 'V3',
  'Härdverk_T_MWh': 'V4',
  '85148787_MWh': 'V5',
  'Graddagsfaktor_Köping_SMHI': 'V6',
  'Verklig_Energi_Patrik': 'V13',

  // ── Water (WaterConsumption sheet: main flow V1–V4, sub flow V9–V12) ──
  '12812696_A_verkstad': 'V1',
  '12812699_A_verkstad': 'V2',
  '12812698_A_verkstad': 'V3',
  '68511391_T_verkstad': 'V4',
  '6919964_Kyltorn_T-härd': 'V9',
  '6794762_Kyltorn_A-härd-borttagen': 'V10',
  '78102820_nödkyla_ugn_6_KB02': 'V11',
  '6 KB01': 'V12',
  // Water "used in process" inputs (Sheet1) — VERIFY these slot numbers:
  'GKN_Water': 'V15',
  'Stena_Fosfateringsvatten': 'V16',
  'Stena_Emulsioner': 'V17',
  'E-hallen_förbrukning_m3': 'V18',

  // ── LPG / Diesel / Produced Units (single-value utilities) ──
  'LPG_Propane_Gasoline': 'V1',
  'Produced Units': 'V1',
};

// Excel `Templatetype` -> short formula code (real math lives in the calc engine).
const TEMPLATE_FORMULA = {
  Electricity: 'ELEC_STD',
  'District Heating': 'DH_STD',
  Water: 'WATER_NET',
  Diesel: 'DIESEL_STD',
  LPG: 'LPG_STD',
  'Produced Units': 'PRODUCED_STD',
};

// Excel `Templatetype` -> UtilityTypes.UtilityName (must match a seeded row).
const TEMPLATE_UTILITY = {
  Electricity: 'Electricity',
  'District Heating': 'District Heating',
  Water: 'Water',
  Diesel: 'Diesel',
  LPG: 'LPG',
  'Produced Units': 'Produced Units',
};

// ─────────────────────────────────────────────────────────────────────────────

const filePath = process.argv[2];
if (!filePath) {
  console.error('Please pass the Excel file path as an argument.');
  process.exit(1);
}

const toNum = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toISODate = (v) =>
  v instanceof Date && !Number.isNaN(v.getTime())
    ? v.toISOString().slice(0, 10)
    : v ? String(v) : null;

const toISOTime = (v) =>
  v instanceof Date && !Number.isNaN(v.getTime())
    ? v.toISOString().slice(11, 19)
    : v ? String(v) : null;

const siteIdByName = new Map(
  db.prepare('SELECT Id, SiteName FROM Sites').all().map((r) => [r.SiteName, r.Id])
);
const utilityIdByName = new Map(
  db.prepare('SELECT Id, UtilityName FROM UtilityTypes').all().map((r) => [r.UtilityName, r.Id])
);

const workbook = XLSX.readFile(filePath, { cellDates: true });
const sheetName = workbook.SheetNames[0];
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
console.log(`Read ${rows.length} rows from sheet "${sheetName}"`);

const insert = db.prepare(`
  INSERT INTO GtoInvoices (
    AccountNumber, ValueSlot, Consumption, PreviousConsumption,
    FreshWaterStaticValue, EvaporationFactorValue, ConstantValue,
    InvoiceDate, PostingDateMonth, Hitl, BotStatus, DataSource,
    UtilityTypeId, SiteId, TemplateType, Facility, Units, FormulaCode,
    PdfFile, InvoiceNo, ValidateUser, Approver, Comments, ValidatorLoginTime
  ) VALUES (
    @accountNumber, @valueSlot, @consumption, @previousConsumption,
    @freshWater, @evaporation, @constantValue,
    @invoiceDate, @postingDateMonth, @hitl, @botStatus, @dataSource,
    @utilityTypeId, @siteId, @templateType, @facility, @units, @formulaCode,
    @pdfFile, @invoiceNo, @validateUser, @approver, @comments, @validatorLoginTime
  )
`);

const unmappedAccounts = new Set();

const mapRow = (r) => {
  const templateType = r.Templatetype || '';
  const account = r.Accountnumber || '';
  const valueSlot = ACCOUNT_VALUE_SLOT[account] || null;
  if (!valueSlot && account) unmappedAccounts.add(`[${templateType}] ${account}`);

  return {
    accountNumber: account || null,
    valueSlot,
    consumption: toNum(r.Consumption),
    previousConsumption: toNum(r.PreviousConsumption),
    freshWater: toNum(r.FreshWaterStaticValue),
    evaporation: toNum(r.EvaporationFactorValue),
    constantValue: toNum(r.ConstantValue),
    invoiceDate: toISODate(r.Invoicedate),
    postingDateMonth: r.Postingdatemonth || null,
    hitl: r.Hitl || null,
    botStatus: r.Botstatus || null,
    dataSource: r.Datasource || null,
    utilityTypeId: utilityIdByName.get(TEMPLATE_UTILITY[templateType]) || null,
    siteId: siteIdByName.get(r.site || '') || null,
    templateType: templateType || null,
    facility: r.facility || null,
    units: r.units || null,
    formulaCode: TEMPLATE_FORMULA[templateType] || null,
    pdfFile: r.PdfFile || null,
    invoiceNo: r.InvoiceNo || null,
    validateUser: r.Validateuser || null,
    approver: r.Approver || null,
    comments: r.Comments || null,
    validatorLoginTime: toISOTime(r.validatorLoginTime),
  };
};

const kopingId = siteIdByName.get('Köping');

const run = db.transaction(() => {
  if (kopingId) db.prepare('DELETE FROM GtoInvoices WHERE SiteId = ?').run(kopingId);
  for (const r of rows) insert.run(mapRow(r));
});

run();
console.log(`Imported ${rows.length} rows into GtoInvoices.`);

if (unmappedAccounts.size > 0) {
  console.log(`\nWARNING: ${unmappedAccounts.size} account(s) have no ValueSlot (imported as NULL). Add them to ACCOUNT_VALUE_SLOT:`);
  [...unmappedAccounts].sort().forEach((a) => console.log('   -', a));
}