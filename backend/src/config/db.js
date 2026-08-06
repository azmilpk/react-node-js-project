const sql = require('mssql');

// Azure SQL connection config. Credentials come from backend/.env — never
// hard-code them. Fill in DB_SERVER / DB_NAME / DB_USER / DB_PASSWORD there.
const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 1433,
  options: {
    // Azure SQL requires an encrypted connection.
    encrypt: true,
    trustServerCertificate:
      String(process.env.DB_TRUST_SERVER_CERT).toLowerCase() === 'true',
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  // Allow slower VPN/private-endpoint handshakes before giving up.
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

// Single shared connection pool (Azure closes idle connections, so we let the
// pool manage reconnection). Cached as a promise so concurrent callers share it.
let poolPromise;
const getPool = () => {
  if (!poolPromise) {
    poolPromise = sql
      .connect(config)
      .then((pool) => {
        console.log('Connected to Azure SQL database');
        return pool;
      })
      .catch((err) => {
        // Reset so the next call retries instead of caching a failed connect.
        poolPromise = undefined;
        throw err;
      });
  }
  return poolPromise;
};

// mssql rejects `undefined`; normalize it to a real NULL.
const clean = (v) => (v === undefined ? null : v);

// Bind params onto an mssql request.
//   - Array  -> positional: bound as @p0, @p1, ... (the SQL's `?` are rewritten)
//   - Object -> named:      bound as @key (the SQL already uses @key)
const bindParams = (request, params) => {
  if (Array.isArray(params)) {
    params.forEach((v, i) => request.input(`p${i}`, clean(v)));
  } else if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params)) request.input(k, clean(v));
  }
  return request;
};

// Rewrite SQLite-style positional `?` placeholders into @p0, @p1, ... so they
// match the params bound above. Only used when params is an array.
const toNamedPlaceholders = (text) => {
  let i = 0;
  return text.replace(/\?/g, () => `@p${i++}`);
};

const prepare = (request, text, params) => {
  bindParams(request, params);
  const query = Array.isArray(params) ? toNamedPlaceholders(text) : text;
  return { request, query };
};

const runOn = async (baseRequest, text, params) => {
  const { request, query } = prepare(baseRequest, text, params);
  const result = await request.query(query);
  return result.recordset || [];
};

// INSERT/UPDATE/DELETE helper. Appends SCOPE_IDENTITY() so callers relying on
// the old better-sqlite3 `lastInsertRowid` keep working after an INSERT.
const execOn = async (baseRequest, text, params) => {
  const { request, query } = prepare(baseRequest, text, params);
  const result = await request.query(
    `${query}\n; SELECT SCOPE_IDENTITY() AS lastInsertRowid;`
  );
  const affected = Array.isArray(result.rowsAffected)
    ? result.rowsAffected[0]
    : result.rowsAffected;
  const lastRow = result.recordset && result.recordset[0];
  return {
    changes: affected,
    lastInsertRowid: lastRow ? lastRow.lastInsertRowid : undefined,
  };
};

// ── Pool-scoped helpers (each call grabs a fresh request from the pool) ──
const all = async (text, params) => runOn((await getPool()).request(), text, params);
const get = async (text, params) => (await all(text, params))[0];
const run = async (text, params) => execOn((await getPool()).request(), text, params);
const exec = async (text) => {
  const pool = await getPool();
  await pool.request().batch(text);
};

// Run `fn` inside a single transaction. `fn` receives a tx-scoped API with the
// same get/all/run helpers; commits on success, rolls back on any error.
const transaction = async (fn) => {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  const txApi = {
    all: (text, params) => runOn(new sql.Request(tx), text, params),
    get: async (text, params) => (await txApi.all(text, params))[0],
    run: (text, params) => execOn(new sql.Request(tx), text, params),
  };
  try {
    const result = await fn(txApi);
    await tx.commit();
    return result;
  } catch (err) {
    try {
      await tx.rollback();
    } catch {
      // Ignore rollback errors (e.g. tx already aborted); surface the original.
    }
    throw err;
  }
};

module.exports = { sql, getPool, all, get, run, exec, transaction };