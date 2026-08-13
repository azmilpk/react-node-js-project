/*
 * Import the Köping Excel backup into the improved raw table `GtoInvoices`.
 *
 * Usage:
 *   cd backend
 *   node src/scripts/importGtoInvoices.js "C:/Users/A500399/Downloads/JOPINGData_Bacup.xlsx"
 */

require('dotenv').config();
const XLSX = require('xlsx');
const db = require('../config/db');

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
  'ConstantValue_LPGPropGas': 'CONSTANT_PROP_GAS_STD',
};

// Excel `Templatetype` -> UtilityTypes.UtilityName (must match a seeded row).
const TEMPLATE_UTILITY = {
  Electricity: 'Electricity',
  'District Heating': 'District Heating',
  Water: 'Water',
  Diesel: 'Diesel',
  LPG: 'LPG',
  'Produced Units': 'Produced Units',
  'ConstantValue_LPGPropGas': 'ConstantValue_LPGPropGas',
};

// ─── PER-SITE (US) IMPORT MAPPING ────────────────────────────────────────────
// US sites (RT100, MEC, Macungie, LVLC) identify a utility by its account number
// (occasionally a template type / facility) rather than the Köping-style Excel
// `Templatetype`. Every US utility is pass-through into ValueSlot V1; the real
// per-site math + indicators live in calculationService.SITE_FORMULAS, resolved
// by `${site}|${utility}` — so FormulaCode here is just a marker.
//
// NOTE: only the account identifiers given in the site spec are mapped below.
// Add the remaining account numbers as the full US account lists arrive; any
// unmapped account is reported at the end of the run.
const US_SITES = new Set(['RT100', 'MEC', 'Macungie', 'LVLC']);
const SITE_ACCOUNT_UTILITY = {
  RT100: {
    '26660': 'Propane',
    '10972': 'Water',
    '07917-75025': 'Electricity',
  },
  MEC: {
    '13003': 'Diesel',
    '411007249872': 'Natural Gas',
    '54260-10009': 'Electricity',
    '49149-78004': 'Electricity',
    '51200': 'Water',
    '51201': 'Water',
    'Kitchen Propane': 'Kitchen Propane',
    'Forklift Propane': 'Forklift Propane',
  },
    Macungie: {
    '26660': 'Propane',
    diesel_hvo_transport: 'HVO Diesel Transport',
    diesel_hvo_process: 'HVO 100 Process',
    '411004428081': 'Natural Gas',
    '411007180994': 'Natural Gas',
    '421000145191': 'Natural Gas',
    '99852-20147': 'Electricity',
    '71061': 'Water',
    Gasoline: 'Gasoline',
    'Produced units': 'Produced Units',
  },
  LVLC: {
    '28580': 'Propane',
    '39521-50018': 'Electricity',
    '64123-45027': 'Electricity',
    '84973-54004': 'Electricity',
    '411004272711': 'Natural Gas',
    // No water at LVLC.
  },
};

// Fallback: match a US utility by Templatetype text when no account is mapped.
const US_TEMPLATE_UTILITY = {
  'diesel internal transport': 'HVO Diesel Transport',
  'hvo 100 process': 'HVO 100 Process',
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

const toISODate = (v) => {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (v === '' || v === null || v === undefined) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const toISOTime = (v) => {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(11, 19);
  if (v === '' || v === null || v === undefined) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(11, 19);
};

const INSERT_SQL = `
  INSERT INTO Gto_Invoices (
    AccountNumber, ValueSlot, Consumption, PreviousConsumption,
    FreshWaterStaticValue, EvaporationFactorValue, ConstantValue,
    InvoiceDate, PostingDateMonth, BotStatus, DataSource,
    UtilityTypeId, SiteId, Site, TemplateType, Facility, Units, FormulaCode,
    PdfFile, InvoiceNo, ValidateUser, Approver, Comments, ValidatorLoginTime
  ) VALUES (
    @accountNumber, @valueSlot, @consumption, @previousConsumption,
    @freshWater, @evaporation, @constantValue,
    @invoiceDate, @postingDateMonth, @botStatus, @dataSource,
    @utilityTypeId, @siteId, @site, @templateType, @facility, @units, @formulaCode,
    @pdfFile, @invoiceNo, @validateUser, @approver, @comments, @validatorLoginTime
  )`;

const unmappedAccounts = new Set();

async function main() {
  const siteIdByName = new Map(
    (await db.all('SELECT Id, SiteName FROM Sites')).map((r) => [r.SiteName, r.Id])
  );
  const utilityIdByName = new Map(
    (await db.all('SELECT UtilityTypeID AS Id, UtilityName FROM UtilityTypes')).map((r) => [
      r.UtilityName,
      r.Id,
    ])
  );

  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  console.log(`Read ${rows.length} rows from sheet "${sheetName}"`);

  const mapRow = (r) => {
  const templateType = r.Templatetype || '';
  const account = r.Accountnumber || '';
  const site = r.site || '';
  const facility = r.facility || '';
  // The Excel `site` column holds the parent group (e.g. 'LVO'), not the leaf
  // US site — the actual site name (RT100/MEC/Macungie/LVLC) is in `facility`.
  const usSite = US_SITES.has(site) ? site : US_SITES.has(facility) ? facility : null;

  // US sites resolve the utility from the account number (or a template-type
  // fallback) and are always pass-through into V1. Köping keeps the classic
  // Templatetype + account->slot mapping.
  let utilityName = TEMPLATE_UTILITY[templateType] || null;
  let valueSlot = ACCOUNT_VALUE_SLOT[account] || null;
  let formulaCode = TEMPLATE_FORMULA[templateType] || null;

  if (usSite) {
    const mapped =
      SITE_ACCOUNT_UTILITY[usSite]?.[account] ||
      US_TEMPLATE_UTILITY[String(templateType).toLowerCase()] ||
      null;
    if (mapped) {
      utilityName = mapped;
      // Store each meter under its own slot (its account number) so a utility
      // with several meters in a month keeps every reading; the calc engine
      // sums all slots for US pass-through formulas.
      valueSlot = account || 'V1';
      formulaCode = 'SITE_FORMULA'; // engine resolves math by `${site}|${utility}`
    } else if (account) {
      unmappedAccounts.add(`[${usSite}] ${account}`);
    }
  } else if (site === 'Köping' && !valueSlot && account) {
    // Only Köping uses account->slot mapping; other sites (e.g. NRV) keep their
    // raw TemplateType and are aggregated by the calc engine, so don't warn.
    unmappedAccounts.add(`[${templateType}] ${account}`);
  }

  return {
    accountNumber: account || null,
    valueSlot,
    // Bind as strings: these are varchar columns, and mssql's automatic type
    // inference for unstyled JS numbers can silently truncate precision
    // (e.g. 11999.89 -> 11999.9) during the implicit conversion to text.
    consumption: toNum(r.Consumption) !== null ? String(Math.round(toNum(r.Consumption) * 1000) / 1000) : null,
    previousConsumption: toNum(r.PreviousConsumption),
    freshWater: toNum(r.FreshWaterStaticValue) !== null ? String(toNum(r.FreshWaterStaticValue)) : null,
    evaporation: toNum(r.EvaporationFactorValue) !== null ? String(toNum(r.EvaporationFactorValue)) : null,
    constantValue: toNum(r.ConstantValue) !== null ? String(toNum(r.ConstantValue)) : null,
    invoiceDate: toISODate(r.Invoicedate),
    postingDateMonth: r.Postingdatemonth || null,
    botStatus: r.Botstatus || null,
    dataSource: r.Datasource || 'Bot',
    utilityTypeId: utilityIdByName.get(utilityName) || null,
    siteId: siteIdByName.get(site) || siteIdByName.get(r.facility) || null,
    site: site || null,
    templateType: templateType || null,
    facility: r.facility || null,
    units: r.units || null,
    formulaCode,
    pdfFile: r.PdfFile || null,
    invoiceNo: r.InvoiceNo || null,
    validateUser: r.Validateuser || null,
    approver: r.Approver || null,
    comments: r.Comments || null,
    validatorLoginTime: toISOTime(r.validatorLoginTime),
  };
};

  const mapped = rows.map(mapRow);
  await db.transaction(async (t) => {
    // Idempotent per site: clear only the sites present in this file, then insert.
    const siteIds = new Set();
    for (const m of mapped) if (m.siteId) siteIds.add(m.siteId);
    for (const id of siteIds) {
      await t.run('DELETE FROM Gto_Invoices WHERE SiteId = ?', [id]);
    }
    for (const m of mapped) await t.run(INSERT_SQL, m);
  });

  console.log(`Imported ${rows.length} rows into Gto_Invoices.`);

  if (unmappedAccounts.size > 0) {
    console.log(`\nWARNING: ${unmappedAccounts.size} account(s) have no ValueSlot (imported as NULL). Add them to ACCOUNT_VALUE_SLOT:`);
    [...unmappedAccounts].sort().forEach((a) => console.log('   -', a));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });