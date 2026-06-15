const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadFile, viewFile } = require('../controllers/fileController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), uploadFile);
router.get('/view', viewFile);

module.exports = router;