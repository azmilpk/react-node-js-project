# Azure SQL Migration Guide

## What needs to change when Azure SQL access is available

### Step 1 — Install the right package

```bash
cd backend
npm uninstall better-sqlite3
npm install mssql
```

### Step 2 — Replace db.js

Current (SQLite):
```js
const Database = require('better-sqlite3');
const path = require('path');

// NOTE: the real DB file is ecosphere_report.db at the PROJECT ROOT
// (not backend/data/database.db).
const db = new Database(path.join(__dirname, '../../../ecosphere_report.db'));
db.pragma('journal_mode = WAL');   // SQLite-only — REMOVE for Azure SQL
db.pragma('foreign_keys = ON');    // SQLite-only — REMOVE for Azure SQL
module.exports = db;
```

Replace with (Azure SQL):
```js
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

let pool;

const getPool = async () => {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
};

module.exports = { getPool, sql };
```

### Step 3 — Add Azure SQL credentials to backend/.env

```
DB_SERVER=your-server.database.windows.net
DB_NAME=your-database-name
DB_USER=your-username
DB_PASSWORD=your-password
```

### Step 4 — Run the schema on Azure SQL

> ⚠️ This schema is generated from the REAL `backend/src/config/migrate.js`.
> The core reporting tables are **GtoInvoices** (raw landing) and **UlpureData**
> (calculated output). The old `UlPureEntries` table is **retired** — do not create it.
> There are currently **no** `Users`, `ApiKeys`, or `Notifications` tables (auth is not
> wired yet); add them only when authentication is implemented.

Run this SQL in Azure SQL Query Editor or SSMS (create the lookup tables first — the others FK to them):

```sql
-- ── Lookup tables (create first: other tables reference them) ──
CREATE TABLE UtilityTypes (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  UtilityName NVARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE Sites (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  SiteName NVARCHAR(255) NOT NULL UNIQUE,
  RegonId NVARCHAR(100)
);

-- ── FormEntries: manual form input (Site Owner flow) ──
CREATE TABLE FormEntries (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  EntryNumber NVARCHAR(100) NOT NULL,
  FacilityCode NVARCHAR(100),
  SiteCode NVARCHAR(100) NOT NULL,
  UtilityCode NVARCHAR(100) NOT NULL,
  UtilityName NVARCHAR(255),
  PostingMonth NVARCHAR(20) NOT NULL,
  AccountMeterNo NVARCHAR(255),
  Units NVARCHAR(50),
  Consumption DECIMAL(18,3),
  Status NVARCHAR(50) NOT NULL DEFAULT 'Pending',
  CreatedBy NVARCHAR(255),
  CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
  ModifiedAt DATETIME2,
  FileName NVARCHAR(255),
  FileUrl NVARCHAR(1000),
  PdfUrl NVARCHAR(1000),
  Comment NVARCHAR(MAX),
  FormValuesJson NVARCHAR(MAX),
  EntryName NVARCHAR(255)
);

-- ── GtoInvoices: RAW landing table (bot Excel import + form-entry bridge) ──
CREATE TABLE GtoInvoices (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  AccountNumber NVARCHAR(255),
  ValueSlot NVARCHAR(20),
  Consumption DECIMAL(18,3),
  PreviousConsumption DECIMAL(18,3),
  FreshWaterStaticValue DECIMAL(18,3),
  EvaporationFactorValue DECIMAL(18,3),
  ConstantValue DECIMAL(18,3),
  InvoiceDate NVARCHAR(50),
  PostingDateMonth NVARCHAR(20),
  Hitl NVARCHAR(100),
  BotStatus NVARCHAR(100),
  DataSource NVARCHAR(50),
  UtilityTypeId INT REFERENCES UtilityTypes(Id),
  SiteId INT REFERENCES Sites(Id),
  TemplateType NVARCHAR(100),
  Facility NVARCHAR(255),
  Units NVARCHAR(50),
  FormulaCode NVARCHAR(50),
  PdfFile NVARCHAR(1000),
  InvoiceNo NVARCHAR(100),
  ValidateUser NVARCHAR(255),
  Approver NVARCHAR(255),
  Comments NVARCHAR(MAX),
  ValidatorLoginTime NVARCHAR(50),
  SourceEntryId INT,
  CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Dedup / upsert key — imports AND the calc engine rely on this unique index
CREATE UNIQUE INDEX UX_GtoInvoices_source
  ON GtoInvoices (SiteId, UtilityTypeId, ValueSlot, PostingDateMonth);

-- ── UlpureData: CLEAN / calculated output (feeds the UL Pure page) ──
-- DataSource discriminates 'Calculated' (calc engine) vs 'Manual' (Generate button)
CREATE TABLE UlpureData (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  PostingDateMonth NVARCHAR(20),
  UtilityTypeId INT REFERENCES UtilityTypes(Id),
  SiteId INT REFERENCES Sites(Id),
  Utility NVARCHAR(255),
  Site NVARCHAR(255),
  Facility NVARCHAR(255),
  Consumption DECIMAL(18,3),
  PreviousConsumptionUL DECIMAL(18,3),
  Units NVARCHAR(50),
  UlpureStatus NVARCHAR(50) NOT NULL DEFAULT 'Validated',
  FormulaCode NVARCHAR(50),
  Comments NVARCHAR(MAX),
  ComPerson NVARCHAR(255),
  FileName NVARCHAR(255),
  FileUrl NVARCHAR(1000),
  EntryNumber NVARCHAR(100),
  EntryName NVARCHAR(255),
  AccountMeterNo NVARCHAR(255),
  UtilityCode NVARCHAR(100),
  FacilityCode NVARCHAR(100),
  SiteCode NVARCHAR(100),
  ReviewStatus NVARCHAR(50) DEFAULT 'Not Reviewed',
  ReviewedBy NVARCHAR(255),
  ReviewedAt DATETIME2,
  CreatedBy NVARCHAR(255),
  ModifiedBy NVARCHAR(255),
  ModifiedAt DATETIME2,
  SourceEntryId INT,
  DataSource NVARCHAR(50) DEFAULT 'Calculated',
  IndicatorName NVARCHAR(500),
  IndicatorId NVARCHAR(100),
  CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- ── AuditLog: every field change (edit / review / recalc) ──
CREATE TABLE AuditLog (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  TableName NVARCHAR(100) NOT NULL,
  RecordId INT NOT NULL,
  FieldName NVARCHAR(100) NOT NULL,
  OldValue NVARCHAR(MAX),
  NewValue NVARCHAR(MAX),
  ChangedBy NVARCHAR(255),
  ChangedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- ── Seed lookup data (run once) ──
INSERT INTO UtilityTypes (UtilityName) VALUES
  ('Electricity'), ('District Heating'), ('Water'), ('Diesel'),
  ('LPG'), ('Propane'), ('Gasoline'), ('Natural Gas'),
  ('Energy Consumption'), ('Renewable Electricity'), ('Produced Units');

INSERT INTO Sites (SiteName, RegonId) VALUES
  (N'Köping', '64854062'), ('NRV', NULL), ('LVLC', NULL),
  ('Macungie', NULL), ('MEC', NULL), ('RT100', NULL);
```

### Step 5 — Rewrite service files

Every service file needs these changes:

#### SQLite pattern (current)
```js
const db = require('../config/db');

const fetchFormEntries = (query) => {
  return db.prepare('SELECT * FROM FormEntries WHERE SiteCode = ?').all(query.siteCode);
};
```

#### Azure SQL pattern (after migration)
```js
const { getPool, sql } = require('../config/db');

const fetchFormEntries = async (query) => {
  const pool = await getPool();
  const result = await pool.request()
    .input('siteCode', sql.NVarChar, query.siteCode)
    .query('SELECT * FROM FormEntries WHERE SiteCode = @siteCode');
  return result.recordset;
};
```

#### Key syntax differences
| SQLite | Azure SQL |
|---|---|
| `datetime('now')` | `GETDATE()` |
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `INT IDENTITY(1,1) PRIMARY KEY` |
| `?` parameters | `@paramName` parameters |
| `.get()` → one row | `result.recordset[0]` |
| `.all()` → all rows | `result.recordset` |
| `.run()` → execute | `await request.query(...)` |
| Synchronous | Fully async/await |
| `result.lastInsertRowid` | `SELECT SCOPE_IDENTITY()` |

#### Getting the inserted ID in Azure SQL
```js
const result = await pool.request()
  .input('name', sql.NVarChar, data.name)
  .query(`
    INSERT INTO FormEntries (Name) VALUES (@name);
    SELECT SCOPE_IDENTITY() AS Id;
  `);
const newId = result.recordset[0].Id;
```

### Files that need rewriting (in order)
1. `backend/src/config/db.js` — swap driver + connection pool (remove SQLite pragmas)
2. `backend/src/config/migrate.js` — replace the `db.exec(CREATE TABLE…)` + `ensureColumn` startup migration with the one-time Azure DDL above (Azure SQL has no equivalent of the "ADD COLUMN if not exists" loop)
3. `backend/src/services/calculationService.js` — **most complex** (see "Calc engine" note below): `db.transaction()`, prepared statements, and the upsert loop all change
4. `backend/src/services/formEntryService.js` — includes the `INSERT OR REPLACE` bridge → `MERGE`
5. `backend/src/services/ulPureService.js`
6. `backend/src/services/auditService.js`
7. `backend/src/services/siteService.js`
8. `backend/src/services/utilityService.js`
9. `backend/src/services/authService.js`
10. `backend/src/services/fileService.js`
11. `backend/src/scripts/importGtoInvoices.js` and `backend/src/scripts/importFormEntriesFromExcel.js` — XLSX importers that insert into `GtoInvoices`/`FormEntries`

### SQLite-only SQL that must be translated
| SQLite construct | Azure SQL equivalent |
|---|---|
| `INSERT OR REPLACE` | `MERGE` (match on the unique key, `WHEN MATCHED` UPDATE / `WHEN NOT MATCHED` INSERT) |
| `INSERT OR IGNORE` (seeds) | `IF NOT EXISTS (…) INSERT …` or `MERGE` |
| `db.transaction(() => {…})` (sync) | `const tx = new sql.Transaction(pool); await tx.begin(); … await tx.commit();` |
| `db.prepare(sql)` reused statement | build a `pool.request()` per call (or a `sql.PreparedStatement`) |
| `CREATE UNIQUE INDEX IF NOT EXISTS` | `CREATE UNIQUE INDEX` (one-time; no `IF NOT EXISTS`) |
| `datetime('now')` default | `GETDATE()` |
| `REAL` (float) | `DECIMAL(18,3)` (avoids float drift; values are rounded to 3 dp) |

### Calc engine porting note (`calculationService.js`)
This is the trickiest file. It currently:
- Wraps the whole recompute in a **synchronous** `db.transaction(() => { … })` → becomes an async `sql.Transaction` with `await tx.begin()` / `await tx.commit()` / `await tx.rollback()` on error.
- Uses **prepared statements in a loop** (`findCalcRow`, `insertCalc`, `updateCalc`) to upsert calculated rows keyed on `(SiteId, UtilityTypeId, PostingDateMonth, FormulaCode)` → each becomes an `await request().input(…).query(…)`, and the insert/update pair is best expressed as a single `MERGE`.
- Reads all `GtoInvoices` rows per combo (`slotMap`) → same query, async.
- Prunes stale `Calculated` rows with `DELETE … WHERE Id NOT IN (…kept ids…)` → parameterize the id list or use a temp table (Azure SQL caps parameters at 2100).
- Logs recalc deltas via `auditService.logChange` → keep, but it becomes async too.

### Step 6 — Migrate the EXISTING data (not just schema)
The steps above create empty tables. To carry over current rows from `ecosphere_report.db`:
1. Export each table from SQLite (e.g. `sqlite3 ecosphere_report.db ".mode csv" ".output X.csv" "SELECT * FROM X;"`).
2. Bulk-load into Azure SQL (`BULK INSERT`, `bcp`, or Azure Data Studio import).
3. Re-seed `UtilityTypes`/`Sites` first (FK targets), then load `GtoInvoices`/`UlpureData`/`FormEntries`/`AuditLog`.
Alternatively, just re-run the Excel importers against Azure after the driver swap and let the calc engine regenerate `UlpureData`.

### Step 7 — Azure-specific hardening
- **Connection resiliency**: Azure SQL closes idle connections. Add retry/transient-fault handling and a connection-pool config with `pool: { max, min, idleTimeoutMillis }` and `options.requestTimeout`.
- **Async ripple**: every service becomes `async`; the controllers/routes calling them must `await` (and already-async controllers are fine). Verify no caller relies on a synchronous return value.
- **Secrets**: put `DB_*` in Azure App Settings / Key Vault, not in `.env` committed anywhere.
