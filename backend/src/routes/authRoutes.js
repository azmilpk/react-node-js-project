const express = require('express');
const router = express.Router();
const { login, entraLogin } = require('../controllers/authController');

router.post('/login', login);
router.post('/entra-login', entraLogin);

module.exports = router;