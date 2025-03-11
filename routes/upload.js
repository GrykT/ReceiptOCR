const express = require('express');
const multer = require('multer');
const router = express.Router();
const ocr = require('../functions/ocr');

// メモリ内ストレージ（ディスク保存は行わない）
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /upload で画像を受け取り、OCR処理を実行
router.post('/', upload.single('image'), ocr.uploadHandler);

module.exports = router;