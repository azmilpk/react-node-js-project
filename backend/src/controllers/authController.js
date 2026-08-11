const jwt = require('jsonwebtoken');
const authService = require('../services/authService');

const ENTRA_ALLOWED_ROLES = ['Auditor', 'SiteOwner'];

const signAppToken = (user) =>
  jwt.sign(
    {
      id: user.Id,
      email: user.Email,
      role: user.Role,
      name: user.Name,
    },
    process.env.JWT_SECRET || 'dev-secret-key',
    { expiresIn: '8h' }
  );

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await authService.loginUser(email, password);

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signAppToken(user);

    res.json({
      Id: user.Id,
      Name: user.Name,
      Email: user.Email,
      Role: user.Role,
      LastLoginAt: user.LastLoginAt,
      token,
    });

  } catch (error) {
    next(error);
  }
};

const entraLogin = async (req, res, next) => {
  try {
    const { idToken, role } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'idToken is required' });
    }
    if (!ENTRA_ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: 'A valid role (Auditor or SiteOwner) is required' });
    }

    let payload;
    try {
      payload = await authService.verifyEntraToken(idToken);
    } catch (verifyError) {
      return res.status(401).json({ message: 'Invalid or expired Microsoft sign-in token' });
    }

    // No Users table lookup yet — any verified account in our Entra tenant is
    // trusted, and the role is whichever button they picked on the login screen.
    const user = {
      Id: payload.oid || payload.sub,
      Name: payload.name || payload.preferred_username || payload.upn,
      Email: payload.email || payload.preferred_username || payload.upn,
      Role: role,
      LastLoginAt: new Date().toISOString(),
    };

    const token = signAppToken(user);

    res.json({
      Id: user.Id,
      Name: user.Name,
      Email: user.Email,
      Role: user.Role,
      LastLoginAt: user.LastLoginAt,
      token,
    });

  } catch (error) {
    next(error);
  }
};

module.exports = { login, entraLogin };