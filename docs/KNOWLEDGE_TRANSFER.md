# EcoSphere Knowledge Transfer

## 1. Project Overview

EcoSphere is an enterprise environmental and sustainability reporting application for entering, validating, calculating, reviewing, and reporting utility and resource consumption data.

The application has two parts:

- `backend/`: Node.js, Express, Azure SQL, Azure Blob Storage
- `my-frontend/`: React, Vite, Tailwind CSS

The main data flow is:

```text
Manual form or Excel import
        -> Gto_Invoices
        -> validation
        -> calculationService.calculateAll()
        -> tbl_ulpure_data
        -> UL Pure report/review
```

## 2. Local Setup

### Backend

```powershell
cd backend
npm install
npm run dev
```

Backend URL: `http://localhost:5000`

### Frontend

```powershell
cd my-frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

### Production build

```powershell
cd my-frontend
npm run lint
npm run build
```

## 3. Environment Configuration

### Backend `.env`

Required values include:

```text
PORT=5000
DB_SERVER=<azure-sql-server>
DB_NAME=<azure-sql-database>
DB_USER=<database-user>
DB_PASSWORD=<database-password>
DB_PORT=1433
DB_TRUST_SERVER_CERT=false
JWT_SECRET=<secret>
JWT_EXPIRES_IN=8h
AZURE_STORAGE_CONNECTION_STRING=<storage-connection-string>
AZURE_STORAGE_CONTAINER=<container-name>
ENTRA_TENANT_ID=<tenant-id>
ENTRA_CLIENT_ID=<client-id>
```

Never commit `.env` files or storage keys to source control. Rotate any key that has been exposed.

### Frontend `.env`

```text
VITE_API_BASE_URL=http://localhost:5000
VITE_ENTRA_CLIENT_ID=<client-id>
VITE_ENTRA_TENANT_ID=<tenant-id>
VITE_ENTRA_REDIRECT_URI=http://localhost:5173
```

The Entra App Registration must contain the same SPA redirect URI.

## 4. Main Backend Areas

| Location | Responsibility |
|---|---|
| `src/app.js` | Express setup, CORS, middleware, route registration |
| `src/config/db.js` | Azure SQL connection pool and query helpers |
| `src/config/blob.js` | Azure Blob Storage client |
| `src/middleware/auth.js` | JWT authentication and role authorization |
| `src/controllers/` | HTTP request/response handling |
| `src/routes/` | API route definitions |
| `src/services/formEntryService.js` | Manual entries, validation status, Validate data queries |
| `src/services/calculationService.js` | Site formulas and UL Pure calculation engine |
| `src/services/ulPureService.js` | UL Pure generation, retrieval, review, and raw-source details |
| `src/services/auditService.js` | Field-level audit history |
| `src/services/fileService.js` | Uploading and securely streaming Blob files |
| `src/scripts/importGtoInvoices.js` | Excel-to-`Gto_Invoices` import |
| `src/scripts/runCalculations.js` | Manual calculation command |

## 5. Main Database Tables

### `Sites`

Site lookup and Regon/reporting information.

### `UtilityTypes`

Utility lookup. Utility names must match exactly across the database, importer, calculation configuration, and frontend.

### `Gto_Invoices`

Raw landing table containing both imported and manual data.

Important fields:

- `SiteId`
- `UtilityTypeId`
- `AccountNumber`
- `ValueSlot`
- `Consumption`
- `PostingDateMonth`
- `Hitl` or validation status field, depending on the current Azure schema
- `FormulaCode`
- `DataSource`
- `PdfFile`

### `tbl_ulpure_data`

Calculated UL Pure output rows.

Important fields:

- `SiteId`
- `UtilityTypeId`
- `PostingDateMonth`
- `Utility`
- `Consumption`
- `Units`
- `FormulaCode`
- `DataSource`
- `ulpure_status`
- `ReviewStatus`
- `Indicator Name`
- `Indicator ID`

### `AuditLog`

Stores field-level changes for validation, edits, review, and recalculation history.

## 6. User Workflows

### Site Owner

1. Select facility and site.
2. Enter utility data manually or use imported data.
3. Upload a supporting file if needed.
4. Open Validate Data.
5. Review each row.
6. Save validation changes.
7. Generate UL Pure data for a complete month.

### Auditor

1. Open Validate Data or UL Pure Data.
2. Review validated entries and calculated values.
3. Open formula/source details.
4. Review history.
5. Mark UL Pure rows as reviewed.

## 7. Validation Rules

- New manual entries start as `Pending`.
- Saving an unvalidated entry changes it to `Validated`.
- Editing an already validated entry changes it to `Modified and Validated`.
- A site/month is complete only when every raw row for that site/month is validated.
- One pending or missing-status row blocks that complete month from calculation.
- Köping also requires a previous month for delta calculations.
- Existing UL Pure calculated rows are preserved when Generate runs again.
- Only missing UL Pure indicator rows are inserted.
- Reviewed or validated UL Pure rows must not be overwritten.

## 8. Calculation Rules

The calculation registry is in `backend/src/services/calculationService.js`.

### Slot-based sites

Köping, RT100, MEC, Macungie, and LVLC use meter slots and site-specific formulas.

- Köping Electricity uses V1, V2, V3, V4, and V5.
- Köping Water generates five indicators.
- District Heating and Water use previous-month deltas in Köping.
- US sites generally sum all meter slots for a utility.
- Water discharge is mirrored from water usage for applicable US sites.

### Aggregate site

NRV sums validated raw rows using `TemplateType` and `AccountNumber` rules.

NRV does not use previous-month meter deltas, but the complete-month rule still applies.

## 9. Importing Excel Data

```powershell
cd backend
node src/scripts/importGtoInvoices.js "C:\path\to\input.xlsx"
```

The importer:

- Reads the first worksheet.
- Maps accounts to utilities and value slots.
- Resolves site and utility IDs.
- Stores consumption to three decimal places.
- Detects US sites from either `site` or `facility` because source files may use `LVO` as the parent site.
- Clears and reloads only the sites present in the imported file.

After importing, validate the rows before calculation.

## 10. Running Calculations

```powershell
cd backend
npm run calc
```

Calculations should normally be triggered through the UL Pure Generate workflow. Use the script for controlled maintenance or troubleshooting only.

Do not delete `tbl_ulpure_data` in production unless the impact is understood. Existing calculated rows are intentionally preserved.

## 11. Adding a New Site

See [adding-a-new-site.md](adding-a-new-site.md).

Typical steps:

1. Add the site to `Sites`.
2. Add missing utility names to `UtilityTypes`.
3. Add the site to `SITE_CONFIG`.
4. Add account-to-utility mappings in `importGtoInvoices.js`.
5. Add indicator metadata and formulas if required.
6. Add frontend site and form configuration.
7. Import a small test file.
8. Validate one complete month.
9. Generate and compare results with the reference report.

The exact spelling of site and utility names is critical.

## 12. Entra ID Authentication

The frontend uses MSAL:

- `my-frontend/src/config/authConfig.js`
- `my-frontend/src/main.jsx`
- `my-frontend/src/pages/LoginPage.jsx`

The backend verifies the Entra token using Microsoft signing keys, then issues the application JWT.

Current temporary behavior:

- Any verified user in the configured tenant can sign in.
- The role is selected from the login flow: `Auditor` or `SiteOwner`.
- Database-backed user/role provisioning is not yet enforced for Entra users.

For production, use Entra groups or app roles and enforce authorization on the backend.

## 13. File Handling

Files are stored in Azure Blob Storage.

The file service checks:

- Blob URL validity.
- Storage account host.
- Configured container.
- Reference from `Gto_Invoices` or `tbl_ulpure_data`.
- Authentication token.

Do not expose storage connection strings in frontend code.

## 14. Troubleshooting Checklist

### No Validate rows

- Confirm the backend is connected to the correct Azure SQL database.
- Check `SiteId`, `UtilityTypeId`, and `PostingDateMonth`.
- Confirm the frontend is using the correct `VITE_API_BASE_URL`.
- Clear the Validate page session cache.

### No UL Pure rows

- Confirm every row for the site/month is validated.
- Check for `NULL` or `Pending` status values.
- Confirm the site exists in `SITE_CONFIG`.
- Confirm utility names match `UtilityTypes`.
- Check that the month has the required baseline for Köping.

### Wrong calculation

- Inspect raw rows in `Gto_Invoices`.
- Verify `ValueSlot`, `Consumption`, and `PostingDateMonth`.
- Compare against the reference Excel file.
- Confirm values are not already stored in `tbl_ulpure_data`; existing calculated rows are intentionally preserved.

### Files cannot preview

- Confirm the file URL is stored in `PdfFile` or `FileUrl`.
- Confirm the Blob belongs to the configured container.
- Confirm the request has a valid JWT token.

## 15. Known Limitations

- No automated test suite is configured.
- Validate data currently needs server-side pagination before very large deployments.
- Some audit identity fields are still accepted from the client instead of being derived entirely from `req.user`.
- Debug endpoints should be removed or protected before production.
- Account mappings must be maintained when new sites or utility accounts are introduced.
- The local SQLite file `ecosphere_report.db` provides self-contained local development support.
- Existing `HANDOVER.md` and `AZURE_SQL_MIGRATION.md` contain historical migration information and should not be treated as the current runtime configuration.

## 16. Recommended Production Improvements

1. Add database indexes for site, utility, month, status, and calculation keys.
2. Add server-side pagination and filtering to Validate Data.
3. Derive audit users from the verified JWT.
4. Add request validation and rate limiting.
5. Remove public test endpoints.
6. Add automated calculation tests using known reference values.
7. Add monitoring and structured application logs.
8. Enforce Entra group/app-role authorization.

## 17. Short Current Status Review

### Features completed

- Site Owner manual data-entry flow.
- Validate Data page with status updates and comments.
- Auditor UL Pure review and history flow.
- Azure SQL database integration.
- Azure Blob file upload, preview, download, and access protection.
- JWT authentication and initial Microsoft Entra ID sign-in.
- Site and utility lookup data from the database.
- Excel import into `Gto_Invoices`.
- Site-specific calculations for Köping, NRV, RT100, MEC, Macungie, and LVLC.
- Köping Water five-indicator calculation.
- NRV aggregate calculations for validated months.
- US multi-meter summing and water-discharge indicators.
- Preservation of existing UL Pure calculated rows on later Generate runs.
- Audit history for data changes and calculation changes.

### Important fixes completed

- Pending rows no longer calculate or enter UL Pure.
- A month must be 100% validated before calculation.
- Duplicate meter rows are summed instead of overwritten.
- Missing US utility mappings were repaired.
- Missing utility types were added.
- Numeric precision loss during import and calculation was corrected.
- Köping Water values were reconciled with the old SQLite reference data.

### Remaining work

- Add automated tests for formulas and validation rules.
- Add server-side pagination for large Validate Data volumes.
- Complete production Entra group/app-role authorization.
- Use JWT identity instead of client-supplied audit-user fields.
- Remove or protect test endpoints.
- Add database indexes and structured logging.
- Confirm all account mappings when more sites are added.


### JWT and your React application

                 React
                   │
             Login page
                   │
            username/password
                   ↓
                Backend
                   │
             Verify user
                   │
                   ↓
              Create JWT
                   │
                   ↓
                 React
                   │
        Store/use authentication
                   │
                   ↓
       ┌───────────┴───────────┐
       ↓                       ↓
Validate Data              UL Pure
       │                       │
       └────── JWT ────────────┘
                   │
                   ↓
                Backend