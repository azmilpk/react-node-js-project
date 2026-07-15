const db = require('../config/db');
const { logFieldChanges } = require('./auditService');
const { calculateAll } = require('./calculationService');

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
  IndicatorName,
  IndicatorId,
  DataSource,
  COALESCE(
    (SELECT RegonId FROM Sites WHERE Sites.Id = UlpureData.SiteId),
    (SELECT RegonId FROM Sites WHERE Sites.SiteName = UlpureData.Site)
  ) AS RegonId
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
const ALLOWED_STATUSES = ['Validated', 'Modified and Validated'];

const moveModifiedValidatedEntriesToUlPure = ({
  site,
}) => {
  // ── Validation rules: must all pass before any calculation runs ──
  // Scope to a single site when provided, otherwise validate across all sites.
  let scopeWhere = '';
  const scopeParams = [];
  if (site) {
    scopeWhere = ' WHERE SiteCode = ?';
    scopeParams.push(site);
  }

  const allEntries = db
    .prepare(`SELECT Id, Status, PostingMonth FROM FormEntries${scopeWhere}`)
    .all(...scopeParams);

  if (allEntries.length === 0) {
    const err = new Error(
      site
        ? `No form entries found for site "${site}".`
        : 'No form entries found.'
    );
    err.status = 400;
    throw err;
  }

  // Rule 1: every row must be validated. If any row is Pending (or otherwise
  // not validated) the whole operation is blocked — no partial calculation.
  const blocking = allEntries.filter((e) => !ALLOWED_STATUSES.includes(e.Status));
  if (blocking.length > 0) {
    const pendingCount = blocking.filter((e) => e.Status === 'Pending').length;
    const err = new Error(
      `Cannot generate UL Pure: ${blocking.length} ` +
        `${blocking.length === 1 ? 'entry is' : 'entries are'} not validated` +
        `${pendingCount ? ` (${pendingCount} Pending)` : ''}. ` +
        `All entries must be "Validated" or "Modified and Validated" before generating.`
    );
    err.status = 400;
    throw err;
  }

  // Rule 2: at least two distinct months of data are required — delta indicators
  // (Water, District Heating) need a previous-month baseline to calculate.
  const months = [...new Set(allEntries.map((e) => e.PostingMonth).filter(Boolean))];
  if (months.length < 2) {
    const err = new Error(
      `Cannot generate UL Pure: at least two months of data are required ` +
        `(found ${months.length}: ${months.join(', ') || 'none'}). ` +
        `Delta indicators need a previous-month baseline.`
    );
    err.status = 400;
    throw err;
  }

  // ── Rules passed — run the calculation only ──
  // This does NOT move/promote form entries into UL Pure. It runs the backend
  // calc engine, which reads the raw GtoInvoices data and (re)writes only the
  // Calculated indicator rows.
  const results = calculateAll();
  const calculatedCount = results.filter((r) => !r.skipped).length;

  return {
    calculatedCount,
    message: `${calculatedCount} calculated row${calculatedCount === 1 ? '' : 's'} generated`,
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