const {
  moveModifiedValidatedEntriesToUlPure,
  fetchUlPureEntries,
  fetchUlPureEntryById,
  updateUlPureEntry,
} = require('../services/ulPureService');

const generateUlPureFromModified = (req, res, next) => {
  try {
    const result = moveModifiedValidatedEntriesToUlPure(req.body || {});
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getUlPureEntries = (req, res, next) => {
  try {
    const result = fetchUlPureEntries();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getUlPureEntryById = (req, res, next) => {
  try {
    const result = fetchUlPureEntryById(req.params.id);

    if (!result) {
      return res.status(404).json({ message: 'UL Pure entry not found' });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const editUlPureEntry = (req, res, next) => {
  try {
    const result = updateUlPureEntry(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateUlPureFromModified,
  getUlPureEntries,
  getUlPureEntryById,
  editUlPureEntry,
};