const mockSites = require('../data/mockSites');

const fetchSites = async () => {
  return mockSites;
};

module.exports = { fetchSites };