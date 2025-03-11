// public/js/camera.js
export let currentStream = null;
export let currentFacingMode = "environment";

export async function startCamera(videoElement) {
  if (currentStream) stopCamera();
  const constraints = { video: { facingMode: { ideal: currentFacingMode } } };
  try {
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = currentStream;
    videoElement.style.display = "block";
    return true;
  } catch (error) {
    console.error("カメラの起動に失敗しました:", error);
    alert("カメラの起動に失敗しました。ブラウザやHTTPS設定を確認してください。");
    return false;
  }
}

export function stopCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
}

export function updateCanvasSize(videoElement, canvasElement) {
  canvasElement.width = videoElement.clientWidth;
  canvasElement.height = videoElement.clientHeight;
}

export function toggleFacingMode() {
  currentFacingMode = (currentFacingMode === "environment") ? "user" : "environment";
}
