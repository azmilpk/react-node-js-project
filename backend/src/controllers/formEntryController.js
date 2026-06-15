const {
  insertFormEntry,
  fetchFormEntries,
  fetchFormEntryById,
  changeFormEntryStatus,
  updateFormEntry: updateFormEntryService,
} = require('../services/formEntryService');

// Create Entry
const createFormEntry = (req, res, next) => {
  try {
    const result = insertFormEntry(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// Get All Entries
const getFormEntries = (req, res, next) => {
  try {
    const result = fetchFormEntries(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Get Entry By Id
const getFormEntryById = (req, res, next) => {
  try {
    const result = fetchFormEntryById(req.params.id);

    if (!result) {
      return res.status(404).json({
        message: 'Entry not found',
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Change Status
const updateFormEntryStatus = (req, res, next) => {
  try {
    const result = changeFormEntryStatus(
      req.params.id,
      req.body.status
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Update Entry (UL Pure Details Page)
const editFormEntry = (req, res, next) => {
  try {
    const result = updateFormEntryService(
      req.params.id,
      req.body
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFormEntry,
  getFormEntries,
  getFormEntryById,
  updateFormEntryStatus,
  editFormEntry,
};