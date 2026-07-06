const db = require('../config/db');
const { logFieldChanges } = require('./auditService');

// ------------------------------------------------------------------ //
// FormEntries -> GtoInvoices bridge                                    //
// Each manual form entry is a single, final meter reading. It lands   //
// in GtoInvoices as one V1 row tagged DataSource='FormEntry' with a    //
// DIRECT (pass-through) formula so the calc engine echoes it straight  //
// into UlpureData without applying meter-delta math.                   //
// ------------------------------------------------------------------ //
const resolveSiteId = (siteName) => {
  if (!siteName) return null;
  const row = db.prepare('SELECT Id FROM Sites WHERE SiteName = ?').get(siteName);
  return row ? row.Id : null;
};

const resolveUtilityId = (utilityName) => {
  if (!utilityName) return null;
  const row = db
    .prepare('SELECT Id FROM UtilityTypes WHERE UtilityName = ?')
    .get(utilityName);
  return row ? row.Id : null;
};

const syncFormEntryToGtoInvoices = (formEntry) => {
  if (!formEntry) return;

  const utilityName = formEntry.UtilityName || formEntry.UtilityCode || '';
  const siteId = resolveSiteId(formEntry.SiteCode);
  const utilityTypeId = resolveUtilityId(utilityName);
  const consumption = Number(formEntry.Consumption) || 0;

  // Utilities that must run through a meter formula instead of DIRECT passthrough.
  const FORMULA_CODE_BY_UTILITY = {
    Electricity: 'ELEC_STD',
    'District Heating': 'DH_STD',
    Water: 'WATER_NET',
    LPG: 'LPG_STD',
    Diesel: 'DIESEL_STD',
    'Produced Units': 'PRODUCED_STD',
  };
  const formulaCode = FORMULA_CODE_BY_UTILITY[utilityName] || 'DIRECT';

  // Remove any prior GtoInvoices row this form entry produced (e.g. if the
  // month/utility changed on update) so re-syncing stays idempotent.
  db.prepare(
    "DELETE FROM GtoInvoices WHERE SourceEntryId = ? AND DataSource = 'FormEntry'"
  ).run(formEntry.Id);

  // INSERT OR REPLACE upserts against UX_GtoInvoices_source
  // (SiteId, UtilityTypeId, ValueSlot, PostingDateMonth) so a manual entry
  // overrides any existing row for the same site/utility/month.
  db.prepare(`
    INSERT OR REPLACE INTO GtoInvoices
    (
      SourceEntryId,
      AccountNumber,
      ValueSlot,
      Consumption,
      PostingDateMonth,
      DataSource,
      UtilityTypeId,
      SiteId,
      TemplateType,
      Facility,
      Units,
      FormulaCode,
      PdfFile
    )
    VALUES
    (
      @sourceEntryId,
      @accountNumber,
      'V1',
      @consumption,
      @postingMonth,
      'FormEntry',
      @utilityTypeId,
      @siteId,
      @templateType,
      @facility,
      @units,
      @formulaCode,
      @pdfFile
    )
  `).run({
    sourceEntryId: formEntry.Id,
    accountNumber:
      formEntry.AccountMeterNo || formEntry.EntryName || utilityName || '',
    consumption,
    postingMonth: formEntry.PostingMonth || '',
    utilityTypeId,
    siteId,
    templateType: utilityName,
    facility: formEntry.FacilityCode || '',
    units: formEntry.Units || '',
    formulaCode,
    pdfFile: formEntry.FileUrl || '',
  });
};

// Create Entry
const insertFormEntry = (data) => {
  const entryNumber = `ENTRY-${Date.now()}`;

  const stmt = db.prepare(`
    INSERT INTO FormEntries
    (
      EntryNumber,
      FacilityCode,
      SiteCode,
      EntryName,
      UtilityCode,
      UtilityName,
      PostingMonth,
      AccountMeterNo,
      Units,
      Consumption,
      Status,
      CreatedBy,
      FileName,
      FileUrl,
      PdfUrl,
      Comment,
      FormValuesJson
    )
    VALUES
    (
      @entryNumber,
      @facilityCode,
      @siteCode,
      @entryName,
      @utilityCode,
      @utilityName,
      @postingMonth,
      @accountMeterNo,
      @units,
      @consumption,
      @status,
      @createdBy,
      @fileName,
      @fileUrl,
      @pdfUrl,
      @comment,
      @formValuesJson
    )
  `);

  const result = stmt.run({
    entryNumber,
    facilityCode: data.facilityCode || '',
    siteCode: data.siteCode || '',
    entryName: data.entryName || '',
    utilityCode: data.utilityCode || '',
    utilityName: data.utilityName || data.utilityCode || '',
    postingMonth: data.postingMonth || '',
    accountMeterNo: data.accountMeterNo || '',
    units: data.units || '',
    consumption: data.consumption || '',
    status: data.status || 'Pending',
    createdBy: data.createdBy || 'frontend-user',
    fileName: data.fileName || '',
    fileUrl: data.fileUrl || '',
    pdfUrl: data.pdfUrl || '',
    comment: data.comment || '',
    formValuesJson: data.formValuesJson || null,
  });

  const created = db
    .prepare('SELECT * FROM FormEntries WHERE Id = ?')
    .get(result.lastInsertRowid);
  syncFormEntryToGtoInvoices(created);
  return created;
};

// Get All Entries
const fetchFormEntries = (query) => {
  let sql = 'SELECT * FROM FormEntries WHERE 1=1';
  const params = [];

  if (query.facilityCode) {
    sql += ' AND FacilityCode = ?';
    params.push(query.facilityCode);
  }

  if (query.siteCode) {
    sql += ' AND SiteCode = ?';
    params.push(query.siteCode);
  }

  if (query.utilityCode) {
    sql += ' AND UtilityCode = ?';
    params.push(query.utilityCode);
  }

  if (query.status) {
    sql += ' AND Status = ?';
    params.push(query.status);
  }

  return db.prepare(sql).all(...params);
};

// Get Entry By Id
const fetchFormEntryById = (id) => {
  return db.prepare('SELECT * FROM FormEntries WHERE Id = ?').get(id);
};

// Change Status
const changeFormEntryStatus = (id, status, changedBy) => {
  const entry = db.prepare('SELECT * FROM FormEntries WHERE Id = ?').get(id);
  if (!entry) throw new Error('Entry not found');

  let finalStatus = status;
  if (status === 'Validated' && entry.Status === 'Modified') {
    finalStatus = 'Modified and Validated';
  }

  logFieldChanges({
    tableName: 'FormEntries',
    recordId: id,
    oldRecord: entry,
    newFields: { Status: finalStatus },
    changedBy: changedBy || 'Unknown User',
  });

  db.prepare('UPDATE FormEntries SET Status = ? WHERE Id = ?').run(finalStatus, id);
  return db.prepare('SELECT * FROM FormEntries WHERE Id = ?').get(id);
};

// Update Entry
const updateFormEntry = (id, data) => {
  const entry = db.prepare('SELECT * FROM FormEntries WHERE Id = ?').get(id);

  if (!entry) {
    throw new Error('Entry not found');
  }

  const changedBy = data.changedBy || data.modifiedBy || 'Unknown User';

  const newValues = {
    PostingMonth: data.postingMonth || entry.PostingMonth,
    Consumption: data.consumption || entry.Consumption,
    Comment: data.comment || entry.Comment || '',
    Status: 'Modified and Validated',
  };

  logFieldChanges({
    tableName: 'FormEntries',
    recordId: id,
    oldRecord: entry,
    newFields: newValues,
    changedBy,
  });

  db.prepare(`
    UPDATE FormEntries
    SET
      PostingMonth = ?,
      Consumption = ?,
      Comment = ?,
      Status = ?,
      ModifiedAt = datetime('now')
    WHERE Id = ?
  `).run(
    newValues.PostingMonth,
    newValues.Consumption,
    newValues.Comment,
    newValues.Status,
    id
  );

  const updated = db.prepare('SELECT * FROM FormEntries WHERE Id = ?').get(id);
  syncFormEntryToGtoInvoices(updated);
  return updated;
};

module.exports = {
  insertFormEntry,
  fetchFormEntries,
  fetchFormEntryById,
  changeFormEntryStatus,
  updateFormEntry,
  syncFormEntryToGtoInvoices,
};