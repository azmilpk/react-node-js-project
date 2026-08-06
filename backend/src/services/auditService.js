const db = require('../config/db');

// `client` lets a caller run the insert inside an open transaction (pass the
// tx-scoped api); defaults to the pool-level helpers.
const logChange = async (
  { tableName, recordId, fieldName, oldValue, newValue, changedBy },
  client = db
) => {
  if (String(oldValue ?? '') === String(newValue ?? '')) {
    return;
  }

  await client.run(
    `INSERT INTO AuditLog (TableName, RecordId, FieldName, OldValue, NewValue, ChangedBy)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      tableName,
      recordId,
      fieldName,
      oldValue !== undefined && oldValue !== null ? String(oldValue) : '',
      newValue !== undefined && newValue !== null ? String(newValue) : '',
      changedBy || 'Unknown User',
    ]
  );
};

const logFieldChanges = async ({ tableName, recordId, oldRecord, newFields, changedBy }) => {
  for (const field of Object.keys(newFields)) {
    await logChange({
      tableName,
      recordId,
      fieldName: field,
      oldValue: oldRecord[field],
      newValue: newFields[field],
      changedBy,
    });
  }
};
const fetchCombinedUlPureHistory = async (ulPureId) => {
  const entry = await db.get(
    'SELECT SourceEntryId FROM UlpureData WHERE Id = ?',
    [ulPureId]
  );

  const ulPureLogs = await db.all(
    `SELECT * FROM AuditLog WHERE TableName IN ('UlpureData', 'UlPureEntries') AND RecordId = ?`,
    [ulPureId]
  );

  let formLogs = [];
  if (entry && entry.SourceEntryId) {
    formLogs = await db.all(
      `SELECT * FROM AuditLog WHERE TableName = 'GtoInvoices' AND RecordId = ?`,
      [entry.SourceEntryId]
    );
  }

  return [...ulPureLogs, ...formLogs].sort(
    (a, b) => new Date(b.ChangedAt) - new Date(a.ChangedAt)
  );
};
const fetchAuditHistory = async (tableName, recordId) => {
  if (tableName === 'UlPureEntries' || tableName === 'UlpureData') {
    return fetchCombinedUlPureHistory(recordId);
  }
  return db.all(
    `SELECT * FROM AuditLog
      WHERE TableName = ? AND RecordId = ?
      ORDER BY ChangedAt DESC`,
    [tableName, recordId]
  );
};
module.exports = {
  logChange,
  logFieldChanges,
  fetchAuditHistory,
  fetchCombinedUlPureHistory,
};