const azureService = require('./azureService');
const { extractReceiptData } = require('./extractReceiptData');

exports.uploadHandler = async (req, res) => {
  try {
    // 画像のバッファをbase64文字列に変換
    const imageData = req.file.buffer.toString('base64');

    // Azure Document Intelligence による解析
    const result = await azureService.analyzeReceipt(imageData);

    // 結果が成功し、解析対象ドキュメントがある場合はデータ抽出
    let output = { error: "解析に失敗しました。" };
    if (
      result.status === "succeeded" &&
      result.analyzeResult?.documents &&
      result.analyzeResult.documents.length > 0
    ) {
      const receipt = result.analyzeResult.documents[0];
      output = extractReceiptData(receipt);
    }

    res.json({ data: output });
  } catch (error) {
    console.error("解析エラー:", error);
    res.status(500).send("画像解析中にエラーが発生しました。");
  }
};