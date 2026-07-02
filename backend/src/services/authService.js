const bcrypt = require('bcryptjs');
const db = require('../config/db');

const SALT_ROUNDS = 10;

const hashPassword = (plain) => bcrypt.hashSync(plain, SALT_ROUNDS);

const loginUser = (email, password) => {
  if (!email || !password) return null;

  const user = db.prepare('SELECT * FROM Users WHERE Email = ?').get(email);
  if (!user) return null;

  const stored = user.Password || '';
  const isHashed = stored.startsWith('$2');

  let match = false;
  if (isHashed) {
    match = bcrypt.compareSync(password, stored);
  } else {
    // Legacy plaintext password: compare directly, then upgrade to a hash.
    match = stored === password;
    if (match) {
      db.prepare('UPDATE Users SET Password = ? WHERE Id = ?').run(
        hashPassword(password),
        user.Id
      );
    }
  }

  if (!match) return null;
  return user;
};

module.exports = {
  loginUser,
  hashPassword,
};