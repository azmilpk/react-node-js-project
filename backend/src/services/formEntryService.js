const db = require('../config/db');
const { logFieldChanges } = require('./auditService');

// ------------------------------------------------------------------ //
// Consolidated entry model                                            //
// FormEntries is retired: manual form entries are written directly    //
// into the single GtoInvoices landing table (the same table the bot   //
// imports into and the calc engine reads). A manual entry is a single //
// already-final meter reading, tagged DataSource='FormEntry' with a   //
// DIRECT (pass-through) formula so the calc engine echoes it straight //
// into UlpureData without applying meter-delta math.                  //
// ------------------------------------------------------------------ //
const resolveSiteId = async (siteName) => {
  if (!siteName) return null;
  const row = await db.get('SELECT Id FROM Sites WHERE SiteName = ?', [siteName]);
  return row ? row.Id : null;
};

const resolveUtilityId = async (utilityName) => {
  if (!utilityName) return null;
  const row = await db.get(
    'SELECT Id FROM UtilityTypes WHERE UtilityName = ?',

    [utilityName]
  );
  return row ? row.Id : null;
};

// Utilities that must run through a meter formula instead of DIRECT passthrough.
const FORMULA_CODE_BY_UTILITY = {
  Electricity: 'ELEC_STD',
  'District Heating': 'DH_STD',
  Water: 'WATER_NET',
  LPG: 'LPG_STD',
  Diesel: 'DIESEL_STD',
  'Produced Units': 'PRODUCED_STD',
};

// Generic demo meter reference -> value slot. Keep real meter mappings outside
// the public project.
const ACCOUNT_VALUE_SLOT = {
  'METER-001': 'V1',
  'METER-002': 'V2',
  'METER-003': 'V3',
};

const MULTI_METER_SITES = new Set(['Charlie Plant', 'Delta Plant', 'Echo Plant', 'Foxtrot Plant']);

// Compute the value slot for a manual entry. Multi-meter demo sites receive a
// stable slot per meter reference; all other sites use the generic slot map.
const resolveValueSlot = (siteCode, accountMeterNo, slotSeed) => {
  if (MULTI_METER_SITES.has(siteCode)) {
    return accountMeterNo || slotSeed;
  }
  return ACCOUNT_VALUE_SLOT[accountMeterNo] || 'V1';
};

// Aliased column list so fetch* return the field names the Validate page
// expects. Site/facility/utility/meter are derived from existing columns:
// SiteId -> SiteName, Facility, UtilityTypeId -> UtilityName (else TemplateType),
// and AccountNumber. Invoice/validation/bot fields are surfaced for both bot
// and manual rows so the single table drives the whole Validate view.
const ENTRY_COLUMNS = `
  g.Id AS Id,
  s.SiteName AS SiteCode,
  s.SiteName AS Site,
  CASE WHEN s.SiteName = 'Bravo Plant' THEN s.SiteName ELSE g.Facility END AS FacilityCode,
  g.TemplateType AS UtilityName,
  g.Postingdatemonth AS PostingMonth,
  g.Accountnumber AS AccountMeterNo,
  g.units AS Units,
  g.Consumption AS Consumption,
  g.PreviousConsumption AS PreviousConsumption,
  g.Invoicedate AS InvoiceDate,
  g.InvoiceNo AS InvoiceNo,
  COALESCE(g.Hitl, 'Pending') AS Status,
  g.Botstatus AS BotStatus,
  g.Validateuser AS ValidateUser,
  g.validatorLoginTime AS ValidatorLoginTime,
  g.Approver AS Approver,
  g.Comments AS Comment,
  g.CreatedBy AS CreatedBy,
  g.createddate AS CreatedAt,
  g.ModifiedBy AS ModifiedBy,
  g.ModifiedAt AS ModifiedAt,
  g.Datasource AS DataSource,
  g.PdfFile AS FileUrl
`;

const selectEntryById = (id) =>
  db.get(
    `SELECT ${ENTRY_COLUMNS}
       FROM Gto_Invoices g
       LEFT JOIN Sites s ON s.Id = g.SiteId
       WHERE g.Id = ?`,
    [id]
  );

// Create Entry
const insertFormEntry = async (data) => {
  const slotSeed = `E${Date.now()}`;
  const siteCode = data.siteCode || '';
  const utilityName = data.utilityName || data.utilityCode || '';
  const accountMeterNo = data.accountMeterNo || '';
  const valueSlot = resolveValueSlot(siteCode, accountMeterNo, slotSeed);
  const formulaCode = FORMULA_CODE_BY_UTILITY[utilityName] || 'DIRECT';
  const postingMonth = data.postingMonth || '';
  const utilityTypeId = await resolveUtilityId(utilityName);
  const siteId = await resolveSiteId(siteCode);

  const params = {
    postingMonth,
    accountNumber: accountMeterNo || utilityName || '',
    units: data.units || '',
    consumption: Number(data.consumption) || 0,
    status: data.status || 'Pending',
    createdBy: data.createdBy || 'frontend-user',
    pdfFile: data.fileUrl || '',
    comment: data.comment || '',
    invoiceDate: data.invoiceDate || null,
    invoiceNo: data.invoiceNo || null,
    botStatus: data.botStatus || 'Manual',
    validateUser: data.validateUser || null,
    validatorLoginTime: data.validatorLoginTime || null,
    approver: data.approver || null,
    freshWater: (siteCode === 'Alpha Plant' && utilityName === 'Water') ? 0.9 : null,
    evaporation: (siteCode === 'Alpha Plant' && utilityName === 'Water') ? 1.25 : null,
    utilityTypeId,
    siteId,
    templateType: utilityName,
    site: data.facilityCode || '',
    facility: siteCode || '',
    valueSlot,
    formulaCode,
  };

  // One row per site/utility/meter-slot/month (UX_GtoInvoices_source). A
  // resubmission for the same combo (e.g. correcting a mistake) updates the
  // existing row instead of throwing a UNIQUE constraint error and losing the data.
  const existing = await db.get(
    `SELECT Id FROM Gto_Invoices
       WHERE ((SiteId = @siteId) OR (SiteId IS NULL AND @siteId IS NULL))
         AND ((UtilityTypeId = @utilityTypeId) OR (UtilityTypeId IS NULL AND @utilityTypeId IS NULL))
         AND ValueSlot = @valueSlot AND PostingDateMonth = @postingMonth`,
    { siteId, utilityTypeId, valueSlot, postingMonth }
  );

  if (existing) {
    await db.run(
      `UPDATE Gto_Invoices SET
        AccountNumber = @accountNumber,
        Units = @units,
        Consumption = @consumption,
        Hitl = @status,
        PdfFile = @pdfFile,
        Comments = @comment,
        InvoiceDate = @invoiceDate,
        InvoiceNo = @invoiceNo,
        BotStatus = @botStatus,
        ValidateUser = @validateUser,
        ValidatorLoginTime = @validatorLoginTime,
        Approver = @approver,
        DataSource = 'FormEntry',
        TemplateType = @templateType,
        Site = @site,
        Facility = @facility,
        FormulaCode = @formulaCode,
        FreshWaterStaticValue = @freshWater,
        EvaporationFactorValue = @evaporation,
        ModifiedBy = @createdBy,
        ModifiedAt = GETDATE()
      WHERE Id = @id`,
      { ...params, id: existing.Id }
    );

    return selectEntryById(existing.Id);
  }

  const result = await db.run(
    `INSERT INTO Gto_Invoices
      (
        PostingDateMonth,
        AccountNumber,
        Units,
        Consumption,
        Hitl,
        CreatedBy,
        PdfFile,
        Comments,
        InvoiceDate,
        InvoiceNo,
        BotStatus,
        ValidateUser,
        ValidatorLoginTime,
        Approver,
        DataSource,
        UtilityTypeId,
        SiteId,
        TemplateType,
        Site,
        Facility,
        ValueSlot,
        FormulaCode,
        FreshWaterStaticValue,
        EvaporationFactorValue
      )
      VALUES
      (
        @postingMonth,
        @accountNumber,
        @units,
        @consumption,
        @status,
        @createdBy,
        @pdfFile,
        @comment,
        @invoiceDate,
        @invoiceNo,
        @botStatus,
        @validateUser,
        @validatorLoginTime,
        @approver,
        'FormEntry',
        @utilityTypeId,
        @siteId,
        @templateType,
        @site,
        @facility,
        @valueSlot,
        @formulaCode,
        @freshWater,
        @evaporation
      )`,
    params
  );

  return selectEntryById(result.lastInsertRowid);
};

// Get All Entries
const fetchFormEntries = async (query) => {
  let sql = `SELECT ${ENTRY_COLUMNS}
       FROM Gto_Invoices g
       LEFT JOIN Sites s ON s.Id = g.SiteId
       WHERE 1=1`;
  const params = [];

  if (query.facilityCode) {
    sql += ' AND s.Facility = ?';
    params.push(query.facilityCode);
  }

  if (query.siteCode) {
    sql += ' AND s.SiteName = ?';
    params.push(query.siteCode);
  }

  if (query.status) {
    sql += " AND COALESCE(g.Hitl, 'Pending') = ?";
    params.push(query.status);
  }

  sql += ' ORDER BY g.Id DESC';

  return db.all(sql, params);
};

// Get Entry By Id
const fetchFormEntryById = (id) => selectEntryById(id);

// Change Status (Approve from the Validate page)
const changeFormEntryStatus = async (id, status, changedBy) => {
  const entry = await db.get('SELECT * FROM Gto_Invoices WHERE Id = ?', [id]);
  if (!entry) throw new Error('Entry not found');

  let finalStatus = status;
  if (status === 'Validated' && entry.Hitl === 'Modified') {
    finalStatus = 'Modified and Validated';
  }

  await logFieldChanges({
    tableName: 'GtoInvoices',
    recordId: id,
    oldRecord: entry,
    newFields: { Hitl: finalStatus },
    changedBy: changedBy || 'Unknown User',
  });

  await db.run(
    "UPDATE Gto_Invoices SET Hitl = ?, ModifiedBy = ?, ModifiedAt = GETDATE() WHERE Id = ?",
    [finalStatus, changedBy || 'Unknown User', id]
  );
  return selectEntryById(id);
};

// Update Entry (Modify + Save from the Validate Details page)
const updateFormEntry = async (id, data) => {
  const entry = await db.get('SELECT * FROM Gto_Invoices WHERE Id = ?', [id]);

  if (!entry) {
    throw new Error('Entry not found');
  }

  const changedBy = data.changedBy || data.modifiedBy || 'Unknown User';

  const alreadyValidated =
    entry.Hitl === 'Validated' || entry.Hitl === 'Modified and Validated';

  const nextValues = {
    PostingDateMonth: data.postingMonth || entry.PostingDateMonth,
    Consumption: data.consumption || entry.Consumption,
    Comments: data.comment || entry.Comments || '',
  };

  const hasChanges =
    String(nextValues.PostingDateMonth ?? '') !== String(entry.PostingDateMonth ?? '') ||
    String(nextValues.Consumption ?? '') !== String(entry.Consumption ?? '') ||
    String(nextValues.Comments ?? '') !== String(entry.Comments ?? '');

  let nextStatus;
  if (alreadyValidated) {
    // Only downgrade to "Modified and Validated" when something actually changed.
    nextStatus = hasChanges ? 'Modified and Validated' : entry.Hitl;
  } else {
    nextStatus = 'Validated';
  }

  const newValues = {
    ...nextValues,
    Hitl: nextStatus,
  };

  await logFieldChanges({
    tableName: 'GtoInvoices',
    recordId: id,
    oldRecord: entry,
    newFields: newValues,
    changedBy,
  });

  await db.run(
    `UPDATE Gto_Invoices
    SET
      PostingDateMonth = ?,
      Consumption = ?,
      Comments = ?,
      Hitl = ?,
      ValidateUser = ?,
      ValidatorLoginTime = GETDATE(),
      ModifiedBy = ?,
      ModifiedAt = GETDATE()
    WHERE Id = ?`,
    [
      newValues.PostingDateMonth,
      newValues.Consumption,
      newValues.Comments,
      newValues.Hitl,
      changedBy,
      changedBy,
      id,
    ]
  );

  return selectEntryById(id);
};

module.exports = {
  insertFormEntry,
  fetchFormEntries,
  fetchFormEntryById,
  changeFormEntryStatus,
  updateFormEntry,
};
