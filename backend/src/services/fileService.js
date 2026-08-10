const { BlobServiceClient } = require('@azure/storage-blob');
const path = require('path');
const db = require('../config/db');

const getBlobServiceClient = () => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error('Azure Blob connection string missing');
  }

  return BlobServiceClient.fromConnectionString(connectionString);
};

const uploadToBlob = async (file) => {
  const blobServiceClient = getBlobServiceClient();
  const containerName = process.env.AZURE_STORAGE_CONTAINER;

  if (!containerName) {
    throw new Error('Azure Blob container missing');
  }

  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();

  const safeFileName = file.originalname.replace(/\s+/g, '-');
  const blobName = `${Date.now()}-${safeFileName}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: {
      blobContentType: file.mimetype,
    },
  });

  return {
    fileName: file.originalname,
    fileUrl: blockBlobClient.url,
  };
};

const streamBlobToResponse = async (blobUrl, res) => {
  const blobServiceClient = getBlobServiceClient();
  const configuredContainer = process.env.AZURE_STORAGE_CONTAINER;

  let parsedUrl;
  try {
    parsedUrl = new URL(blobUrl);
  } catch {
    const err = new Error('Invalid blob URL');
    err.status = 400;
    throw err;
  }

  // SSRF guard: only serve blobs hosted on our own storage account.
  const accountHost = new URL(blobServiceClient.url).host;
  if (parsedUrl.host !== accountHost) {
    return res.status(403).json({ message: 'Blob host not allowed' });
  }

  const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
  const containerName = pathParts[0];
  const blobName = pathParts.slice(1).join('/');

  if (!containerName || !blobName) {
    const err = new Error('Invalid blob URL');
    err.status = 400;
    throw err;
  }

  // Only our configured container is allowed.
  if (configuredContainer && containerName !== configuredContainer) {
    return res.status(403).json({ message: 'Blob container not allowed' });
  }

  // Ownership check: the blob must be referenced by a stored record so a user
  // cannot enumerate/read arbitrary blobs in the container.
  const referenced = await db.get(
    `SELECT TOP 1 1 AS ok FROM (
       SELECT 1 AS ok FROM Gto_Invoices WHERE PdfFile = ?
       UNION
       SELECT 1 AS ok FROM tbl_ulpure_data WHERE FileUrl = ?
     ) refs`,
    [blobUrl, blobUrl]
  );
  if (!referenced) {
    return res.status(403).json({ message: 'File not accessible' });
  }

  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);

  const exists = await blobClient.exists();
  if (!exists) {
    return res.status(404).json({ message: 'Blob not found' });
  }

  const downloadResponse = await blobClient.download();

  if (downloadResponse.contentType) {
    res.setHeader('Content-Type', downloadResponse.contentType);
  }

  // Excel/CSV can't render in the browser, so force a download instead of
  // trying (and failing) to preview them inline everywhere they're viewed.
  const EXCEL_EXTENSIONS = new Set(['.xlsx', '.xls', '.csv']);
  const ext = path.extname(blobName).toLowerCase();
  if (EXCEL_EXTENSIONS.has(ext)) {
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(blobName)}"`);
  } else {
    res.setHeader('Content-Disposition', 'inline');
  }
  res.setHeader('Cache-Control', 'private, max-age=86400');

  downloadResponse.readableStreamBody.pipe(res);
};

module.exports = {
  uploadToBlob,
  streamBlobToResponse,
};