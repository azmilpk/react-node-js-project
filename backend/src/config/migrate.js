const db = require('./db');

db.exec(`
  CREATE TABLE IF NOT EXISTS FormEntries (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    EntryNumber TEXT NOT NULL,
    FacilityCode TEXT,
    SiteCode TEXT NOT NULL,
    UtilityCode TEXT NOT NULL,
    UtilityName TEXT,
    PostingMonth TEXT NOT NULL,
    AccountMeterNo TEXT,
    Units TEXT,
    Consumption REAL,
    Status TEXT NOT NULL DEFAULT 'Pending',
    CreatedBy TEXT,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FileName TEXT,
    FileUrl TEXT,
    PdfUrl TEXT,
    Comment TEXT,
    FormValuesJson TEXT,
    EntryName TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS UlPureEntries (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    SourceEntryId INTEGER,
    EntryNumber TEXT,
    FacilityCode TEXT,
    SiteCode TEXT,
    EntryName TEXT,
    UtilityCode TEXT,
    UtilityName TEXT,
    PostingMonth TEXT,
    AccountMeterNo TEXT,
    Units TEXT,
    Consumption REAL,
    Status TEXT NOT NULL DEFAULT 'Validated',
    Comment TEXT,
    FileName TEXT,
    FileUrl TEXT,
    CreatedBy TEXT,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    ModifiedBy TEXT,
    ModifiedAt TEXT
  );
`);
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

ensureColumn('FormEntries', 'FacilityCode', 'TEXT');
ensureColumn('FormEntries', 'UtilityName', 'TEXT');
ensureColumn('FormEntries', 'Comment', 'TEXT');
ensureColumn('FormEntries', 'FormValuesJson', 'TEXT');
ensureColumn('FormEntries', 'EntryName', 'TEXT');
ensureColumn('FormEntries', 'ModifiedAt', 'TEXT');

ensureColumn('UlPureEntries', 'FacilityCode', 'TEXT');
ensureColumn('UlPureEntries', 'UtilityName', 'TEXT');
ensureColumn('UlPureEntries', 'Comment', 'TEXT');
ensureColumn('UlPureEntries', 'ModifiedBy', 'TEXT');
ensureColumn('UlPureEntries', 'ModifiedAt', 'TEXT');
ensureColumn('UlPureEntries', 'EntryName', 'TEXT');

console.log('Tables created successfully');