const { getContainerClient } = require('../config/blob');

const uploadToBlob = async (file) => {
  const containerClient = getContainerClient();

  await containerClient.createIfNotExists();

  const blobName = `${Date.now()}-${file.originalname}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: {
      blobContentType: file.mimetype,
    },
  });

  return {
    fileName: file.originalname,
    blobName,
    fileUrl: blockBlobClient.url,
  };
};

module.exports = { uploadToBlob };