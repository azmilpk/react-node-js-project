require('dotenv').config();
// Only create/seed tables against the local SQLite dev database.
// When pointed at an external DB (DB_CLIENT=mssql), never run schema migrations or seeds.
if ((process.env.DB_CLIENT || 'sqlite').toLowerCase() !== 'mssql') {
  require('./config/migrate');
}

const express = require('express');
const cors = require('cors');

const siteRoutes = require('./routes/siteRoutes');
const utilityRoutes = require('./routes/utilityRoutes');
const formEntryRoutes = require('./routes/formEntryRoutes');
const fileRoutes = require('./routes/fileRoutes');
const authRoutes = require('./routes/authRoutes');
const ulPureRoutes = require('./routes/ulPureRoutes');
const auditRoutes = require('./routes/auditRoutes');   // ← ADD THIS

const errorHandler = require('./middleware/errorHandler');
const db = require('./config/db');
const { getContainerClient } = require('./config/blob');

const app = express();

const allowedOrigins = (
  process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running' });
});

app.get('/api/test-db', (req, res) => {
  try {
    const result = db.prepare("SELECT datetime('now') AS currentTime").get();
    res.json({ message: 'Database connected successfully', data: result });
  } catch (error) {
    res.status(500).json({ message: 'Database connection failed', error: error.message });
  }
});

app.get('/api/test-blob', async (req, res) => {
  try {
    const containerClient = getContainerClient();
    await containerClient.createIfNotExists();
    res.json({ message: 'Blob connection successful', container: containerClient.containerName });
  } catch (error) {
    res.status(500).json({ message: 'Blob connection failed', error: error.message });
  }
});

app.use('/api/sites', siteRoutes);
app.use('/api/utilities', utilityRoutes);
app.use('/api/form-entries', formEntryRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ul-pure-entries', ulPureRoutes);
app.use('/api/audit', auditRoutes);   // ← ADD THIS

app.use(errorHandler);

module.exports = app;