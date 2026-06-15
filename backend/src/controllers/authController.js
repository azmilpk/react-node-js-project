const { loginUser } = require('../services/authService');
console.log('loginUser =', loginUser);
const login = (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = loginUser(email, password);

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
};