const db = require('../config/db');

const getDashboardData = (req, res, next) => {
  try {
    const { siteId, utilityTypeId, month, year, botStatus } = req.query;

    let sql = `
      SELECT
        g.Id,
        g.AccountNumber,
        g.ValueSlot,
        g.Consumption,
        g.PostingDateMonth,
        g.BotStatus,
        g.DataSource,
        g.PdfFile,
        g.InvoiceNo,
        g.CreatedAt,
        g.Units,
        g.Site,
        g.Facility,
        g.TemplateType,
        s.SiteName,
        u.UtilityName
      FROM GtoInvoices g
      LEFT JOIN Sites s ON g.SiteId = s.Id
      LEFT JOIN UtilityTypes u ON g.UtilityTypeId = u.Id
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
      sql += " AND strftime('%m', g.PostingDateMonth) = ?";
      params.push(month);
    }

    if (year) {
      sql += " AND strftime('%Y', g.PostingDateMonth) = ?";
      params.push(year);
    }

    if (botStatus) {
      sql += ' AND g.BotStatus = ?';
      params.push(botStatus);
    }

    sql += ' ORDER BY g.CreatedAt DESC';

    const rows = db.prepare(sql).all(...params);

    // Add hasFile flag to each row
    const mapped = rows.map((row) => ({
      ...row,
      hasFile: !!(row.PdfFile && row.PdfFile.trim() !== ''),
    }));

    // Summary counts
    const total = mapped.length;
    const withFile = mapped.filter((r) => r.hasFile).length;
    const withoutFile = total - withFile;

    res.json({
      summary: { total, withFile, withoutFile },
      entries: mapped,
    });

  } catch (error) {
    next(error);
  }
};

// Get all sites for filter dropdown
const getDashboardSites = (req, res, next) => {
  try {
    const sites = db.prepare('SELECT * FROM Sites ORDER BY SiteName').all();
    res.json(sites);
  } catch (error) {
    next(error);
  }
};

// Get all utilities for filter dropdown
const getDashboardUtilities = (req, res, next) => {
  try {
    const utilities = db
      .prepare('SELECT * FROM UtilityTypes ORDER BY UtilityName')
      .all();
    res.json(utilities);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardData,
  getDashboardSites,
  getDashboardUtilities,
};