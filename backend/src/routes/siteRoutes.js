const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getSites } = require('../controllers/siteController');

// existing routes can stay above or below

router.get('/', getSites);

router.get('/:siteCode/utilities', async (req, res) => {
  try {
    const { siteCode } = req.params;

    const rows = await db.all(
      `
      SELECT
        UtilityCode AS utilityCode,
        UtilityName AS utilityName,
        IconKey AS iconKey,
        Description AS description
      FROM SiteUtilities
      WHERE SiteCode = ? AND IsActive = 1
      ORDER BY UtilityName
    `,
      [siteCode]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch utilities',
      error: error.message,
    });
  }
});

router.get('/:siteCode/utilities/:utilityCode/form', async (req, res) => {
  try {
    const { siteCode, utilityCode } = req.params;

    const row = await db.get(
      `
      SELECT TOP 1 FormJson
      FROM UtilityFormDefinitions
      WHERE SiteCode = ? AND UtilityCode = ? AND IsActive = 1
    `,
      [siteCode, utilityCode]
    );

    if (!row) {
      return res.status(404).json({
        message: 'Form definition not found',
      });
    }

    res.json(JSON.parse(row.FormJson));
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch form definition',
      error: error.message,
    });
  }
});

module.exports = router;