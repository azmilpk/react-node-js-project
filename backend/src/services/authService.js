const db = require('../config/db');

const loginUser = (email, password) => {
  const user = db.prepare(`
    SELECT *
    FROM Users
    WHERE Email = ?
    AND Password = ?
  `).get(email, password);

  return user;
};

module.exports = {
  loginUser,
};

console.log('AUTH SERVICE LOADED');
console.log(module.exports);