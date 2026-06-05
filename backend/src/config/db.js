const sql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: Number(process.env.DB_PORT) || 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

let pool;

const connectDB = async () => {
  try {
    if (pool) return pool;

    pool = await sql.connect(dbConfig);
    console.log('Connected to SQL database');
    return pool;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
};

module.exports = {
  sql,
  connectDB,
};