const express = require('express');
const router = express.Router();

const {
  createFormEntry,
  getFormEntries,
  getFormEntryById,
  updateFormEntryStatus,
} = require('../controllers/formEntryController');

router.post('/', createFormEntry);
router.get('/', getFormEntries);
router.get('/:id', getFormEntryById);
router.put('/:id/status', updateFormEntryStatus);

module.exports = router;