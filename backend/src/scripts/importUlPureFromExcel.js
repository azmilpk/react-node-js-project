// Usage: node src/scripts/importUlPureFromExcel.js "C:/path/to/JOPINGData_Bacup.xlsx"
const path = require('path');
const XLSX = require('xlsx');
const db = require('../config/db');
require('../config/migrate'); // make sure UlPureEntries exists

const filePath = process.argv[2];
if (!filePath) {
  console.error('Please pass the Excel file path as an argument.');
  process.exit(1);
}

// 1. Read the workbook and first sheet as an array of row objects (keyed by header)
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

console.log(`Read ${rows.length} rows from sheet "${sheetName}"`);
if (rows.length > 0) {
  console.log('Detected column headers:', Object.keys(rows[0]));
}

// 2. ─── MAP YOUR EXCEL COLUMNS → UlPureEntries COLUMNS ───
//    Replace the strings on the RIGHT with the EXACT header text from your file
//    (run once to see the "Detected column headers" log above, then fill these in).
const mapRow = (r) => ({
  entryNumber:   r['EntryNumber']    || '',
  facilityCode:  r['FacilityCode']   || '',
  siteCode:      r['SiteCode']       || 'Köping',
  entryName:     r['EntryName']      || '',
  utilityCode:   r['UtilityCode']    || '',
  utilityName:   r['UtilityName']    || '',
  postingMonth:  r['PostingMonth']   || '',
  accountMeterNo:r['AccountMeterNo'] || '',
  units:         r['Units']          || '',
  consumption:   r['Consumption']    || 0,
  status:        r['Status']         || 'Validate',
  comment:       r['Comment']        || '',
  fileName:      r['FileName']       || '',
  fileUrl:       r['FileUrl']        || '',
  createdBy:     r['CreatedBy']      || 'excel-import',
});

const insert = db.prepare(`
  INSERT INTO UlPureEntries (
    EntryNumber, FacilityCode, SiteCode, EntryName, UtilityCode, UtilityName,
    PostingMonth, AccountMeterNo, Units, Consumption, Status, Comment,
    FileName, FileUrl, CreatedBy
  ) VALUES (
    @entryNumber, @facilityCode, @siteCode, @entryName, @utilityCode, @utilityName,
    @postingMonth, @accountMeterNo, @units, @consumption, @status, @comment,
    @fileName, @fileUrl, @createdBy
  )
`);

// 3. Run everything in one transaction: empty the table, then import
const run = db.transaction(() => {
  db.prepare('DELETE FROM UlPureEntries').run();          // ← empties UL Pure
  // db.prepare("DELETE FROM sqlite_sequence WHERE name='UlPureEntries'").run(); // optional: reset Id counter
  for (const r of rows) {
    insert.run(mapRow(r));
  }
});

run();
console.log(`Done. UlPureEntries cleared and ${rows.length} rows imported.`);