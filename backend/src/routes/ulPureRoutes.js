const express = require('express');
const router = express.Router();

const {
  generateUlPureFromModified,
  getUlPureEntries,
  getUlPureEntryById,
  editUlPureEntry,
  reviewUlPureEntry, 
  getRawDataForEntry,
} = require('../controllers/ulPureController');

router.put('/:id/review', reviewUlPureEntry);
router.post('/generate', generateUlPureFromModified);
router.get('/', getUlPureEntries);
router.get('/:id', getUlPureEntryById);
router.put('/:id', editUlPureEntry);
router.get('/:id/raw-data', getRawDataForEntry);

module.exports = router; // ulPureRoutes.js