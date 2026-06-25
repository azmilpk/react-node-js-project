const express = require('express');
const router = express.Router();

const {
  generateUlPureFromModified,
  getUlPureEntries,
  getUlPureEntryById,
  editUlPureEntry,
  reviewUlPureEntry, 
} = require('../controllers/ulPureController');

router.put('/:id/review', reviewUlPureEntry);
router.post('/generate', generateUlPureFromModified);
router.get('/', getUlPureEntries);
router.get('/:id', getUlPureEntryById);
router.put('/:id', editUlPureEntry);

module.exports = router; // ulPureRoutes.js