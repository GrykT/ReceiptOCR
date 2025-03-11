require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const { AzureKeyCredential } = require("@azure/core-auth");
const DocumentIntelligence = require("@azure-rest/ai-document-intelligence").default;
const { getLongRunningPoller, isUnexpected } = require("@azure-rest/ai-document-intelligence");

const app = express();
const port = process.env.PORT || 3000;

const subscriptionKey = process.env.DOCUMENT_INTELLIGENCE_SUBSCRIPTION_KEY;
const endpoint = process.env.DOCUMENT_INTELLIGENCE_ENDPOINT; // 例："https://<your-region>.api.cognitive.microsoft.com"

// メモリ内ストレージを利用（ファイルをディスクに保存しない）
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.send('OK! ocrapi');
});

app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    // アップロードされた画像のバッファからbase64文字列を生成
    const imageData = req.file.buffer.toString('base64');

    // Document Intelligence クライアントの作成
    const client = DocumentIntelligence(endpoint, new AzureKeyCredential(subscriptionKey));

    // プリビルトレシートモデル（prebuilt-receipt）を使って解析開始
    const initialResponse = await client
      .path("/documentModels/{modelId}:analyze", "prebuilt-receipt")
      .post({
        body: { base64Source: imageData },
        headers: {
          contentType: "application/json",
          Accept: "application/json"
        },
        queryParameters: { locale: "ja-JP" }
      });

    if (isUnexpected(initialResponse)) {
      throw initialResponse.body.error;
    }

    // 長時間実行タスクのポーリング開始
    const poller = await getLongRunningPoller(client, initialResponse);
    let result;
    if (poller.body.status === "succeeded") {
      result = poller.body;
    } else {
      result = (await poller.pollUntilDone()).body;
    }

    // OCR結果の整形例（店舗名、取引日、合計金額、アイテム）
    let output = {};
    if (result.status === "succeeded" &&
      result.analyzeResult &&
      result.analyzeResult.documents &&
      result.analyzeResult.documents.length > 0) {
      const receipt = result.analyzeResult.documents[0];
      console.info(JSON.stringify(receipt));

      const date = receipt.fields?.TransactionDate?.valueDate || "unknown";
      const store = receipt.fields?.MerchantName?.value || "unknown";

      let total = "unknown";
      if (receipt.fields?.Total?.valueCurrency) {
        if (receipt.fields.Total.valueCurrency.amount !== undefined) {
          total = receipt.fields.Total.valueCurrency.amount;
        }
      } else if (receipt.fields?.Subtotal) {
        if (receipt.fields.Subtotal.valueCurrency && receipt.fields.Subtotal.valueCurrency.amount !== undefined) {
          total = receipt.fields.Subtotal.valueCurrency.amount;
        } else if (receipt.fields.Subtotal.value) {
          total = receipt.fields.Subtotal.value;
        }
      }

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
        // ここではアイテム配列をシャッフルして先頭2件を選択
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
  } catch (error) {
    console.error("解析エラー:", error);
    res.status(500).send("画像解析中にエラーが発生しました。");
  }
});

app.listen(port, () => {
  console.log(`サーバーがポート ${port} で起動しました。`);
});
