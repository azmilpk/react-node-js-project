const db = require('../config/db');

const logChange = ({ tableName, recordId, fieldName, oldValue, newValue, changedBy }) => {
  if (String(oldValue ?? '') === String(newValue ?? '')) {
    return;
  }

  db.prepare(`
    INSERT INTO AuditLog (TableName, RecordId, FieldName, OldValue, NewValue, ChangedBy)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    tableName,
    recordId,
    fieldName,
    oldValue !== undefined && oldValue !== null ? String(oldValue) : '',
    newValue !== undefined && newValue !== null ? String(newValue) : '',
    changedBy || 'Unknown User'
  );
};

const logFieldChanges = ({ tableName, recordId, oldRecord, newFields, changedBy }) => {
  Object.keys(newFields).forEach((field) => {
    logChange({
      tableName,
      recordId,
      fieldName: field,
      oldValue: oldRecord[field],
      newValue: newFields[field],
      changedBy,
    });
  });
};

const fetchAuditHistory = (tableName, recordId) => {
  return db
    .prepare(`
      SELECT * FROM AuditLog
      WHERE TableName = ? AND RecordId = ?
      ORDER BY ChangedAt DESC
    `)
    .all(tableName, recordId);
};

module.exports = {
  logChange,
  logFieldChanges,
  fetchAuditHistory,
};