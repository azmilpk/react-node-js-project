const db = require('../config/db');

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

  return db.prepare('SELECT * FROM FormEntries WHERE Id = ?').get(result.lastInsertRowid);
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
const changeFormEntryStatus = (id, status) => {
  const entry = db.prepare('SELECT * FROM FormEntries WHERE Id = ?').get(id);

  if (!entry) {
    throw new Error('Entry not found');
  }

  let finalStatus = status;

  if (status === 'Validated' && entry.Status === 'Modified') {
    finalStatus = 'Modified and Validated';
  }

  db.prepare(`
    UPDATE FormEntries
    SET Status = ?
    WHERE Id = ?
  `).run(finalStatus, id);

  return db.prepare('SELECT * FROM FormEntries WHERE Id = ?').get(id);
};

// Update Entry
const updateFormEntry = (id, data) => {
  const entry = db.prepare('SELECT * FROM FormEntries WHERE Id = ?').get(id);

  if (!entry) {
    throw new Error('Entry not found');
  }

db.prepare(`
UPDATE FormEntries
SET
  PostingMonth = ?,
  Consumption = ?,
  Comment = ?,
  Status = ?,
  CreatedAt = datetime('now')
WHERE Id = ?
`).run(
  data.postingMonth || entry.PostingMonth,
  data.consumption || entry.Consumption,
  data.comment || entry.Comment || '',
  'Modified and Validated',
  id
);

  return db.prepare('SELECT * FROM FormEntries WHERE Id = ?').get(id);
};

module.exports = {
  insertFormEntry,
  fetchFormEntries,
  fetchFormEntryById,
  changeFormEntryStatus,
  updateFormEntry,
};