const express = require('express');
const router = express.Router();
const { getSites } = require('../controllers/siteController');

router.get('/', getSites);

module.exports = router;