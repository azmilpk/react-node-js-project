const db = require('../config/db');

// Sites now come from the Sites lookup table (single source of truth) instead
// of the old mock array. `code` mirrors the name since Sites has no separate
// code column; kept for backward compatibility with any existing consumer.
const fetchSites = async () => {
  const rows = await db.all('SELECT Id, SiteName FROM Sites ORDER BY SiteName');
  return rows.map((r) => ({ id: r.Id, code: r.SiteName, name: r.SiteName }));
};

module.exports = { fetchSites };