const { BlobServiceClient } = require('@azure/storage-blob');

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

  const parsedUrl = new URL(blobUrl);

  const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
  const containerName = pathParts[0];
  const blobName = pathParts.slice(1).join('/');

  if (!containerName || !blobName) {
    throw new Error('Invalid blob URL');
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

  res.setHeader('Content-Disposition', 'inline');

  downloadResponse.readableStreamBody.pipe(res);
};

module.exports = {
  uploadToBlob,
  streamBlobToResponse,
};