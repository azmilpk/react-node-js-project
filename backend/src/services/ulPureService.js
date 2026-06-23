const db = require('../config/db');
// Insert into UL Pure table
const insertUlPureEntryFromFormEntry = (formEntry) => {
  const existing = db
    .prepare(
      'SELECT * FROM UlPureEntries WHERE SourceEntryId = ?'
    )
    .get(formEntry.Id);

  if (existing) {
    return existing;
  }

  const stmt = db.prepare(`
    INSERT INTO UlPureEntries (
      SourceEntryId,
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
      Comment,
      FileName,
      FileUrl,
      CreatedBy
    )
    VALUES (
      @sourceEntryId,
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
      @comment,
      @fileName,
      @fileUrl,
      @createdBy
    )
  `);

  const result = stmt.run({
    sourceEntryId: formEntry.Id,
    entryNumber: formEntry.EntryNumber || '',
    facilityCode: formEntry.FacilityCode || '',
    siteCode: formEntry.SiteCode || '',
    entryName: formEntry.EntryName || '',
    utilityCode: formEntry.UtilityCode || '',
    utilityName:
      formEntry.UtilityName || formEntry.UtilityCode || '',
    postingMonth: formEntry.PostingMonth || '',
    accountMeterNo: formEntry.AccountMeterNo || '',
    units: formEntry.Units || '',
    consumption: formEntry.Consumption || '',
    status: 'Validate', // <-- BLUE STATUS
    comment: formEntry.Comment || '',
    fileName: formEntry.FileName || '',
    fileUrl: formEntry.FileUrl || '',
    createdBy: formEntry.CreatedBy || '',
  });

  return db
    .prepare('SELECT * FROM UlPureEntries WHERE Id = ?')
    .get(result.lastInsertRowid);
};



// Generate UL Pure
const moveModifiedValidatedEntriesToUlPure = ({
  site,
  status,
}) => {
  let sql = `
    SELECT *
    FROM FormEntries
    WHERE Status = ?
  `;

  const params = [
    status || 'Modified and Validated',
  ];

  if (site) {
    sql += ' AND SiteCode = ?';
    params.push(site);
  }

  const entries = db.prepare(sql).all(...params);

  let movedCount = 0;

  for (const entry of entries) {
    const existing = db
      .prepare(
        'SELECT * FROM UlPureEntries WHERE SourceEntryId = ?'
      )
      .get(entry.Id);

    if (!existing) {
      insertUlPureEntryFromFormEntry(entry);
      movedCount++;
    }
  }

  return {
    movedCount,
    totalFound: entries.length,
    message: `${movedCount} entries moved to UL Pure`,
  };
};



// Get all UL Pure entries
const fetchUlPureEntries = () => {
  return db
    .prepare(
      'SELECT * FROM UlPureEntries ORDER BY Id DESC'
    )
    .all();
};



// Get one entry
const fetchUlPureEntryById = (id) => {
  return db
    .prepare(
      'SELECT * FROM UlPureEntries WHERE Id = ?'
    )
    .get(id);
};



// Save from UL Pure Details page
const updateUlPureEntry = (id, data) => {

  const entry = db
    .prepare(
      'SELECT * FROM UlPureEntries WHERE Id = ?'
    )
    .get(id);

  if (!entry) {
    throw new Error('UL Pure entry not found');
  }

  db.prepare(`
    UPDATE UlPureEntries
    SET
      PostingMonth = ?,
      Consumption = ?,
      Comment = ?,
      Status = ?,
      ModifiedBy = ?,
      ModifiedAt = datetime('now')
    WHERE Id = ?
  `).run(
    data.postingMonth || entry.PostingMonth,
    data.consumption || entry.Consumption,
    data.comment || entry.Comment || '',
    'Validated', // <-- GREEN STATUS AFTER SAVE
    data.modifiedBy || 'Unknown User',
    id
  );

  return db
    .prepare(
      'SELECT * FROM UlPureEntries WHERE Id = ?'
    )
    .get(id);
};



// Clear table
const clearUlPureEntries = () => {

  db.prepare(
    'DELETE FROM UlPureEntries'
  ).run();

  return {
    message: 'UL Pure table cleared successfully'
  };
};



module.exports = {
  insertUlPureEntryFromFormEntry,
  moveModifiedValidatedEntriesToUlPure,
  fetchUlPureEntries,
  fetchUlPureEntryById,
  updateUlPureEntry,
  clearUlPureEntries,
};