const {
  insertFormEntry,
  fetchFormEntries,
  fetchFormEntryById,
  changeFormEntryStatus,
} = require('../services/formEntryService');

const createFormEntry = async (req, res, next) => {
  try {
    const result = await insertFormEntry(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const getFormEntries = async (req, res, next) => {
  try {
    const result = await fetchFormEntries(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getFormEntryById = async (req, res, next) => {
  try {
    const result = await fetchFormEntryById(req.params.id);

    if (!result) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const updateFormEntryStatus = async (req, res, next) => {
  try {
    const result = await changeFormEntryStatus(req.params.id, req.body.status);
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
};