export function cloneMediaStream(stream: MediaStream): MediaStream {
  const clone = new MediaStream();
  for (const track of stream.getTracks()) {
    clone.addTrack(track.clone());
  }
  return clone;
}
