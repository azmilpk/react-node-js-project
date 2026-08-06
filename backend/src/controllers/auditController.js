const { fetchAuditHistory } = require('../services/auditService');

const getAuditHistory = async (req, res, next) => {
  try {
    const { tableName, recordId } = req.params;
    const result = await fetchAuditHistory(tableName, recordId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAuditHistory };