import "./style.css";

import { cloneMediaStream } from "./meeting/media";
import { MeetingState } from "./meeting/state";
import { MeetingRenderer } from "./ui/renderer";

const LOCAL_ID = "local";
const REMOTE_ID = "remote-mock";

const participantsContainer = document.getElementById("participants") as HTMLDivElement | null;
const statusEl = document.getElementById("status") as HTMLParagraphElement | null;
const toggleMicButton = document.getElementById("toggle-mic") as HTMLButtonElement | null;
const toggleRemoteSpeakingButton = document.getElementById("toggle-remote-speaking") as HTMLButtonElement | null;

if (!participantsContainer || !statusEl || !toggleMicButton || !toggleRemoteSpeakingButton) {
  throw new Error("Required DOM elements are missing from the page.");
}

const meetingState = new MeetingState();
// The renderer keeps the DOM in sync with meeting state updates.
const renderer = new MeetingRenderer(meetingState, {
  container: participantsContainer,
  status: statusEl,
  muteButton: toggleMicButton,
  remoteSpeakingButton: toggleRemoteSpeakingButton,
});

async function init(): Promise<void> {
  try {
    statusEl.textContent = "Requesting camera + microphone…";

    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    meetingState.addParticipant({
      id: LOCAL_ID,
      name: "You",
      kind: "local",
      stream: localStream,
      muted: false,
      speaking: false,
    });

    meetingState.addParticipant({
      id: REMOTE_ID,
      name: "Remote (mock)",
      kind: "remote",
      stream: cloneMediaStream(localStream),
      muted: false,
      speaking: false,
    });

    toggleMicButton.addEventListener("click", () => {
      const local = meetingState.getLocalParticipant();
      if (!local) return;

      const muted = !local.muted;
      local.stream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
      meetingState.updateParticipant(local.id, { muted });
    });

    toggleRemoteSpeakingButton.addEventListener("click", () => {
      const remote = meetingState.getRemoteParticipants()[0];
      if (!remote) return;

      meetingState.updateParticipant(remote.id, {
        speaking: !remote.speaking,
      });
    });
  } catch (error) {
    console.error("Unable to initialise mock meeting", error);
    statusEl.textContent = "Failed to acquire camera or microphone. See console for details.";
    toggleMicButton.disabled = true;
    toggleRemoteSpeakingButton.disabled = true;

    // Clean up listeners so the renderer no longer attempts updates.
    renderer.destroy();
  }
}

void init();
