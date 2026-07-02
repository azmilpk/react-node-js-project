const db = require('../config/db');
const { logFieldChanges } = require('./auditService');

// Aliased column list: returns UlpureData rows using the legacy UlPureEntries
// field names so existing controllers / frontend keep working unchanged.
const UL_COLUMNS = `
  Id,
  SourceEntryId,
  EntryNumber,
  COALESCE(FacilityCode, Facility) AS FacilityCode,
  COALESCE(SiteCode, Site) AS SiteCode,
  Site,
  Facility,
  EntryName,
  UtilityCode,
  Utility AS UtilityName,
  PostingDateMonth AS PostingMonth,
  AccountMeterNo,
  Units,
  Consumption,
  PreviousConsumptionUL,
  UlpureStatus AS Status,
  Comments AS Comment,
  FileName,
  FileUrl,
  CreatedBy,
  CreatedAt,
  ModifiedBy,
  ModifiedAt,
  ReviewStatus,
  ReviewedBy,
  ReviewedAt,
  FormulaCode,
  DataSource
`;

// Resolve normalized FK ids from free-text names (null-tolerant).
const siteIdStmt = db.prepare('SELECT Id FROM Sites WHERE SiteName = ?');
const utilityIdStmt = db.prepare('SELECT Id FROM UtilityTypes WHERE UtilityName = ?');
const resolveSiteId = (name) => (name ? siteIdStmt.get(name)?.Id ?? null : null);
const resolveUtilityId = (name) => (name ? utilityIdStmt.get(name)?.Id ?? null : null);

// Insert a manual (form-generated) row into UL Pure
const insertUlPureEntryFromFormEntry = (formEntry) => {
  const existing = db
    .prepare('SELECT * FROM UlpureData WHERE SourceEntryId = ?')
    .get(formEntry.Id);

  if (existing) {
    return existing;
  }

  const utilityName = formEntry.UtilityName || formEntry.UtilityCode || '';

  const stmt = db.prepare(`
    INSERT INTO UlpureData (
      SourceEntryId,
      EntryNumber,
      FacilityCode,
      SiteCode,
      Site,
      Facility,
      EntryName,
      UtilityCode,
      UtilityTypeId,
      SiteId,
      Utility,
      PostingDateMonth,
      AccountMeterNo,
      Units,
      Consumption,
      UlpureStatus,
      Comments,
      FileName,
      FileUrl,
      CreatedBy,
      DataSource
    )
    VALUES (
      @sourceEntryId,
      @entryNumber,
      @facilityCode,
      @siteCode,
      @site,
      @facility,
      @entryName,
      @utilityCode,
      @utilityTypeId,
      @siteId,
      @utility,
      @postingMonth,
      @accountMeterNo,
      @units,
      @consumption,
      @status,
      @comment,
      @fileName,
      @fileUrl,
      @createdBy,
      'Manual'
    )
  `);

  const result = stmt.run({
    sourceEntryId: formEntry.Id,
    entryNumber: formEntry.EntryNumber || '',
    facilityCode: formEntry.FacilityCode || '',
    siteCode: formEntry.SiteCode || '',
    site: formEntry.SiteCode || '',
    facility: formEntry.FacilityCode || '',
    entryName: formEntry.EntryName || '',
    utilityCode: formEntry.UtilityCode || '',
    utilityTypeId: resolveUtilityId(utilityName),
    siteId: resolveSiteId(formEntry.SiteCode),
    utility: utilityName,
    postingMonth: formEntry.PostingMonth || '',
    accountMeterNo: formEntry.AccountMeterNo || '',
    units: formEntry.Units || '',
    consumption: formEntry.Consumption || 0,
    status: 'Validate', // <-- BLUE STATUS
    comment: formEntry.Comment || '',
    fileName: formEntry.FileName || '',
    fileUrl: formEntry.FileUrl || '',
    createdBy: formEntry.CreatedBy || '',
  });

  return db
    .prepare('SELECT * FROM UlpureData WHERE Id = ?')
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
        'SELECT * FROM UlpureData WHERE SourceEntryId = ?'
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
      `SELECT ${UL_COLUMNS} FROM UlpureData ORDER BY Id DESC`
    )
    .all();
};



// Get one entry
const fetchUlPureEntryById = (id) => {
  return db
    .prepare(
      `SELECT ${UL_COLUMNS} FROM UlpureData WHERE Id = ?`
    )
    .get(id);
};



// Save from UL Pure Details page
const updateUlPureEntry = (id, data) => {
  const entry = fetchUlPureEntryById(id);

  if (!entry) {
    throw new Error('UL Pure entry not found');
  }

  const changedBy = data.modifiedBy || data.changedBy || 'Unknown User';

  const newValues = {
    PostingMonth: data.postingMonth || entry.PostingMonth,
    Consumption: data.consumption || entry.Consumption,
    Comment: data.comment || entry.Comment || '',
    Status: 'Validated',
  };

  logFieldChanges({
    tableName: 'UlpureData',
    recordId: id,
    oldRecord: entry,
    newFields: newValues,
    changedBy,
  });

  db.prepare(`
    UPDATE UlpureData
    SET
      PostingDateMonth = ?,
      Consumption = ?,
      Comments = ?,
      UlpureStatus = ?,
      ModifiedBy = ?,
      ModifiedAt = datetime('now')
    WHERE Id = ?
  `).run(
    newValues.PostingMonth,
    newValues.Consumption,
    newValues.Comment,
    newValues.Status,
    changedBy,
    id
  );

  return fetchUlPureEntryById(id);
};

const markUlPureReviewed = (id, reviewedBy) => {
  const entry = db.prepare('SELECT Id FROM UlpureData WHERE Id = ?').get(id);
  if (!entry) throw new Error('UL Pure entry not found');

  db.prepare(`
    UPDATE UlpureData
    SET ReviewStatus = 'Reviewed',
        ReviewedBy = ?,
        ReviewedAt = datetime('now')
    WHERE Id = ?
  `).run(reviewedBy || 'Unknown User', id);

  return fetchUlPureEntryById(id);
};


// Clear table (manual rows only; calculated rows are managed by the calc engine)
const clearUlPureEntries = () => {

  db.prepare(
    "DELETE FROM UlpureData WHERE DataSource = 'Manual'"
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
  markUlPureReviewed,
  clearUlPureEntries,
}; // ulPureService.js