const { AzureKeyCredential } = require("@azure/core-auth");
const DocumentIntelligence = require("@azure-rest/ai-document-intelligence").default;
const { getLongRunningPoller, isUnexpected } = require("@azure-rest/ai-document-intelligence");

const subscriptionKey = process.env.DOCUMENT_INTELLIGENCE_SUBSCRIPTION_KEY;
const endpoint = process.env.DOCUMENT_INTELLIGENCE_ENDPOINT;

// Document Intelligence クライアントの初期化
const client = DocumentIntelligence(endpoint, new AzureKeyCredential(subscriptionKey));

exports.analyzeReceipt = async (base64Image) => {
  const initialResponse = await client
    .path("/documentModels/{modelId}:analyze", "prebuilt-receipt")
    .post({
      body: { base64Source: base64Image },
      headers: {
        contentType: "application/json",
        Accept: "application/json"
      },
      queryParameters: { locale: "ja-JP" }
    });

  if (isUnexpected(initialResponse)) {
    throw initialResponse.body.error;
  }

  // 長時間実行タスクのポーリング
  const poller = await getLongRunningPoller(client, initialResponse);
  return poller.body.status === "succeeded"
    ? poller.body
    : (await poller.pollUntilDone()).body;
};