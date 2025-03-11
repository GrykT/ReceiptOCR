require('dotenv').config();
const express = require('express');
const path = require('path');
const uploadRoute = require('./routes/upload');
const saveRoute = require('./routes/save');

const app = express();
const port = process.env.PORT || 3000;

// ミドルウェアの設定
app.use(express.json()); // JSON形式のボディをパース
app.use(express.urlencoded({ extended: true })); // URLエンコードされたデータをパース

// 静的ファイルの提供（publicフォルダ）
app.use(express.static(path.join(__dirname, 'public')));

// ルーターの設定
app.use('/upload', uploadRoute);
app.use('/save', saveRoute);

// ヘルスチェック
app.get('/health', (req, res) => {
  res.send('OK! ocrapi');
});

app.listen(port, () => {
  console.log(`サーバーがポート ${port} で起動しました。`);
});