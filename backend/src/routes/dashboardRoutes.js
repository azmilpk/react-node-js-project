const express = require('express');
const router = express.Router();
const {
  getDashboardData,
  getDashboardSites,
  getDashboardUtilities,
  getConsumptionTrend,
} = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getDashboardData);
router.get('/sites', authenticate, getDashboardSites);
router.get('/utilities', authenticate, getDashboardUtilities);
router.get('/consumption-trend', authenticate, getConsumptionTrend);

module.exports = router;