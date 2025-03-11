const express = require('express');
const router = express.Router();
const discord = require('../functions/discord');

// POST /save でテキストデータを受け取る
router.post('/', (req, res) => {
  try {
    const textData = req.body.data;

    if (!textData) {
      return res.status(400).json({ error: 'テキストデータが提供されていません' });
    }

    // discordに保存
    discord.saveReceiptDataToChat(textData);

    // 成功レスポンスを返す
    res.status(200).json({
      success: true,
      message: 'テキストデータを正常に受信しました',
      receivedAt: new Date()
    });
  } catch (error) {
    console.error('テキスト保存エラー:', error);
    res.status(500).json({ error: 'テキストの処理中にエラーが発生しました' });
  }
});

module.exports = router;
