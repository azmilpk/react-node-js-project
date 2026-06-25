const { fetchAuditHistory } = require('../services/auditService');

const getAuditHistory = (req, res, next) => {
  try {
    const { tableName, recordId } = req.params;
    const result = fetchAuditHistory(tableName, recordId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAuditHistory };