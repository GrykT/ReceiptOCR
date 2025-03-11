// public/js/main.js
import { startCamera, stopCamera, updateCanvasSize, toggleFacingMode } from './camera.js';
import { showCapturedImage, showVideo, hideVideo, updateCaptureButtonText } from './ui.js';

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const toggleButton = document.getElementById('toggleCamera');
const captureButton = document.getElementById('capture');
const capturedImage = document.getElementById('capturedImage');
const resultDiv = document.getElementById('result');
const saveButton = document.getElementById('saveButton');
const resultTextArea = document.getElementById('resultTextArea');

async function initializeCamera() {
  await startCamera(video);
}

toggleButton.addEventListener('click', async () => {
  stopCamera();
  toggleFacingMode();
  await startCamera(video);
});

captureButton.addEventListener('click', async () => {
  if (video.style.display !== "none") {
    // キャプチャ処理：キャンバスに描画し、dataURLを取得
    updateCanvasSize(video, canvas);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    showCapturedImage(capturedImage, dataUrl);
    hideVideo(video);
    updateCaptureButtonText(captureButton, true);

    // データ送信処理
    const formData = new FormData();
    formData.append('image', dataURItoBlob(dataUrl), 'capture.png');

    try {
      const response = await fetch('/upload', {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      resultDiv.textContent = `解析結果: ${JSON.stringify(data)}`;
      if (data) {
        const raw = data.data;
        const formattedDate = raw.date || '';
        const formattedStore = raw.store || '';
        const formattedTotal = raw.total || 0;
        const formattedItems = Array.isArray(raw.items) ? raw.items.join('、') : '';

        const resultLine = `${formattedDate},${formattedStore},${formattedTotal},${formattedItems}`;
        if (resultTextArea.value && resultTextArea.value.trim() !== '') {
          resultTextArea.value += '\n';
        }
        resultTextArea.value += resultLine;
      }
    } catch (error) {
      console.error("OCR解析中にエラーが発生しました:", error);
      resultDiv.textContent = "OCR解析中にエラーが発生しました。";
    }

    stopCamera();
  } else {
    // ストリーム再開時の処理
    capturedImage.style.display = "none";
    showVideo(video);
    updateCaptureButtonText(captureButton, false);
    await startCamera(video);
  }
});

saveButton.addEventListener('click', () => {
  const textContent = resultTextArea.value;
  fetch('/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: textContent })
  })
  .then(response => response.json())
  .then(() => alert('保存しました'))
  .catch(error => {
    console.error('保存中にエラーが発生しました:', error);
    alert('保存中にエラーが発生しました');
  });
});

// ユーティリティ関数: dataURIをBlobに変換
function dataURItoBlob(dataURI) {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

window.addEventListener('load', initializeCamera);
