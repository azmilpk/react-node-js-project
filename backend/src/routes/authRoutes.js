const express = require('express');
const router = express.Router();
const { login, logout, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public
router.post('/login', login);

// Protected
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

module.exports = router;