const status = document.getElementById("status");
const preview = document.getElementById("preview") as HTMLVideoElement | null;

async function init(): Promise<void> {
  if (!preview || !status) return;

  if (!("mediaDevices" in navigator) || !navigator.mediaDevices.getUserMedia) {
    status.textContent = "getUserMedia is not available in this browser.";
    return;
  }

  try {
    status.textContent = "Awaiting camera stream…";
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    preview.srcObject = stream;
    await preview.play();
    status.textContent = "Camera stream is playing.";
  } catch (error) {
    console.error("Unable to acquire camera:", error);
    status.textContent = "Failed to acquire camera: see console for details.";
  }
}

void init();
