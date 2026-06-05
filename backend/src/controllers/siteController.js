const { fetchSites } = require('../services/siteService');

const getSites = async (req, res, next) => {
  try {
    const sites = await fetchSites();
    res.json(sites);
  } catch (error) {
    next(error);
  }
};

module.exports = { getSites };