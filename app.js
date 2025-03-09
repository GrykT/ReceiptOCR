require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { AzureKeyCredential } = require("@azure/core-auth");
const DocumentIntelligence = require("@azure-rest/ai-document-intelligence").default,
  { getLongRunningPoller, isUnexpected } = require("@azure-rest/ai-document-intelligence");

const app = express();
const port = process.env.PORT || 3000;

const subscriptionKey = process.env.DOCUMENT_INTELLIGENCE_SUBSCRIPTION_KEY;
const endpoint = process.env.DOCUMENT_INTELLIGENCE_ENDPOINT; // 例："https://<your-region>.api.cognitive.microsoft.com"

// アップロードファイル保存用設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

app.use(express.static(path.join(__dirname, 'public')));

// 指定ミリ秒だけ待機する関数
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

app.post('/upload', upload.single('image'), async (req, res) => {
  const imagePath = req.file.path;
  try {
    // 画像ファイルをバイナリで読み込み（base64エンコード）
    const imageData = fs.readFileSync(imagePath, { encoding: "base64" });

    // Document Analysis クライアントの作成
    const client = DocumentIntelligence(endpoint, new AzureKeyCredential(subscriptionKey));

    // プリビルトレシートモデル（prebuilt-receipt）を使って画像解析を開始
    const initialResponse = await client
      .path("/documentModels/{modelId}:analyze", "prebuilt-receipt")
      .post({
        body: { base64Source: imageData },
        headers: {
          contentType: "application/json",
          "Accept": "application/json"
        },
        queryParameters: { locale: "ja-jp" },
      });

    if (isUnexpected(initialResponse)) {
      throw initialResponse.body.error;
    }

    let result = null;
    const poller = await getLongRunningPoller(client, initialResponse);
    if (poller.body.status === "succeeded") {
      result = poller.body;
    } else {
      result = (await poller.pollUntilDone()).body;
    }

    // OCR結果から必要な項目を抽出して出力用データを整形
    let output = {};
    if (result.status === "succeeded" &&
        result.analyzeResult &&
        result.analyzeResult.documents &&
        result.analyzeResult.documents.length > 0) {
      const receipt = result.analyzeResult.documents[0];

      // 日付（TransactionDate）: 無ければ "unknown"
      const date = receipt.fields?.TransactionDate?.value || "unknown";

      // 店名（MerchantName）: 無ければ "unknown"
      const store = receipt.fields?.MerchantName?.value || "unknown";

      // 合計金額: Totalがあればそれ、なければSubtotalから抽出（Subtotalは valueCurrency オブジェクトの場合も考慮）
      let total = "unknown";
      if (receipt.fields?.Total?.value) {
        total = receipt.fields.Total.value;
      } else if (receipt.fields?.Subtotal) {
        if (receipt.fields.Subtotal.valueCurrency && receipt.fields.Subtotal.valueCurrency.amount !== undefined) {
          total = receipt.fields.Subtotal.valueCurrency.amount;
        } else if (receipt.fields.Subtotal.value) {
          total = receipt.fields.Subtotal.value;
        }
      }

      // 品名（Items）: Items 配列から各アイテムの Description を取得
      let itemsArray = [];
      if (receipt.fields?.Items?.valueArray && Array.isArray(receipt.fields.Items.valueArray)) {
        itemsArray = receipt.fields.Items.valueArray.map(item => {
          return item.valueObject?.Description?.valueString || "unknown";
        });
      }

      let selectedItems = [];
      if (itemsArray.length === 0) {
        selectedItems = "unknown";
      } else if (itemsArray.length === 1) {
        selectedItems = itemsArray;
      } else {
        // 配列をシャッフルして先頭2件を選択
        for (let i = itemsArray.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [itemsArray[i], itemsArray[j]] = [itemsArray[j], itemsArray[i]];
        }
        selectedItems = itemsArray.slice(0, 2);
      }

      output = {
        date: date,
        store: store,
        total: total,
        items: selectedItems
      };
    } else {
      output = { error: "解析に失敗しました。" };
    }

    res.json({ data: output });

    // アップロードされた画像の削除
    fs.unlinkSync(imagePath);
  } catch (error) {
    console.error("解析エラー:", error);
    res.status(500).send("画像解析中にエラーが発生しました。");
  }
});

app.listen(port, () => {
  console.log(`サーバーがポート ${port} で起動しました。`);
});
