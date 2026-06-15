const db = require('../config/db');

// Create Entry
const insertFormEntry = (data) => {
  const entryNumber = `ENTRY-${Date.now()}`;

  const stmt = db.prepare(`
    INSERT INTO FormEntries
    (
      EntryNumber,
      SiteCode,
      UtilityCode,
      PostingMonth,
      AccountMeterNo,
      Units,
      Consumption,
      Status,
      CreatedBy,
      FileName,
      FileUrl,
      PdfUrl,
      Comment
    )
    VALUES
    (
      @entryNumber,
      @siteCode,
      @utilityCode,
      @postingMonth,
      @accountMeterNo,
      @units,
      @consumption,
      @status,
      @createdBy,
      @fileName,
      @fileUrl,
      @pdfUrl,
      @comment
    )
  `);

  const result = stmt.run({
    entryNumber,
    siteCode: data.siteCode || '',
    utilityCode: data.utilityCode || '',
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
  });

  return db
    .prepare('SELECT * FROM FormEntries WHERE Id = ?')
    .get(result.lastInsertRowid);
};

// Get All Entries
const fetchFormEntries = (query) => {
  let sql = 'SELECT * FROM FormEntries WHERE 1=1';
  const params = [];

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
  const entry = db
    .prepare('SELECT * FROM FormEntries WHERE Id = ?')
    .get(id);

  if (!entry) {
    throw new Error('Entry not found');
  }

  db.prepare(`
    UPDATE FormEntries
    SET Status = ?
    WHERE Id = ?
  `).run(status, id);

  return db
    .prepare('SELECT * FROM FormEntries WHERE Id = ?')
    .get(id);
};

// Update Entry From UL Pure Details
const updateFormEntry = (id, data) => {
  console.log('==============================');
  console.log('UPDATE REQUEST RECEIVED');
  console.log('ID =', id);
  console.log('DATA =', data);

  const entry = db
    .prepare('SELECT * FROM FormEntries WHERE Id = ?')
    .get(id);

  console.log('FOUND ENTRY =', entry);

  if (!entry) {
    throw new Error('Entry not found');
  }

  db.prepare(`
    UPDATE FormEntries
    SET
      PostingMonth = ?,
      Consumption = ?,
      Comment = ?,
      Status = ?
    WHERE Id = ?
  `).run(
    data.postingMonth || entry.PostingMonth,
    data.consumption || entry.Consumption,
    data.comment || entry.Comment || '',
    'Modified',
    id
  );

  return db
    .prepare('SELECT * FROM FormEntries WHERE Id = ?')
    .get(id);
};

module.exports = {
  insertFormEntry,
  fetchFormEntries,
  fetchFormEntryById,
  changeFormEntryStatus,
  updateFormEntry,
};