require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { connectDB } = require('./config/db');

const siteRoutes = require('./routes/siteRoutes');
const utilityRoutes = require('./routes/utilityRoutes');
const formEntryRoutes = require('./routes/formEntryRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running' });
});

app.get('/api/test-db', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT GETDATE() AS currentTime');
    res.json({
      message: 'Database connected successfully',
      data: result.recordset,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Database connection failed',
      error: error.message,
    });
  }
});

app.use('/api/sites', siteRoutes);
app.use('/api/utilities', utilityRoutes);
app.use('/api/form-entries', formEntryRoutes);

app.use(errorHandler);

module.exports = app;