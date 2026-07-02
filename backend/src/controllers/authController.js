const { loginUser } = require('../services/authService');

const login = (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = loginUser(email, password);

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    const { Password, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
};