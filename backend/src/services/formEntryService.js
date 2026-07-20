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

// Utilities that must run through a meter formula instead of DIRECT passthrough.
const FORMULA_CODE_BY_UTILITY = {
  Electricity: 'ELEC_STD',
  'District Heating': 'DH_STD',
  Water: 'WATER_NET',
  LPG: 'LPG_STD',
  Diesel: 'DIESEL_STD',
  'Produced Units': 'PRODUCED_STD',
};

// Account/meter name -> ValueSlot used by the calc formulas. Must stay in sync
// with ACCOUNT_VALUE_SLOT in scripts/importGtoInvoices.js. Single-value
// utilities (LPG/Diesel/Produced Units) have no meter picker, so they fall back
// to 'V1', which is the slot their formulas read.
const ACCOUNT_VALUE_SLOT = {
  // Electricity
  'Elektricitet, totalt A+T kWh': 'V1',
  'Elektricitet_billaddplatser_kWh': 'V2',
  'Elektricitet, publik lastbilsladdare (T3) kWh': 'V3',
  'Elektricitet_publik lastbilsladdare_(E)_kWh': 'V4',
  'Elförbruk E-hallen kWh': 'V5',
  // District Heating
  'Huvudmätare_T_MWh': 'V1',
  'Omk.rum_mätare_T_(nya mätaren_MWh)': 'V2',
  'Kompressor_återvinning _VS 3_MWh': 'V3',
  'Härdverk_T_MWh': 'V4',
  '85148787_MWh': 'V5',
  'Graddagsfaktor_Köping_SMHI': 'V6',
  'Verklig_Energi_Patrik': 'V13',
  // Water
  '12812696_A_verkstad': 'V1',
  '12812699_A_verkstad': 'V2',
  '12812698_A_verkstad': 'V3',
  '68511391_T_verkstad': 'V4',
  '6919964_Kyltorn_T-härd': 'V9',
  '6794762_Kyltorn_A-härd-borttagen': 'V10',
  '78102820_nödkyla_ugn_6_KB02': 'V11',
  '6 KB01': 'V12',
  'GKN_Water': 'V15',
  'Stena_Fosfateringsvatten': 'V16',
  'Stena_Emulsioner': 'V17',
  'E-hallen_förbrukning_m3': 'V18',
  // single-value utilities
  'LPG_Propane_Gasoline': 'V1',
  'Produced Units': 'V1',
};

const US_SITES = new Set(['RT100', 'MEC', 'Macungie', 'LVLC']);

// Compute the ValueSlot a manual entry occupies. US sites can have several
// meters for one utility in the same month; their formulas sum all slots, so
// each meter gets a distinct, stable slot (its meter no, else a unique seed).
// Köping uses its fixed meter-picker slot map.
const resolveValueSlot = (siteCode, accountMeterNo, slotSeed) => {
  if (US_SITES.has(siteCode)) {
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
  g.Facility AS FacilityCode,
  COALESCE(u.UtilityName, g.TemplateType) AS UtilityName,
  g.PostingDateMonth AS PostingMonth,
  g.AccountNumber AS AccountMeterNo,
  g.Units AS Units,
  g.Consumption AS Consumption,
  g.PreviousConsumption AS PreviousConsumption,
  g.InvoiceDate AS InvoiceDate,
  g.InvoiceNo AS InvoiceNo,
  COALESCE(g.Status, 'Pending') AS Status,
  g.BotStatus AS BotStatus,
  g.ValidateUser AS ValidateUser,
  g.ValidatorLoginTime AS ValidatorLoginTime,
  g.Approver AS Approver,
  g.Comments AS Comment,
  g.CreatedBy AS CreatedBy,
  g.CreatedAt AS CreatedAt,
  g.ModifiedBy AS ModifiedBy,
  g.ModifiedAt AS ModifiedAt,
  g.DataSource AS DataSource
`;

const selectEntryById = (id) =>
  db
    .prepare(
      `SELECT ${ENTRY_COLUMNS}
       FROM GtoInvoices g
       LEFT JOIN Sites s ON s.Id = g.SiteId
       LEFT JOIN UtilityTypes u ON u.Id = g.UtilityTypeId
       WHERE g.Id = ?`
    )
    .get(id);

// Create Entry
const insertFormEntry = (data) => {
  const slotSeed = `E${Date.now()}`;
  const siteCode = data.siteCode || '';
  const utilityName = data.utilityName || data.utilityCode || '';
  const accountMeterNo = data.accountMeterNo || '';
  const valueSlot = resolveValueSlot(siteCode, accountMeterNo, slotSeed);
  const formulaCode = FORMULA_CODE_BY_UTILITY[utilityName] || 'DIRECT';

  const stmt = db.prepare(`
    INSERT INTO GtoInvoices
    (
      PostingDateMonth,
      AccountNumber,
      Units,
      Consumption,
      Status,
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
      Facility,
      ValueSlot,
      FormulaCode
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
      @facility,
      @valueSlot,
      @formulaCode
    )
  `);

  const result = stmt.run({
    postingMonth: data.postingMonth || '',
    accountNumber: accountMeterNo || utilityName || '',
    units: data.units || '',
    consumption: Number(data.consumption) || 0,
    status: data.status || 'Validated',
    createdBy: data.createdBy || 'frontend-user',
    pdfFile: data.fileUrl || '',
    comment: data.comment || '',
    invoiceDate: data.invoiceDate || null,
    invoiceNo: data.invoiceNo || null,
    botStatus: data.botStatus || 'Manual',
    validateUser: data.validateUser || null,
    validatorLoginTime: data.validatorLoginTime || null,
    approver: data.approver || null,
    utilityTypeId: resolveUtilityId(utilityName),
    siteId: resolveSiteId(siteCode),
    templateType: utilityName,
    facility: data.facilityCode || '',
    valueSlot,
    formulaCode,
  });

  return selectEntryById(result.lastInsertRowid);
};

// Get All Entries
const fetchFormEntries = (query) => {
  let sql = `SELECT ${ENTRY_COLUMNS}
       FROM GtoInvoices g
       LEFT JOIN Sites s ON s.Id = g.SiteId
       LEFT JOIN UtilityTypes u ON u.Id = g.UtilityTypeId
       WHERE 1=1`;
  const params = [];

  if (query.facilityCode) {
    sql += ' AND g.Facility = ?';
    params.push(query.facilityCode);
  }

  if (query.siteCode) {
    sql += ' AND s.SiteName = ?';
    params.push(query.siteCode);
  }

  if (query.status) {
    sql += " AND COALESCE(g.Status, 'Pending') = ?";
    params.push(query.status);
  }

  sql += ' ORDER BY g.Id DESC';

  return db.prepare(sql).all(...params);
};

// Get Entry By Id
const fetchFormEntryById = (id) => selectEntryById(id);

// Change Status (Approve from the Validate page)
const changeFormEntryStatus = (id, status, changedBy) => {
  const entry = db.prepare('SELECT * FROM GtoInvoices WHERE Id = ?').get(id);
  if (!entry) throw new Error('Entry not found');

  let finalStatus = status;
  if (status === 'Validated' && entry.Status === 'Modified') {
    finalStatus = 'Modified and Validated';
  }

  logFieldChanges({
    tableName: 'GtoInvoices',
    recordId: id,
    oldRecord: entry,
    newFields: { Status: finalStatus },
    changedBy: changedBy || 'Unknown User',
  });

  db.prepare('UPDATE GtoInvoices SET Status = ?, ModifiedBy = ?, ModifiedAt = datetime(\'now\') WHERE Id = ?').run(finalStatus, changedBy || 'Unknown User', id);
  return selectEntryById(id);
};

// Update Entry (Modify + Save from the Validate Details page)
const updateFormEntry = (id, data) => {
  const entry = db.prepare('SELECT * FROM GtoInvoices WHERE Id = ?').get(id);

  if (!entry) {
    throw new Error('Entry not found');
  }

  const changedBy = data.changedBy || data.modifiedBy || 'Unknown User';

  const alreadyValidated =
    entry.Status === 'Validated' || entry.Status === 'Modified and Validated';

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
    nextStatus = hasChanges ? 'Modified and Validated' : entry.Status;
  } else {
    nextStatus = 'Validated';
  }

  const newValues = {
    ...nextValues,
    Status: nextStatus,
  };

  logFieldChanges({
    tableName: 'GtoInvoices',
    recordId: id,
    oldRecord: entry,
    newFields: newValues,
    changedBy,
  });

  db.prepare(`
    UPDATE GtoInvoices
    SET
      PostingDateMonth = ?,
      Consumption = ?,
      Comments = ?,
      Status = ?,
      ModifiedBy = ?,
      ModifiedAt = datetime('now')
    WHERE Id = ?
  `).run(
    newValues.PostingDateMonth,
    newValues.Consumption,
    newValues.Comments,
    newValues.Status,
    changedBy,
    id
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