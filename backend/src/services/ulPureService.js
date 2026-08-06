const db = require('../config/db');
const REGON_IDS = require('../config/regonIds');
const { logFieldChanges } = require('./auditService');
const { calculateAll, prevMonth, FORMULA_DESCRIPTIONS, NRV_SUM_UTILITIES } = require('./calculationService');

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
  DataSource
`;

// Resolve normalized FK ids from free-text names (null-tolerant).
const resolveSiteId = async (name) => {
  if (!name) return null;
  const row = await db.get('SELECT Id FROM Sites WHERE SiteName = ?', [name]);
  return row ? row.Id : null;
};
const resolveUtilityId = async (name) => {
  if (!name) return null;
  const row = await db.get(
    'SELECT UtilityTypeID AS Id FROM UtilityTypes WHERE UtilityName = ?',
    [name]
  );
  return row ? row.Id : null;
};

// Insert a manual (form-generated) row into UL Pure
const insertUlPureEntryFromFormEntry = async (formEntry) => {
  const existing = await db.get(
    'SELECT * FROM UlpureData WHERE SourceEntryId = ?',
    [formEntry.Id]
  );

  if (existing) {
    return existing;
  }

  const utilityName = formEntry.UtilityName || formEntry.UtilityCode || '';

  const result = await db.run(
    `INSERT INTO UlpureData (
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
    )`,
    {
      sourceEntryId: formEntry.Id,
      entryNumber: formEntry.EntryNumber || '',
      facilityCode: formEntry.FacilityCode || '',
      siteCode: formEntry.SiteCode || '',
      site: formEntry.SiteCode || '',
      facility: formEntry.FacilityCode || '',
      entryName: formEntry.EntryName || '',
      utilityCode: formEntry.UtilityCode || '',
      utilityTypeId: await resolveUtilityId(utilityName),
      siteId: await resolveSiteId(formEntry.SiteCode),
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
    }
  );

  return db.get('SELECT * FROM UlpureData WHERE Id = ?', [result.lastInsertRowid]);
};



// Generate UL Pure
const ALLOWED_STATUSES = ['Validated', 'Modified and Validated'];

const moveModifiedValidatedEntriesToUlPure = async ({
  site,
}) => {
  // ── Validation rules: must all pass before any calculation runs ──
  // Scope to a single site when provided, otherwise validate across all sites.
  // Entries now live in the single GtoInvoices table (bot + manual), scoped by
  // the site FK so bot rows (which carry SiteId, not SiteCode) are included.
  let scopeWhere = '';
  const scopeParams = [];
  if (site) {
    scopeWhere = ' WHERE SiteId = (SELECT Id FROM Sites WHERE SiteName = ?)';
    scopeParams.push(site);
  }

  const allEntries = await db.all(
    `SELECT Id, COALESCE(Status, 'Pending') AS Status,
              PostingDateMonth AS PostingMonth
         FROM GtoInvoices${scopeWhere}`,
    scopeParams
  );

  if (allEntries.length === 0) {
    const err = new Error(
      site
        ? `No entries found for site "${site}".`
        : 'No entries found.'
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

  // Rule 2: Köping's delta indicators (Water, District Heating) need a
  // previous-month baseline, so it requires at least two distinct months. Other
  // sites are pass-through / aggregation and calculate fine from a single month.
  // Only gate this when the generate is actually scoped to Köping — a global
  // "all sites" generate must not be blocked by Köping's baseline requirement.
  if (site === 'Köping') {
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
  }

  // ── Rules passed — run the calculation only ──
  // This does NOT move/promote form entries into UL Pure. It runs the backend
  // calc engine, which reads the raw GtoInvoices data and (re)writes only the
  // Calculated indicator rows — scoped to the selected site when provided.
  const results = await calculateAll({ site });
  const calculatedCount = results.filter((r) => !r.skipped).length;

  return {
    calculatedCount,
    message: `${calculatedCount} calculated row${calculatedCount === 1 ? '' : 's'} generated`,
  };
};



// Get all UL Pure entries
const fetchUlPureEntries = async () => {
  const rows = await db.all(
    `SELECT ${UL_COLUMNS} FROM UlpureData ORDER BY Id DESC`
  );
  return rows.map((row) => ({
    ...row,
    RegonId: REGON_IDS[row.Site] || null,
    FormulaDescription:
      FORMULA_DESCRIPTIONS[row.FormulaCode] ||
      (row.DataSource === 'Manual' ? 'Manual entry value, used as-is (no calculation)' : '-'),
  }));
};


// Get one entry
const fetchUlPureEntryById = async (id) => {
  const row = await db.get(`SELECT ${UL_COLUMNS} FROM UlpureData WHERE Id = ?`, [id]);
  if (row) row.RegonId = REGON_IDS[row.Site] || null;
  return row;
};



// Save from UL Pure Details page
const updateUlPureEntry = async (id, data) => {
  const entry = await fetchUlPureEntryById(id);

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

  await logFieldChanges({
    tableName: 'UlpureData',
    recordId: id,
    oldRecord: entry,
    newFields: newValues,
    changedBy,
  });

  await db.run(
    `UPDATE UlpureData
    SET
      PostingMonth = ?,
      Consumption = ?,
      Comment = ?,
      Status = ?,
      ModifiedBy = ?,
      ModifiedAt = GETDATE()
    WHERE Id = ?`,
    [
      newValues.PostingMonth,
      newValues.Consumption,
      newValues.Comment,
      newValues.Status,
      changedBy,
      id,
    ]
  );

  return fetchUlPureEntryById(id);
};

const markUlPureReviewed = async (id, reviewedBy) => {
  const entry = await db.get('SELECT Id FROM UlpureData WHERE Id = ?', [id]);
  if (!entry) throw new Error('UL Pure entry not found');

  await db.run(
    `UPDATE UlpureData
    SET ReviewStatus = 'Reviewed',
        ReviewedBy = ?,
        ReviewedAt = GETDATE()
    WHERE Id = ?`,
    [reviewedBy || 'Unknown User', id]
  );

  return fetchUlPureEntryById(id);
};


// Clear table (manual rows only; calculated rows are managed by the calc engine)
const clearUlPureEntries = async () => {
  await db.run("DELETE FROM UlpureData WHERE DataSource = 'Manual'");

  return {
    message: 'UL Pure table cleared successfully'
  };
};


const RAW_COLUMNS = `
  Id, ValueSlot, TemplateType, Consumption, PostingDateMonth, Units,
  AccountNumber, DataSource, InvoiceNo, PdfFile, ValidateUser, Status, Comments, CreatedAt
`;

// Raw GtoInvoices rows that fed a specific Calculated UlpureData entry —
// current month, plus the previous month (needed for delta utilities like
// Water/District Heating; harmless to include for the rest).
const fetchRawDataForUlPureEntry = async (id) => {
  const entry = await db.get(
    'SELECT SiteId, UtilityTypeId, PostingDateMonth, Utility, FormulaCode FROM UlpureData WHERE Id = ?',
    [id]
  );
  if (!entry) {
    const err = new Error('UL Pure entry not found');
    err.status = 404;
    throw err;
  }

  const currentMonth = entry.PostingDateMonth;

  // NRV (aggregate mode) rows have no UtilityTypeId/ValueSlot — they're a
  // SUM(Consumption) over rows matching the formula's TemplateType filter, and
  // don't need a previous month (no delta math), so only the current month applies.
  if (entry.UtilityTypeId == null) {
    const sumConfig = NRV_SUM_UTILITIES.find((s) => s.code === entry.FormulaCode);
    const rows = sumConfig && currentMonth
      ? await db.all(
          `SELECT ${RAW_COLUMNS} FROM GtoInvoices
          WHERE SiteId = ? AND PostingDateMonth = ? AND (${sumConfig.where})
          ORDER BY Id`,
          [entry.SiteId, currentMonth]
        )
      : [];

    return {
      utility: entry.Utility,
      mode: 'aggregate',
      currentMonth: { month: currentMonth, rows },
      previousMonth: { month: null, rows: [] },
    };
  }

  const rawQuery = `
    SELECT ${RAW_COLUMNS} FROM GtoInvoices
    WHERE SiteId = ? AND UtilityTypeId = ? AND PostingDateMonth = ?
    ORDER BY ValueSlot
  `;

  const previousMonth = currentMonth ? prevMonth(currentMonth) : null;

  return {
    utility: entry.Utility,
    mode: 'slot',
    currentMonth: {
      month: currentMonth,
      rows: currentMonth
        ? await db.all(rawQuery, [entry.SiteId, entry.UtilityTypeId, currentMonth])
        : [],
    },
    previousMonth: {
      month: previousMonth,
      rows: previousMonth
        ? await db.all(rawQuery, [entry.SiteId, entry.UtilityTypeId, previousMonth])
        : [],
    },
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
  fetchRawDataForUlPureEntry,
}; // ulPureService.js