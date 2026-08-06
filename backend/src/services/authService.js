const bcrypt = require('bcryptjs');
const db = require('../config/db');

const SALT_ROUNDS = 10;

const hashPassword = (plain) => bcrypt.hashSync(plain, SALT_ROUNDS);

const loginUser = async (email, password) => {
  if (!email || !password) return null;

  const user = await db.get('SELECT * FROM Users WHERE Email = ?', [email]);
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
      await db.run('UPDATE Users SET Password = ? WHERE Id = ?', [
        hashPassword(password),
        user.Id,
      ]);
    }
  }

  if (!match) return null;

  await db.run('UPDATE Users SET LastLoginAt = GETDATE() WHERE Id = ?', [user.Id]);
  user.LastLoginAt = new Date().toISOString();
  return user;
};

module.exports = {
  loginUser,
  hashPassword,
};