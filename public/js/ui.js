// public/js/ui.js
export function showCapturedImage(capturedImageElement, dataUrl) {
  capturedImageElement.src = dataUrl;
  capturedImageElement.style.display = "block";
}

export function showVideo(videoElement) {
  videoElement.style.display = "block";
}

export function hideVideo(videoElement) {
  videoElement.style.display = "none";
}

export function updateCaptureButtonText(buttonElement, isCapturing) {
  buttonElement.textContent = isCapturing ? "ストリーム再開" : "キャプチャ";
}
