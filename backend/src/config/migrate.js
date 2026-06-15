const db = require('./db');

db.exec(`
  CREATE TABLE IF NOT EXISTS FormEntries (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    EntryNumber TEXT NOT NULL,
    SiteCode TEXT NOT NULL,
    UtilityCode TEXT NOT NULL,
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
    Comment TEXT
  );
`);

console.log('Tables created successfully');