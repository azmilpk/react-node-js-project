const jwt = require('jsonwebtoken');

// Verifies the `Authorization: Bearer <token>` header, decodes the JWT, and
// attaches the payload to `req.user`. Rejects any request without a valid,
// unexpired token. The signing secret comes from JWT_SECRET (see .env).
const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  // Fallback for browser-embedded GETs (e.g. <img>/<iframe> file previews) that
  // cannot set an Authorization header — accept the token as a `?token=` query param.
  if (!token && req.query && req.query.token) {
    token = String(req.query.token);
  }

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Restricts a route to one or more roles. Must run after `authenticate`.
// Usage: router.put('/:id/status', authenticate, authorize('Auditor'), handler)
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};

module.exports = { authenticate, authorize };
