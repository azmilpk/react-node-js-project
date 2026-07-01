// Usage: node src/scripts/importFormEntriesFromExcel.js "C:/Users/A500399/Downloads/JOPINGData_Bacup.xlsx"
const XLSX = require('xlsx');
const db = require('../config/db');
require('../config/migrate'); // ensure FormEntries exists

const filePath = process.argv[2];
if (!filePath) {
  console.error('Please pass the Excel file path as an argument.');
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
console.log(`Read ${rows.length} rows from "${sheetName}"`);

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ─── JOPINGData_Bacup.xlsx  →  FormEntries ───
const mapRow = (r) => ({
  entryNumber:    r.Id ? `IMPORT-${r.Id}` : `IMPORT-${Date.now()}`,
  facilityCode:   r.facility || '',
  siteCode:       r.site || '',
  entryName:      r.Accountnumber || '',          // meter/source description
  utilityCode:    r.Templatetype || '',           // e.g. "Electricity", "Water"
  utilityName:    r.Templatetype || '',
  postingMonth:   r.Postingdatemonth || '',
  accountMeterNo: r.Accountnumber || '',
  units:          r.units || '',
  consumption:    toNumber(r.Consumption),
  status:         r.Hitl || r.Botstatus || 'Pending',
  createdBy:      r.Validateuser || 'excel-import',
  fileName:       '',
  fileUrl:        r.PdfFile || '',
  pdfUrl:         r.PdfFile || '',
  comment:        r.Comments || '',
  // preserve everything else (feeds the calculations later)
  formValuesJson: JSON.stringify({
    sourceId: r.Id,
    dataSource: r.Datasource,
    templateType: r.Templatetype,
    invoiceDate: r.Invoicedate,
    invoiceNo: r.InvoiceNo,
    previousConsumption: r.PreviousConsumption,
    freshWaterStaticValue: r.FreshWaterStaticValue,
    evaporationFactorValue: r.EvaporationFactorValue,
    constantValue: r.ConstantValue,
    formula: r.Formula,
    approver: r.Approver,
    botStatus: r.Botstatus,
    validateUser: r.Validateuser,
    validatorLoginTime: r.validatorLoginTime,
    createdDate: r.createddate,
    createdTime: r.createdtime,
  }),
});

const insert = db.prepare(`
  INSERT INTO FormEntries (
    EntryNumber, FacilityCode, SiteCode, EntryName, UtilityCode, UtilityName,
    PostingMonth, AccountMeterNo, Units, Consumption, Status, CreatedBy,
    FileName, FileUrl, PdfUrl, Comment, FormValuesJson
  ) VALUES (
    @entryNumber, @facilityCode, @siteCode, @entryName, @utilityCode, @utilityName,
    @postingMonth, @accountMeterNo, @units, @consumption, @status, @createdBy,
    @fileName, @fileUrl, @pdfUrl, @comment, @formValuesJson
  )
`);

const run = db.transaction(() => {
  // Optional clear — choose ONE, or leave both commented to append:
  // db.prepare('DELETE FROM FormEntries').run();                          // ALL rows
  // db.prepare("DELETE FROM FormEntries WHERE SiteCode = 'Köping'").run(); // Köping only
  for (const r of rows) insert.run(mapRow(r));
});

run();
console.log(`Done. Imported ${rows.length} rows into FormEntries.`);