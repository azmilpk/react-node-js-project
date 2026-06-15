const { uploadToBlob, streamBlobToResponse } = require('../services/fileService');

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const result = await uploadToBlob(req.file);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const viewFile = async (req, res, next) => {
  try {
    const { blobUrl } = req.query;

    if (!blobUrl) {
      return res.status(400).json({ message: 'blobUrl is required' });
    }

    await streamBlobToResponse(blobUrl, res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile,
  viewFile,
};