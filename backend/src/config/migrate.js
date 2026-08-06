// ─────────────────────────────────────────────────────────────────────────────
// Azure SQL migration: schema is now managed EXTERNALLY.
// This startup migration is intentionally disabled — the app no longer creates,
// alters, seeds, or drops any tables/columns. Provision and evolve the schema
// directly in Azure SQL (tables are added gradually). The legacy SQLite DDL
// below is kept for reference only and never executes because of this return.
// ─────────────────────────────────────────────────────────────────────────────
console.log('Schema managed externally (Azure SQL) — startup migration skipped.');
return;

// eslint-disable-next-line no-unreachable
const db = require('./db');

db.exec('DROP TABLE IF EXISTS FormEntries;');

db.exec(`
  CREATE TABLE IF NOT EXISTS AuditLog (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TableName TEXT NOT NULL,
    RecordId INTEGER NOT NULL,
    FieldName TEXT NOT NULL,
    OldValue TEXT,
    NewValue TEXT,
    ChangedBy TEXT,
    ChangedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const ensureColumn = (tableName, columnName, definition) => {
  try {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
    console.log(`${columnName} column added to ${tableName}`);
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log(`${columnName} already exists in ${tableName}`);
    } else {
      throw error;
    }
  }
};

// Physically remove a column left over from a retired design. Idempotent:
// once the column is gone, subsequent runs are a no-op.
const dropColumn = (tableName, columnName) => {
  try {
    db.exec(`ALTER TABLE ${tableName} DROP COLUMN ${columnName};`);
    console.log(`${columnName} column dropped from ${tableName}`);
  } catch (error) {
    if (error.message.includes('no such column')) {
      // Already removed (or never existed) — nothing to do.
    } else {
      throw error;
    }
  }
};

/* ------------------------------------------------------------------ *
 * Improved schema (Path B): normalized lookups + typed raw/clean data
 * Added alongside the legacy tables so the running app is unaffected.
 * ------------------------------------------------------------------ */

// Lookup: utility types (kills free-text "Electricity"/"electricity" drift)
db.exec(`
  CREATE TABLE IF NOT EXISTS UtilityTypes (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UtilityName TEXT NOT NULL UNIQUE
  );
`);

// Lookup: sites (kills the Köping / KOP duplication)
db.exec(`
  CREATE TABLE IF NOT EXISTS Sites (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    SiteName TEXT NOT NULL UNIQUE
  );
`);

// Raw landing table (improved Gto_Invoices): typed numbers, ValueSlot, FKs
db.exec(`
  CREATE TABLE IF NOT EXISTS GtoInvoices (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    AccountNumber TEXT,
    ValueSlot TEXT,
    Consumption REAL,
    PreviousConsumption REAL,
    FreshWaterStaticValue REAL,
    EvaporationFactorValue REAL,
    ConstantValue REAL,
    InvoiceDate TEXT,
    PostingDateMonth TEXT,
    BotStatus TEXT,
    DataSource TEXT,
    UtilityTypeId INTEGER REFERENCES UtilityTypes(Id),
    SiteId INTEGER REFERENCES Sites(Id),
    TemplateType TEXT,
    Site TEXT,
    Facility TEXT,
    Units TEXT,
    FormulaCode TEXT,
    PdfFile TEXT,
    InvoiceNo TEXT,
    ValidateUser TEXT,
    Approver TEXT,
    Comments TEXT,
    ValidatorLoginTime TEXT,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Clean / calculated table (improved tbl_ulpure_data)
db.exec(`
  CREATE TABLE IF NOT EXISTS UlpureData (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    PostingDateMonth TEXT,
    UtilityTypeId INTEGER REFERENCES UtilityTypes(Id),
    SiteId INTEGER REFERENCES Sites(Id),
    Utility TEXT,
    Site TEXT,
    Facility TEXT,
    Consumption REAL,
    PreviousConsumptionUL REAL,
    Units TEXT,
    UlpureStatus TEXT NOT NULL DEFAULT 'Validated',
    FormulaCode TEXT,
    Comments TEXT,
    ComPerson TEXT,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Prevent double-importing the same source value for the same site/utility/month
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS UX_GtoInvoices_source
  ON GtoInvoices (SiteId, UtilityTypeId, ValueSlot, PostingDateMonth);
`);

// Seed lookup tables (idempotent)
const seedUtility = db.prepare(
  'INSERT OR IGNORE INTO UtilityTypes (UtilityName) VALUES (?)'
);
[
  'Electricity',
  'District Heating',
  'Water',
  'Diesel',
  'LPG',
  'Propane',
  'Gasoline',
  'Natural Gas',
  'Energy Consumption',
  'Renewable Electricity',
  'Produced Units',
  // US site utilities (RT100, MEC, Macungie, LVLC)
  'Forklift Propane',
  'Kitchen Propane',
  'HVO Diesel Transport',
  'HVO 100 Process',
  'Water withdrawal - City water',
].forEach((name) => seedUtility.run(name));

const seedSite = db.prepare('INSERT OR IGNORE INTO Sites (SiteName) VALUES (?)');
['Köping', 'NRV', 'LVLC', 'Macungie', 'MEC', 'RT100'].forEach((name) =>
  seedSite.run(name)
);

// Region (Regon) id per site — feeds the UL Pure report's "Regon Id" column.
ensureColumn('Sites', 'RegonId', 'TEXT');
const setRegonId = db.prepare(
  "UPDATE Sites SET RegonId = ? WHERE SiteName = ? AND (RegonId IS NULL OR RegonId = '')"
);
setRegonId.run('64854062', 'Köping');
setRegonId.run('64854091', 'NRV');
setRegonId.run('80262282', 'LVLC');
setRegonId.run('64854089', 'Macungie');
setRegonId.run('76109541', 'MEC');
setRegonId.run('80262304', 'RT100');

/* ------------------------------------------------------------------ *
 * Make UlpureData able to fully stand in for UlPureEntries:
 * file, meter, review, audit fields + source link + data-source tag.
 * ------------------------------------------------------------------ */
// Link GtoInvoices rows back to the form entry that produced them (manual flow)
ensureColumn('GtoInvoices', 'SourceEntryId', 'INTEGER');

/* ------------------------------------------------------------------ *
 * Consolidated entry model: FormEntries is retired, so GtoInvoices is now
 * the SINGLE landing table for BOTH bot-imported and manually-entered data.
 * These columns carry the manual-entry / Validate-page workflow fields.
 * Site, facility and utility are NOT duplicated here: they come from the
 * existing SiteId (-> Sites.SiteName), Facility and UtilityTypeId columns.
 * ------------------------------------------------------------------ */
// Validate workflow status: entries are created 'Validated' directly.
ensureColumn('GtoInvoices', 'Status', "TEXT DEFAULT 'Validated'");
// Who created a manual entry (bot rows leave this NULL)
ensureColumn('GtoInvoices', 'CreatedBy', 'TEXT');
// Last-modified audit stamps (who + when), mirroring UlpureData
ensureColumn('GtoInvoices', 'ModifiedBy', 'TEXT');
ensureColumn('GtoInvoices', 'ModifiedAt', 'TEXT');

// Retired columns from earlier designs: site/facility/utility are derived from
// SiteId, Facility and UtilityTypeId; meter uses AccountNumber; the file URL
// uses PdfFile. Hitl is retired (calc engine no longer filters on it).
// Drop the leftover physical columns so the table stays clean.
[
  'EntryNumber',
  'EntryName',
  'SiteCode',
  'FacilityCode',
  'UtilityCode',
  'FileUrl',
  'UtilityName',
  'AccountMeterNo',
  'FileName',
  'FormValuesJson',
  'Hitl',
].forEach((col) => dropColumn('GtoInvoices', col));

// Ensure every existing row is Validated (no Pending step anymore).
db.exec("UPDATE GtoInvoices SET Status = 'Validated' WHERE Status IS NULL OR Status = 'Pending'");
// File
ensureColumn('UlpureData', 'FileName', 'TEXT');
ensureColumn('UlpureData', 'FileUrl', 'TEXT');
// Meter / identity
ensureColumn('UlpureData', 'EntryNumber', 'TEXT');
ensureColumn('UlpureData', 'EntryName', 'TEXT');
ensureColumn('UlpureData', 'AccountMeterNo', 'TEXT');
ensureColumn('UlpureData', 'UtilityCode', 'TEXT');
ensureColumn('UlpureData', 'FacilityCode', 'TEXT');
ensureColumn('UlpureData', 'SiteCode', 'TEXT');
// Review
ensureColumn('UlpureData', 'ReviewStatus', "TEXT DEFAULT 'Not Reviewed'");
ensureColumn('UlpureData', 'ReviewedBy', 'TEXT');
ensureColumn('UlpureData', 'ReviewedAt', 'TEXT');
// Audit
ensureColumn('UlpureData', 'CreatedBy', 'TEXT');
ensureColumn('UlpureData', 'ModifiedBy', 'TEXT');
ensureColumn('UlpureData', 'ModifiedAt', 'TEXT');
// Source link + producer discriminator ('Calculated' | 'Manual')
ensureColumn('UlpureData', 'SourceEntryId', 'INTEGER');
ensureColumn('UlpureData', 'DataSource', "TEXT DEFAULT 'Calculated'");
ensureColumn('UlpureData', 'IndicatorName', 'TEXT');
ensureColumn('UlpureData', 'IndicatorId', 'TEXT');

console.log('Tables created successfully');