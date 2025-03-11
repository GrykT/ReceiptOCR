require('dotenv').config();
const axios = require('axios');

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

/**
 * Discordの指定チャンネルにデータを書き込む保存関数
 * @param {string} date - レシートの日付
 * @param {string} market - 店舗名
 * @param {number} totalAmount - 合計金額
 * @param {string[]} item - 品目の配列
 * @returns {Promise<boolean>} 書き込み成功ならtrue、失敗ならfalse
 */
exports.saveReceiptDataToChat = async (records) => {
  if (!DISCORD_WEBHOOK_URL) {
    console.error("環境変数 DISCORD_WEBHOOK_URL が設定されていません。");
    return false;
  }
  try {
    // 引数をカンマ区切りの文字列に変換
    // 例: "2025-03-10,店舗A,1500,Item1,Item2"
    const message = records;
    const response = await axios.post(DISCORD_WEBHOOK_URL, {
      content: message
    });
    if (response.status === 204 || response.status === 200) {
      console.info("Discordへのメッセージ送信に成功しました。");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Discordへのメッセージ送信中にエラーが発生しました:", error.message);
    return false;
  }
}
