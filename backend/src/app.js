require('dotenv').config();
require('./config/migrate');

const express = require('express');
const cors = require('cors');

const siteRoutes = require('./routes/siteRoutes');
const utilityRoutes = require('./routes/utilityRoutes');
const formEntryRoutes = require('./routes/formEntryRoutes');
const fileRoutes = require('./routes/fileRoutes');
const authRoutes = require('./routes/authRoutes');
const ulPureRoutes = require('./routes/ulPureRoutes');

const errorHandler = require('./middleware/errorHandler');
const db = require('./config/db');
const { getContainerClient } = require('./config/blob');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running' });
});

// DB test route
app.get('/api/test-db', (req, res) => {
  try {
    const result = db.prepare("SELECT datetime('now') AS currentTime").get();

    res.json({
      message: 'Database connected successfully',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Database connection failed',
      error: error.message,
    });
  }
});

// Blob test route
app.get('/api/test-blob', async (req, res) => {
  try {
    const containerClient = getContainerClient();

    await containerClient.createIfNotExists();

    res.json({
      message: 'Blob connection successful',
      container: containerClient.containerName,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Blob connection failed',
      error: error.message,
    });
  }
});

app.use('/api/sites', siteRoutes);
app.use('/api/utilities', utilityRoutes);
app.use('/api/form-entries', formEntryRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ul-pure-entries', ulPureRoutes);

app.use(errorHandler);

module.exports = app;