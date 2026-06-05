const express = require('express');
const router = express.Router();
const { getUtilities } = require('../controllers/utilityController');

router.get('/', getUtilities);

module.exports = router;