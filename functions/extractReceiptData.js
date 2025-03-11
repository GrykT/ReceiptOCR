exports.extractReceiptData = (receipt) => {
  // 各フィールドをオプショナルチェーンとnull合体演算子で簡潔に取得
  const date = receipt.fields?.TransactionDate?.valueDate ?? "unknown";
  const store = receipt.fields?.MerchantName?.value ?? "unknown";

  let total = "unknown";
  if (receipt.fields?.Total?.valueCurrency?.amount !== undefined) {
    total = receipt.fields.Total.valueCurrency.amount;
  } else if (receipt.fields?.Subtotal) {
    total = receipt.fields.Subtotal.valueCurrency?.amount ?? receipt.fields.Subtotal.value ?? "unknown";
  }

  // アイテム抽出（存在しない場合は "unknown" を返す）
  let itemsArray = [];
  if (Array.isArray(receipt.fields?.Items?.valueArray)) {
    itemsArray = receipt.fields.Items.valueArray.map(item =>
      item.valueObject?.Description?.valueString ?? "unknown"
    );
  }

  let selectedItems = "unknown";
  if (itemsArray.length === 1) {
    selectedItems = itemsArray;
  } else if (itemsArray.length > 1) {
    // Fisher-Yatesアルゴリズムでシャッフルし、先頭2件を選択
    for (let i = itemsArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [itemsArray[i], itemsArray[j]] = [itemsArray[j], itemsArray[i]];
    }
    selectedItems = itemsArray.slice(0, 2);
  }

  return {
    date,
    store,
    total,
    items: selectedItems
  };
};