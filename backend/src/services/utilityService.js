const db = require('../config/db');

// Utilities now come from the UtilityTypes lookup table instead of the old mock
// array. `code` mirrors the name since UtilityTypes has no separate code column.
const fetchUtilities = async () => {
  return db
    .prepare('SELECT Id, UtilityName FROM UtilityTypes ORDER BY UtilityName')
    .all()
    .map((r) => ({ id: r.Id, code: r.UtilityName, name: r.UtilityName }));
};

module.exports = { fetchUtilities };