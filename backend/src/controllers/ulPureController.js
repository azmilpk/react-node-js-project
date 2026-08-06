const {
  moveModifiedValidatedEntriesToUlPure,
  fetchUlPureEntries,
  fetchUlPureEntryById,
  updateUlPureEntry,
  markUlPureReviewed,
  fetchRawDataForUlPureEntry,
} = require('../services/ulPureService');

const generateUlPureFromModified = async (req, res, next) => {
  try {
    const result = await moveModifiedValidatedEntriesToUlPure(req.body || {});
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getUlPureEntries = async (req, res, next) => {
  try {
    const result = await fetchUlPureEntries();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getUlPureEntryById = async (req, res, next) => {
  try {
    const result = await fetchUlPureEntryById(req.params.id);

    if (!result) {
      return res.status(404).json({ message: 'UL Pure entry not found' });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getRawDataForEntry = async (req, res, next) => {
  try {
    const result = await fetchRawDataForUlPureEntry(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const reviewUlPureEntry = async (req, res, next) => {
  try {
    const result = await markUlPureReviewed(req.params.id, req.body.reviewedBy);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const editUlPureEntry = async (req, res, next) => {
  try {
    const result = await updateUlPureEntry(req.params.id, req.body);
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
  reviewUlPureEntry,
  getRawDataForEntry,
};