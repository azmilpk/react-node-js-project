const jwt = require('jsonwebtoken');
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

    // Issue a signed token carrying the server-verified identity. The client
    // sends it back as `Authorization: Bearer <token>` on every API call; the
    // backend trusts this instead of any user field in the request body.
    const token = jwt.sign(
      { id: user.Id, email: user.Email, role: user.Role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({ ...safeUser, token });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
};