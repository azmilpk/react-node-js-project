const express = require('express');
const router = express.Router();
const { getAuditHistory } = require('../controllers/auditController');

router.get('/:tableName/:recordId', getAuditHistory);

module.exports = router;