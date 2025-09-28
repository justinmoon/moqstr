export async function attachStream(
  video: HTMLVideoElement,
  stream: MediaStream,
  muted: boolean,
): Promise<void> {
  if (video.srcObject !== stream) {
    video.srcObject = stream;
  }

  video.muted = muted;

  try {
    await video.play();
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotAllowedError") {
      return;
    }
    console.warn("failed to start video playback", error);
  }
}
