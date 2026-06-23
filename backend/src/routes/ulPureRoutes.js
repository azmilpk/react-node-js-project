const express = require('express');
const router = express.Router();

const {
  generateUlPureFromModified,
  getUlPureEntries,
  getUlPureEntryById,
  editUlPureEntry,
} = require('../controllers/ulPureController');

router.post('/generate', generateUlPureFromModified);
router.get('/', getUlPureEntries);
router.get('/:id', getUlPureEntryById);
router.put('/:id', editUlPureEntry);

module.exports = router;