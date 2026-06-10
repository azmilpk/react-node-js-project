let formEntries = [];

const insertFormEntry = async (data) => {
  const newEntry = {
    id: formEntries.length + 1,
    entryNumber: `ENTRY-${Date.now()}`,
    siteCode: data.siteCode || '',
    utilityCode: data.utilityCode || '',
    postingMonth: data.postingMonth || '',
    accountMeterNo: data.accountMeterNo || '',
    units: data.units || '',
    consumption: data.consumption || '',
    status: data.status || 'Pending',
    createdBy: data.createdBy || 'frontend-user',
    createdAt: new Date().toISOString(),
    fileName: data.fileName || '',
    fileUrl: data.fileUrl || '',
    pdfUrl: data.pdfUrl || '',
  };

  formEntries.push(newEntry);
  return newEntry;
};

const fetchFormEntries = async (query) => {
  let results = [...formEntries];

  if (query.siteCode) {
    results = results.filter((item) => item.siteCode === query.siteCode);
  }

  if (query.utilityCode) {
    results = results.filter((item) => item.utilityCode === query.utilityCode);
  }

  if (query.status) {
    results = results.filter((item) => item.status === query.status);
  }

  return results;
};

const fetchFormEntryById = async (id) => {
  return formEntries.find((item) => item.id === Number(id));
};

const changeFormEntryStatus = async (id, status) => {
  const entry = formEntries.find((item) => item.id === Number(id));

  if (!entry) {
    throw new Error('Entry not found');
  }

  entry.status = status;
  return entry;
};

module.exports = {
  insertFormEntry,
  fetchFormEntries,
  fetchFormEntryById,
  changeFormEntryStatus,
};