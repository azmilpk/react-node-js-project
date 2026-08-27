/*
 * Import a utility-data workbook into the raw readings table.
 *
 * Usage:
 *   cd backend
 *   node src/scripts/importGtoInvoices.js "C:/path/to/utility-data.xlsx"
 */

require('dotenv').config();
const XLSX = require('xlsx');
const db = require('../config/db');

// ─── EDITABLE MAPPINGS ───────────────────────────────────────────────────────

// Generic demo meter references -> value slots used by calculation formulas.
// Replace these with non-sensitive mappings for a local demo dataset only.
const ACCOUNT_VALUE_SLOT = {
  'METER-001': 'V1',
  'METER-002': 'V2',
  'METER-003': 'V3',
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

// No real account/meter mappings are stored in this public project. Utilities
// are resolved from the workbook's generic template type.

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
  const utilityTypeMap = new Map(
    (await db.all('SELECT Id, UtilityName FROM UtilityTypes')).map((r) => [
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
  let utilityName = TEMPLATE_UTILITY[templateType] || null;
  let valueSlot = ACCOUNT_VALUE_SLOT[account] || null;
  let formulaCode = TEMPLATE_FORMULA[templateType] || null;
  if (!utilityName && account) unmappedAccounts.add(`[${templateType || 'Unknown utility'}] ${account}`);

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
