const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const db = require('../config/db');

const SALT_ROUNDS = 10;

const hashPassword = (plain) => bcrypt.hashSync(plain, SALT_ROUNDS);

// Fetches Microsoft's current signing keys for our tenant (cached internally by jwks-rsa).
const entraJwks = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}/discovery/v2.0/keys`,
});

const getEntraSigningKey = (header, callback) => {
  entraJwks.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
};

// Verifies an Entra ID token (signature, expiry, issuer, audience) and returns its payload.
// Throws if the token is invalid/expired/not meant for this app.
const verifyEntraToken = (idToken) =>
  new Promise((resolve, reject) => {
    jwt.verify(
      idToken,
      getEntraSigningKey,
      {
        audience: process.env.ENTRA_CLIENT_ID,
        // Entra issues v2.0 tokens with this issuer; v1.0-style tokens use sts.windows.net.
        issuer: [
          `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}/v2.0`,
          `https://sts.windows.net/${process.env.ENTRA_TENANT_ID}/`,
        ],
      },
      (err, payload) => (err ? reject(err) : resolve(payload))
    );
  });

// Looks up a locally-provisioned user by the email verified in an Entra token.
// Returns null if the account isn't registered here (Entra sign-in alone doesn't grant access).
const getUserByEntraEmail = async (email) => {
  if (!email) return null;

  const user = await db.get('SELECT * FROM Users WHERE Email = ?', [email]);
  if (!user) return null;

  await db.run('UPDATE Users SET LastLoginAt = GETDATE() WHERE Id = ?', [user.Id]);
  user.LastLoginAt = new Date().toISOString();
  return user;
};

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
  verifyEntraToken,
  getUserByEntraEmail,
};