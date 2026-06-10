const { uploadToBlob } = require('../services/fileService');

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

module.exports = { uploadFile };