const db = require('../config/db');
const { getContainerClient } = require('../config/blob');

// Resolve the blob name (path within the container) from a stored PdfFile value,
// which may be a full URL (https://acct.blob.../container/name) or a bare name.
const resolveBlobName = (pdfFile) => {
  try {
    const parsed = new URL(pdfFile);
    const parts = parsed.pathname.split('/').filter(Boolean);
    return decodeURIComponent(parts.slice(1).join('/'));
  } catch {
    return pdfFile;
  }
};

// True only when the invoice file is actually present in the blob container.
const blobExists = async (containerClient, pdfFile) => {
  if (!pdfFile || !pdfFile.trim()) return false;
  try {
    const blobName = resolveBlobName(pdfFile);
    if (!blobName) return false;
    return await containerClient.getBlobClient(blobName).exists();
  } catch {
    return false;
  }
};

const getDashboardData = async (req, res, next) => {
  try {
    const { siteId, utilityTypeId, month, year, botStatus } = req.query;

    let sql = `
      SELECT
        g.Id,
        g.AccountNumber,
        g.Consumption,
        g.InvoiceDate,
        g.PostingDateMonth,
        g.BotStatus,
        g.DataSource,
        g.Facility,
        g.Units,
        g.PdfFile,
        g.InvoiceNo,
        g.CreatedAt,
        s.SiteName,
        u.UtilityName
      FROM GtoInvoices g
      LEFT JOIN Sites s ON s.Id = g.SiteId
      LEFT JOIN UtilityTypes u ON u.Id = g.UtilityTypeId
      WHERE 1=1
    `;

    const params = [];

    if (siteId) {
      sql += ' AND g.SiteId = ?';
      params.push(siteId);
    }
    if (utilityTypeId) {
      sql += ' AND g.UtilityTypeId = ?';
      params.push(utilityTypeId);
    }
    if (month) {
      sql += ' AND substr(g.PostingDateMonth, 6, 2) = ?';
      params.push(month);
    }
    if (year) {
      sql += ' AND substr(g.PostingDateMonth, 1, 4) = ?';
      params.push(year);
    }
    if (botStatus) {
      sql += ' AND g.BotStatus = ?';
      params.push(botStatus);
    }

    sql += ' ORDER BY g.CreatedAt DESC';

    const rows = db.prepare(sql).all(...params);

    // Reach the blob container once; if unavailable (e.g. local dev without Azure
    // creds) fall back to "URL present" so the dashboard still works.
    let containerClient = null;
    try {
      containerClient = getContainerClient();
    } catch {
      containerClient = null;
    }

    const entries = await Promise.all(
      rows.map(async (row) => {
        const hasUrl = !!(row.PdfFile && row.PdfFile.trim());
        const hasFile = hasUrl
          ? containerClient
            ? await blobExists(containerClient, row.PdfFile)
            : true
          : false;
        return { ...row, hasFile };
      })
    );

    const total = entries.length;
    const withFile = entries.filter((r) => r.hasFile).length;

    res.json({
      summary: { total, withFile, withoutFile: total - withFile },
      entries,
    });
  } catch (error) {
    next(error);
  }
};

const getDashboardSites = (req, res, next) => {
  try {
    const rows = db.prepare('SELECT Id, SiteName FROM Sites ORDER BY SiteName').all();
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

const getDashboardUtilities = (req, res, next) => {
  try {
    const rows = db.prepare('SELECT Id, UtilityName FROM UtilityTypes ORDER BY UtilityName').all();
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardData,
  getDashboardSites,
  getDashboardUtilities,
};