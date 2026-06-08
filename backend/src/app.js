require('dotenv').config();

const express = require('express');
const cors = require('cors');

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

app.use('/api/sites', siteRoutes);
app.use('/api/utilities', utilityRoutes);
app.use('/api/form-entries', formEntryRoutes);

app.use(errorHandler);

module.exports = app;