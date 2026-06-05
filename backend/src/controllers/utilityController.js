const { fetchUtilities } = require('../services/utilityService');

const getUtilities = async (req, res, next) => {
  try {
    const utilities = await fetchUtilities();
    res.json(utilities);
  } catch (error) {
    next(error);
  }
};

module.exports = { getUtilities };