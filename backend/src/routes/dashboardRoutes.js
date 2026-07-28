const express = require('express');
const router = express.Router();
const {
  getDashboardData,
  getDashboardSites,
  getDashboardUtilities,
} = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getDashboardData);
router.get('/sites', authenticate, getDashboardSites);
router.get('/utilities', authenticate, getDashboardUtilities);

module.exports = router;