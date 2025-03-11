require('dotenv').config();
const express = require('express');
const path = require('path');
const uploadRoute = require('./routes/upload');

const app = express();
const port = process.env.PORT || 3000;

// 静的ファイルの提供（publicフォルダ）
app.use(express.static(path.join(__dirname, 'public')));

// /uploadルートを利用
app.use('/upload', uploadRoute);

// ヘルスチェック
app.get('/health', (req, res) => {
  res.send('OK! ocrapi');
});

app.listen(port, () => {
  console.log(`サーバーがポート ${port} で起動しました。`);
});