# TTI ENV IDP — Handover Document

## Project Structure
```
Main_project/
├── backend/          → Node.js + Express API
│   ├── src/
│   │   ├── config/   → db.js, migrate.js, blob.js
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   └── middleware/
└── my-frontend/      → React + Vite + Tailwind
    └── src/
        ├── pages/
        ├── components/
        └── utils/
```

## How to run locally

### Backend
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:5000
```

### Frontend
```bash
cd my-frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

## Environment variables needed

### backend/.env
```
PORT=5000
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER_NAME=
JWT_SECRET=
FRONTEND_URL=http://localhost:5173
```

### my-frontend/.env
```
VITE_API_BASE_URL=http://localhost:5000
```

## Current database
- Using SQLite (better-sqlite3), synchronous driver
- Database file: **`tti_env_report.db` at the project root** (created/migrated on backend startup by `src/config/migrate.js`)
- WAL mode + `foreign_keys = ON` (both SQLite-only — dropped during the Azure move)
- NEEDS MIGRATION TO AZURE SQL before production hosting

### Real tables (source of truth = `src/config/migrate.js`)
| Table | Purpose |
|---|---|
| `UtilityTypes` | Lookup: Electricity, District Heating, Water, Diesel, LPG, … (seeded) |
| `Sites` | Lookup: Köping (RegonId 64854062), NRV, LVLC, Macungie, MEC, RT100 (seeded) |
| `FormEntries` | Manual form input from the Site Owner flow |
| `GtoInvoices` | **RAW landing table** — one row per meter/account value slot (from Excel import + a form-entry bridge). Unique index `UX_GtoInvoices_source` on (SiteId, UtilityTypeId, ValueSlot, PostingDateMonth) |
| `UlpureData` | **CLEAN / calculated output** — what the UL Pure page shows. Includes `IndicatorName` + `IndicatorId`, `DataSource` ('Calculated' vs 'Manual') |
| `AuditLog` | Every field change (edit / review / recalc) |

> There are **no** `Users` / `ApiKeys` / `Notifications` tables yet — auth is not wired.

## Data pipeline (GtoInvoices → calc → UlpureData)
```
Excel invoices ─┐
                ├─▶ GtoInvoices (raw slots V1, V2, …)
Form entries  ──┘         │
                          ▼  calculateAll()  (calculationService.js)
                     UlpureData (per-indicator rows, delta-based)
                          │
                          ▼
                    UL Pure page (frontend)
```
- **Slot assignment is a hard-coded dictionary** (`ACCOUNT_VALUE_SLOT` in `scripts/importGtoInvoices.js`): each Excel account number maps to a value slot (V1…Vn).
- **Water expands to 5 indicators** (net-of-cooling, cooling-of-process, water-used-in-process, domestic, discharge). Indicator ids/names/units come from `INDICATOR_META` in `calculationService.js` and match the client's Power Apps output.
- Delta utilities (District Heating, Water) need a **previous month baseline** — rows are skipped if the baseline is missing or a value would go negative.
- Fixed constants: FreshWater = 0.9, Evaporation = 1.25.

### How to import data & run the calculation (manual, local)
```bash
cd backend
# 1. import the master Excel into GtoInvoices (WIPES + reloads that site's rows)
node src/scripts/importGtoInvoices.js "C:\path\to\JOPINGData_Bacup.xlsx"
# 2. run the calc engine to (re)build UlpureData
node src/scripts/runCalculations.js      # or: npm run calc
```
> There is currently **no HTTP endpoint and no bot upload** wired to trigger imports/calc — it is run manually via these scripts.

## Azure SQL migration — what needs to change
See AZURE_SQL_MIGRATION.md (contains the full real schema as Azure SQL DDL, the SQLite→Azure SQL construct mapping, calc-engine porting notes, and a data-migration plan).

## What's working
- Site Owner flow: Upload → Validate → Generate UL Pure
- Auditor flow: UL Pure review → History → File preview
- Audit logging: every change tracked in AuditLog table (including recalc deltas)
- File upload/preview: Azure Blob Storage
- **UL Pure calculation engine**: GtoInvoices → `calculateAll()` → UlpureData, with the
  5-row Water model and official IndicatorId/IndicatorName/Units matching the client's Power Apps output

## What's NOT done yet (next steps)
- Azure SQL migration (waiting on access — see AZURE_SQL_MIGRATION.md)
- Real JWT authentication (no Users table yet — auth service exists but is not wired)
- Bot API key authentication
- Hardcoded localhost:5000 URLs (needs VITE_API_BASE_URL wired in)
- Wire `calculateAll()` into the "Generate UL Pure" button (currently run manually via `npm run calc`)
- A bot/HTTP endpoint to ingest the Excel invoices (import is manual via script today)
- 3 indicator rows still to produce: Recovered/converted energy, Diesel, LPG Propane/gasol Renewable %
- Email notifications (designed, not implemented)