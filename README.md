# Sustainability Data & Utility Reporting Platform

A full-stack web application for capturing, validating, calculating, and reporting multi-site utility and sustainability data. It supports operational workflows for site owners and auditors, including source-document storage, audit history, and monthly consumption reporting.

## Features

- Role-based authentication for **Auditor** and **Site Owner** users, with local JWT login and Microsoft Entra ID sign-in.
- Manage sites, utility types, form entries, and UL Pure reporting entries.
- Validate source data before it is included in reporting calculations.
- Configurable calculation engine for electricity, water, district heating, fuel, and production indicators across multiple sites.
- Consumption-trend and invoice/file dashboards with filtering by site, month, year, and processing status.
- Upload and securely retrieve supporting documents, including PDFs, images, spreadsheets, and CSV files.
- Audit trail for tracked changes and centralized API error handling.

## Tech stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS, MSAL |
| Backend | Node.js, Express 5 |
| Data | SQLite (`better-sqlite3`), SQL Server support (`mssql`) |
| Authentication | JWT, bcryptjs, Microsoft Entra ID / MSAL |
| File storage | Azure Blob Storage, Multer |

## Project structure

```text
.
├── backend/              # Express API, database migrations, services and calculations
│   └── src/
│       ├── controllers/  # HTTP request handlers
│       ├── services/     # Business logic and reporting calculations
│       ├── routes/       # API route definitions
│       ├── middleware/   # Authentication and error handling
│       └── config/       # Database, Blob Storage and migration configuration
└── my-frontend/          # React application
    └── src/
        ├── pages/        # Application screens
        ├── components/   # Shared UI components
        └── config/       # API and authentication configuration
```

## Getting started

### Prerequisites

- Node.js 18 or later
- npm
- An Azure Blob Storage account (required for file upload and viewing)
- Microsoft Entra app registration (optional; required for Entra sign-in)

### 1. Install dependencies

```bash
cd backend
npm install

cd ../my-frontend
npm install
```

### 2. Configure environment variables

Create `backend/.env` and set the values needed by your environment:

```env
PORT=5000
JWT_SECRET=replace-with-a-strong-secret
CORS_ORIGIN=http://localhost:5173

# Azure Blob Storage (required for files)
AZURE_STORAGE_CONNECTION_STRING=your-connection-string
AZURE_STORAGE_CONTAINER=your-container-name
```

For Microsoft Entra login, configure the corresponding client and tenant values in the frontend authentication configuration and the backend environment.

### 3. Run the application

In one terminal, start the API:

```bash
cd backend
npm run dev
```

In a second terminal, start the frontend:

```bash
cd my-frontend
npm run dev
```

The API runs on `http://localhost:5000` by default. Vite will print the frontend URL, typically `http://localhost:5173`.

## Useful scripts

| Location | Command | Purpose |
| --- | --- | --- |
| `backend` | `npm run dev` | Start the API with automatic restart |
| `backend` | `npm start` | Start the API |
| `backend` | `npm run calc` | Run reporting calculations |
| `my-frontend` | `npm run dev` | Start the React development server |
| `my-frontend` | `npm run build` | Build the production frontend |
| `my-frontend` | `npm run lint` | Run ESLint |

## API overview

Most application endpoints require a valid JWT. The API exposes routes for:

- `/api/auth` — local and Microsoft Entra login
- `/api/sites` and `/api/utilities` — site and utility management
- `/api/form-entries` and `/api/ul-pure-entries` — source and reporting data
- `/api/audit` — audit history
- `/api/dashboard` — dashboard and consumption-trend data
- `/api/files` — authenticated file upload and viewing

## Notes

- Do not commit `.env` files, Azure connection strings, client secrets, or JWT secrets.
- The calculation engine only includes validated data and preserves reviewed/validated reporting records during recalculation.
