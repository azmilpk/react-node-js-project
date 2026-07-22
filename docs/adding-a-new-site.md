# Adding a New Site (Complete Guide)

This guide walks a **first-time developer** through everything needed to add a
brand-new site to the utility-reporting app — its data import, its calculations,
and its cards/forms in the UI. No prior knowledge of the codebase is assumed.

By the end you will be able to:

1. Register the site in the database.
2. Tell the importer how to read the site's raw data.
3. Define how the site's numbers are calculated.
4. Make the site appear (with utility cards and data-entry forms) in the UI.

---

## 1. How the app is structured (read this first)

Data flows in **one direction**:

```
Excel / bot import ──▶ GtoInvoices (raw landing table)
                              │
                    calc engine (calculateAll)
                              ▼
                     UlpureData (calculated report rows)
                              │
                              ▼
                     UL Pure page / reports
```

There are two "sides" you edit:

| Side | Folder | What it controls |
|------|--------|------------------|
| **Backend** | `backend/src/` | Database seed, import mapping, calculations |
| **Frontend** | `my-frontend/src/` | Site menu, utility cards, data-entry forms |

The system was built around a **single registry** (`SITE_CONFIG`) so the
calculation engine itself never changes — you only add configuration.

### The one golden rule

> A utility's name must be **spelled identically** everywhere:
> the DB seed, the import mapping, the calc `SITE_CONFIG.formulas` key, and the
> frontend configs. If names don't match, the row is silently dropped (the SQL
> join loses it) — **no error is shown**.

Pick the exact site name and utility names once, and reuse them verbatim.

---

## 2. Two kinds of sites

Before you start, decide which pattern your site follows. This determines how
you configure it.

| Pattern | Example sites | How data is identified | Calc mode |
|---------|---------------|------------------------|-----------|
| **Slot** | Köping, RT100, MEC, Macungie, LVLC | Per-meter (account number → a "slot") | `mode: 'slot'` |
| **Aggregate** | NRV | Rows summed by `TemplateType` text | `mode: 'aggregate'` |

- **Slot**: each meter reading is stored in its own slot (V1, V2, …) and a
  per-utility formula combines them. Use this for most sites.
- **Aggregate**: the site reports a fixed set of lines, each a `SUM()` of the
  raw rows matching a rule. Use this only for NRV-style reporting.

The steps below cover both; slot-specific and aggregate-specific parts are
marked.

---

## 3. Backend — Step 1: Register the site (`migrate.js`)

File: `backend/src/config/migrate.js`

This file runs automatically on server start and is **idempotent** (safe to run
repeatedly). Make three edits:

### 3a. Add the site name

Find the `seedSite` list and add your site:

```js
['Köping', 'NRV', 'LVLC', 'Macungie', 'MEC', 'RT100', 'MyNewSite'].forEach((name) =>
  seedSite.run(name)
);
```

### 3b. Add any NEW utility names

If your site uses a utility that isn't already seeded, add it to the
`seedUtility` list (reuse existing names when possible — see the golden rule):

```js
[
  'Electricity',
  'Water',
  // ... existing ...
  'My New Utility',   // only if it does not already exist
].forEach((name) => seedUtility.run(name));
```

### 3c. Set the site's Regon Id

The Regon Id shows up in the UL Pure report. Add a line with the site's id:

```js
setRegonId.run('64854062', 'Köping');
setRegonId.run('64854091', 'NRV');
// ...
setRegonId.run('12345678', 'MyNewSite');   // <-- your site's Regon Id
```

> Note: this `UPDATE` only writes when the value is currently empty, so it won't
> overwrite an id you later change directly in the DB.

---

## 4. Backend — Step 2: Teach the importer (`importGtoInvoices.js`)

File: `backend/src/scripts/importGtoInvoices.js`

This maps each raw Excel row to a **utility** and a **slot**. What you edit
depends on your site pattern.

### 4a. Slot site identified by account number (US-style: RT100/MEC/…)

1. Add the site to `US_SITES`:

   ```js
   const US_SITES = new Set(['RT100', 'MEC', 'Macungie', 'LVLC', 'MyNewSite']);
   ```

2. Add an account-number → utility map:

   ```js
   const SITE_ACCOUNT_UTILITY = {
     // ... existing sites ...
     MyNewSite: {
       '12345-6789': 'Electricity',
       '411000000000': 'Natural Gas',
       '99999': 'Water',
       // one line per account number on the site
     },
   };
   ```

   Each meter is stored under its own slot (its account number), and the calc
   engine sums all slots for that utility.

### 4b. Slot site with fixed meter names (Köping-style)

Add account text → slot entries to `ACCOUNT_VALUE_SLOT`:

```js
const ACCOUNT_VALUE_SLOT = {
  // ...
  'My Main Meter kWh': 'V1',
  'My Sub Meter kWh': 'V2',
};
```

### 4c. Aggregate site (NRV-style)

Nothing to add here — aggregate rows keep their raw `TemplateType` and are
summed later by the calc engine.

> After a run, any account number the importer couldn't map is printed as a
> **WARNING** at the end. Use that list to fill in missing mappings.

---

## 5. Backend — Step 3: Define the calculations (`calculationService.js`)

File: `backend/src/services/calculationService.js`

This is the only place the math lives. Add **one entry** to the `SITE_CONFIG`
registry. The engine reads everything from here — you never touch the loop.

### 5a. Slot mode

```js
const SITE_CONFIG = {
  // ... existing sites ...
  MyNewSite: {
    mode: 'slot',
    rounding: null,             // or a number of decimals, e.g. 3
    regonId: '12345678',        // reference only; real value is in migrate.js
    formulas: {
      // Reuse the built-in helpers:
      Electricity: passThrough('kWh', 'ELEC_PASS'),
      'Natural Gas': scaled(NAT_GAS_CCF_TO_MWH, 'MWh', 'NATGAS_PASS'),
      Water: waterWithDischarge('WATER_USE_GAL'),
    },
  },
};
```

Available helpers (top of the file):

| Helper | Use for |
|--------|---------|
| `passThrough(units, code)` | Sum all meters as-is |
| `scaled(factor, units, code)` | Sum all meters × a conversion factor |
| `waterWithDischarge(useCode)` | Water use + a mirrored "Water discharge" line |

Any utility you **don't** list in `formulas` falls back to the generic
`FORMULAS` block (Köping's defaults). For unusual math, write your own:

```js
formulas: {
  Electricity: ({ cur, prev }) => ({
    value: /* your math using cur['V1'], prev['V1'], ... */,
    units: 'kWh',
    code: 'ELEC_PASS',
  }),
}
```

- `cur` = this month's slots, `prev` = last month's slots (for delta meters).
- If a utility needs a previous-month baseline, list it in `deltaUtilities`.
- If a utility has no meter formula but must still emit one row per month
  (value or 0), use `guaranteedRows` (see Köping's Diesel for an example).

### 5b. Aggregate mode

```js
MyNewSite: {
  mode: 'aggregate',
  rounding: null,
  regonId: '12345678',
  sumUtilities: [
    { utility: 'Electricity', code: 'MYSITE_ELEC', round: 3,
      id: '64885465', name: 'Purchased electricity - Process', units: 'kWh',
      where: "LOWER(TRIM(TemplateType)) = 'electricity'" },
    // one entry per reported line
  ],
  constants: [
    { utility: 'SomeFlag', code: 'MYSITE_FLAG', value: 'Yes',
      id: '81642984', name: 'Some yes/no question', units: 'Yes/No' },
  ],
},
```

Each `where` is a SQL condition on a `GtoInvoices` row. Prefer **tolerant**
matching so small text differences don't drop rows, e.g.
`REPLACE(LOWER(TRIM(TemplateType)), ' ', '') = 'naturalgas'`.

### 5c. Register new indicator metadata

For **every new formula `code`** you introduced above (e.g. `ELEC_PASS` is
already there, but a brand-new code is not), add an entry to `INDICATOR_META`:

```js
const INDICATOR_META = {
  // ...
  MY_NEW_CODE: { id: '65141529', name: 'Official Indicator Name', units: 'US gallon' },
};
```

This drives the Indicator Name / Id / Units stored on the calculated row so it
matches the reporting system exactly.

---

## 6. Frontend — Step 1: Add the site to the menu (`SiteOwnerPage.jsx`)

File: `my-frontend/src/pages/SiteOwnerPage.jsx`

Sites are grouped under a parent "facility" in `siteOptions`. Add your site to
an existing group or create a new one:

```js
const siteOptions = {
  'Köping': ['Köping'],
  'NRV': ['NRV'],
  'LVO': ['LVLC', 'MEC', 'RT100', 'Macungie', 'MyNewSite'],  // add here
  // or a brand new group:
  // 'MyGroup': ['MyNewSite'],
};
```

The site name here **must match** the DB name from Step 3a exactly.

---

## 7. Frontend — Step 2: Add the utility cards (`siteUtilityConfig.js`)

File: `my-frontend/src/config/siteUtilityConfig.js`

These are the cards shown on the **Facility Selection** page (the "Get Started"
tiles). Create an array for your site and register it:

```js
const myNewSiteUtilities = [
  {
    utilityCode: 'electricity',            // internal key (see Step 9)
    utilityName: 'Electricity',            // must match the DB utility name
    iconKey: 'energy',                     // one of the keys in Step 8
    description: 'Initiate a new Data entry. Add required details & documents.',
  },
  {
    utilityCode: 'natural-gas',
    utilityName: 'Natural Gas',
    iconKey: 'fuel',
    description: 'Initiate a new Data entry. Add required details & documents.',
  },
];

export const siteUtilityConfig = {
  'Köping': kopingUtilities,
  // ...
  'MyNewSite': myNewSiteUtilities,         // add here (key = DB site name)
};
```

---

## 8. Frontend — Step 3: Icons (only if you need a new one)

File: `my-frontend/src/pages/FacilitySelectionPage.jsx`

The `iconKey` on each card maps to an SVG. Existing keys:

`energy`, `fuel`, `producedUnits`, `waste`, `water`, `diesel`

If you need a **new** icon:

1. Drop the SVG into `my-frontend/src/assets/facilityvectors/`.
2. Import it and add it to `iconMap`:

   ```js
   import myIcon from '../assets/facilityvectors/myicon.svg';

   const iconMap = {
     energy: energyIcon,
     // ...
     myKey: myIcon,
   };
   ```

3. Use `iconKey: 'myKey'` on the card. (Unknown keys fall back to the energy icon.)

---

## 9. Frontend — Step 4: Add the data-entry forms (`formConfig.js`)

File: `my-frontend/src/config/formConfig.js`

When a user clicks **Get Started** on a card, the app opens a form defined by
`formConfigBySiteUtility[site][utilityCode]`. So the `utilityCode` here must
**match the `utilityCode` used on the card** in Step 7.

The quickest way is the `directEntryForm(...)` helper (a standard single-value
form):

```js
const myNewSiteForms = {
  electricity: directEntryForm({
    facilityDefault: 'MyNewSite',
    utility: 'Electricity',
    units: 'kWh',
    accountMeterNoDefault: '12345-6789',
  }),
  'natural-gas': directEntryForm({
    facilityDefault: 'MyNewSite',
    utility: 'Natural Gas',
    units: 'MWh',
    accountMeterNoDefault: '411000000000',
  }),
};

export const formConfigBySiteUtility = {
  'Köping': kopingForms,
  // ...
  'MyNewSite': myNewSiteForms,             // add here (key = DB site name)
};
```

For fully custom fields, copy an existing block (e.g. `kopingForms.electricity`)
and edit its `editableFields` array. Supported field `type`s: `text`, `number`,
`select`, `file`.

---

## 10. Verify your work

1. **Restart the backend** so `migrate.js` seeds the new site:
   ```powershell
   cd backend
   node src/server.js
   ```
   Watch for "Tables created successfully" with no errors.

2. **Import the site's data** (slot/US sites):
   ```powershell
   cd backend
   node src/scripts/importGtoInvoices.js "C:/path/to/your-data.xlsx"
   ```
   Fix any account numbers listed in the WARNING at the end.

3. **Check the UI**: log in as a Site Owner → your site appears in the menu →
   the Facility Selection page shows your cards → each card opens its form.

4. **Generate UL Pure** for the site and confirm the calculated rows and
   indicators look right.

---

## 11. Quick checklist

Backend:

- [ ] `migrate.js` — site added to `seedSite`
- [ ] `migrate.js` — any new utilities added to `seedUtility`
- [ ] `migrate.js` — `setRegonId.run(...)` line added
- [ ] `importGtoInvoices.js` — account/slot or `US_SITES` mapping added (slot sites)
- [ ] `calculationService.js` — `SITE_CONFIG` entry added
- [ ] `calculationService.js` — `INDICATOR_META` entries for any new codes

Frontend:

- [ ] `SiteOwnerPage.jsx` — site added to `siteOptions`
- [ ] `siteUtilityConfig.js` — utility cards added + registered
- [ ] `FacilitySelectionPage.jsx` — new icon added to `iconMap` (only if needed)
- [ ] `formConfig.js` — a form per `utilityCode` added + registered

Cross-cutting:

- [ ] Site name spelled **identically** in DB seed, frontend `siteOptions`,
      `siteUtilityConfig`, and `formConfigBySiteUtility`.
- [ ] Utility names spelled **identically** in DB seed, import mapping,
      `SITE_CONFIG.formulas` keys, and the card `utilityName`.

---

## 12. Common mistakes

| Symptom | Likely cause |
|---------|--------------|
| Site missing from the menu | Not added to `siteOptions` in `SiteOwnerPage.jsx` |
| "No utilities configured for this site" | Missing/renamed key in `siteUtilityConfig` |
| Card opens but says "No form configuration found" | `utilityCode` mismatch between the card and `formConfig` |
| Utility rows vanish after import/calc | Utility name mismatch (DB seed vs import vs `SITE_CONFIG`) |
| Import shows accounts as UNMAPPED | Missing entry in `SITE_ACCOUNT_UTILITY` / `ACCOUNT_VALUE_SLOT` |
| Calculated row has blank indicator name | Missing `INDICATOR_META` entry for the formula code |
</content>
</invoke>
