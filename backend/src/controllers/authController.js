const jwt = require('jsonwebtoken');
const authService = require('../services/authService');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await authService.loginUser(email, password);

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        id: user.Id,
        email: user.Email,
        role: user.Role,
        name: user.Name,
      },
      process.env.JWT_SECRET || 'dev-secret-key',
      { expiresIn: '8h' }
    );

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

module.exports = { login };