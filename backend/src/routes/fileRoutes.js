const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadFile, viewFile } = require('../controllers/fileController');

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error('Only PDF and image files are allowed');
      err.status = 400;
      cb(err);
    }
  },
});

router.post('/upload', upload.single('file'), uploadFile);
router.get('/view', viewFile);

module.exports = router;