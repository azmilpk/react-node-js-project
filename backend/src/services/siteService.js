const db = require('../config/db');

// Sites now come from the Sites lookup table (single source of truth) instead
// of the old mock array. `code` mirrors the name since Sites has no separate
// code column; kept for backward compatibility with any existing consumer.
const fetchSites = async () => {
  return db
    .prepare('SELECT Id, SiteName FROM Sites ORDER BY SiteName')
    .all()
    .map((r) => ({ id: r.Id, code: r.SiteName, name: r.SiteName }));
};

module.exports = { fetchSites };