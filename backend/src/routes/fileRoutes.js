const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadFile, viewFile } = require('../controllers/fileController');
const { authenticate } = require('../middleware/auth');

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv', // .csv
  'application/octet-stream', // some browsers send this for .xls/.csv
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

router.post('/upload', authenticate, upload.single('file'), uploadFile);
// `/view` is embedded directly as an <img>/<iframe> src, so it authenticates
// via the `?token=` query fallback in `authenticate`; the service layer also
// verifies the blob belongs to our container and is referenced by a record.
router.get('/view', authenticate, viewFile);

module.exports = router;