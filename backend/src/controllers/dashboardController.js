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
        g.Accountnumber AS AccountNumber,
        g.Consumption,
        g.Invoicedate AS InvoiceDate,
        g.Postingdatemonth AS PostingDateMonth,
        g.Botstatus AS BotStatus,
        g.Datasource AS DataSource,
        g.facility AS Facility,
        g.units AS Units,
        g.PdfFile,
        NULL AS InvoiceNo,
        g.createddate AS CreatedAt,
        s.SiteName,
        g.Templatetype AS UtilityName
      FROM Gto_Invoices g
      LEFT JOIN Sites s ON s.Id = g.SiteId
      WHERE 1=1
    `;

    const params = [];

    if (siteId) {
      sql += ' AND g.SiteId = ?';
      params.push(siteId);
    }
    // Utility filter omitted: Gto_Invoices has no utility column yet.
    if (month) {
      sql += ' AND SUBSTRING(g.Postingdatemonth, 6, 2) = ?';
      params.push(month);
    }
    if (year) {
      sql += ' AND SUBSTRING(g.Postingdatemonth, 1, 4) = ?';
      params.push(year);
    }
    if (botStatus) {
      sql += ' AND g.Botstatus = ?';
      params.push(botStatus);
    }

    sql += ' ORDER BY g.createddate DESC';

    const rows = await db.all(sql, params);

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

const getDashboardSites = async (req, res, next) => {
  try {
    const rows = await db.all('SELECT Id, SiteName FROM Sites ORDER BY SiteName');
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

const getDashboardUtilities = async (req, res, next) => {
  try {
    const rows = await db.all('SELECT UtilityTypeID AS Id, UtilityName FROM UtilityTypes ORDER BY UtilityName');
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

// Returns monthly consumption totals grouped by PostingDateMonth + UtilityName.
// Accepts ?siteName=Köping or ?siteId=1 and optional ?utilityName=Electricity.
const getConsumptionTrend = async (req, res, next) => {
  try {
    const { siteName, siteId, utilityName } = req.query;

    const params = [];
    let whereClause = 'WHERE 1=1';

    if (siteId) {
      whereClause += ' AND g.SiteId = ?';
      params.push(siteId);
    } else if (siteName) {
      whereClause += ' AND s.SiteName = ?';
      params.push(siteName);
    }

    if (utilityName) {
      whereClause += ' AND g.Templatetype = ?';
      params.push(utilityName);
    }

    const rows = await db.all(
      `SELECT
         g.Postingdatemonth AS month,
         g.Templatetype AS utility,
         g.units AS units,
         SUM(CAST(g.Consumption AS FLOAT)) AS total
       FROM Gto_Invoices g
       LEFT JOIN Sites s ON s.Id = g.SiteId
       ${whereClause}
         AND g.Postingdatemonth IS NOT NULL
         AND g.Templatetype IS NOT NULL
       GROUP BY g.Postingdatemonth, g.Templatetype, g.units
       ORDER BY g.Postingdatemonth ASC, g.Templatetype ASC`,
      params
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardData,
  getDashboardSites,
  getDashboardUtilities,
  getConsumptionTrend,
};