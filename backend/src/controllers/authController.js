const authService = require('../services/authService');

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
const logout = (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

// GET /api/auth/me
const getMe = (req, res) => {
  try {
    const db = require('../config/db');
    const user = db
      .prepare('SELECT Id, Name, Email, Role, SiteCode, FacilityCode FROM Users WHERE Id = ? AND IsActive = 1')
      .get(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  login,
  logout,
  getMe,
};