const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_FILE || path.join(__dirname, '../../../ecosphere_report.db');

const db = new Database(dbPath);

// Enable WAL mode and foreign keys for performance and consistency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log(`Connected to SQLite database at ${dbPath}`);

// Helper to normalize T-SQL constructs to SQLite standard SQL
const normalizeSql = (sqlText, params) => {
  let sql = sqlText;

  // 1. T-SQL date functions
  sql = sql.replace(/\bCAST\(GETDATE\(\)\s+AS\s+date\)/gi, "date('now')");
  sql = sql.replace(/\bGETDATE\(\)/gi, "datetime('now')");

  // 2. T-SQL SCOPE_IDENTITY() batch statements
  sql = sql.replace(/;\s*SELECT\s+SCOPE_IDENTITY\(\)\s+AS\s+\w+;?/gi, '');

  // 3. T-SQL TOP N -> SQLite LIMIT N
  if (/\bSELECT\s+TOP\s+(\d+)\s+/i.test(sql)) {
    let topCount = 1;
    sql = sql.replace(/\bSELECT\s+TOP\s+(\d+)\s+/i, (match, count) => {
      topCount = count;
      return 'SELECT ';
    });
    if (!/\bLIMIT\b/i.test(sql)) {
      sql = sql.trim().replace(/;$/, '') + ` LIMIT ${topCount};`;
    }
  }

  // 4. Normalize legacy / Azure SQL table and column names for SQLite
  sql = sql.replace(/\bGto_Invoices\b/gi, 'GtoInvoices');
  sql = sql.replace(/\btbl_ulpure_data\b/gi, 'UlpureData');
  sql = sql.replace(/\bcreateddate\b/gi, 'CreatedAt');
  sql = sql.replace(/\bHitl\b/gi, 'Status');
  sql = sql.replace(/\bulpure_status\b/gi, 'UlpureStatus');
  sql = sql.replace(/\[Indicator\s+Name\]/gi, 'IndicatorName');
  sql = sql.replace(/\[Indicator\s+ID\]/gi, 'IndicatorId');
  sql = sql.replace(/\[Region\s+ID\]/gi, 'RegonId');
  sql = sql.replace(/\[Region\s+Name\]/gi, 'RegionName');

  // 5. If params is an array, convert @p0, @p1, ... to ?
  if (Array.isArray(params) && /@p\d+/.test(sql)) {
    sql = sql.replace(/@p\d+/g, '?');
  }

  return sql;
};

const formatParams = (params) => {
  if (!params) return [];
  if (Array.isArray(params)) return params;
  return [params];
};

const all = async (sqlText, params) => {
  const sql = normalizeSql(sqlText, params);
  const stmt = db.prepare(sql);
  return Array.isArray(params) ? stmt.all(...params) : params ? stmt.all(params) : stmt.all();
};

const get = async (sqlText, params) => {
  const sql = normalizeSql(sqlText, params);
  const stmt = db.prepare(sql);
  return Array.isArray(params) ? stmt.get(...params) : params ? stmt.get(params) : stmt.get();
};

const run = async (sqlText, params) => {
  const sql = normalizeSql(sqlText, params);
  const stmt = db.prepare(sql);
  const info = Array.isArray(params) ? stmt.run(...params) : params ? stmt.run(params) : stmt.run();
  return {
    changes: info.changes,
    lastInsertRowid: info.lastInsertRowid,
  };
};

const exec = (sqlText) => {
  db.exec(sqlText);
};


// Transaction wrapper
const transaction = async (fn) => {
  const tx = db.transaction((txApi) => fn(txApi));
  const syncTxApi = {
    all: (text, params) => {
      const sql = normalizeSql(text, params);
      const stmt = db.prepare(sql);
      return Array.isArray(params) ? stmt.all(...params) : params ? stmt.all(params) : stmt.all();
    },
    get: (text, params) => {
      const sql = normalizeSql(text, params);
      const stmt = db.prepare(sql);
      return Array.isArray(params) ? stmt.get(...params) : params ? stmt.get(params) : stmt.get();
    },
    run: (text, params) => {
      const sql = normalizeSql(text, params);
      const stmt = db.prepare(sql);
      const info = Array.isArray(params) ? stmt.run(...params) : params ? stmt.run(params) : stmt.run();
      return {
        changes: info.changes,
        lastInsertRowid: info.lastInsertRowid,
      };
    },
  };
  return fn(syncTxApi);
};

// Export raw db handle along with helper functions
module.exports = {
  db,
  prepare: (sql) => db.prepare(sql),
  all,
  get,
  run,
  exec,
  transaction,
};