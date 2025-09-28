import "./style.css";

import { MeetingState } from "./meeting/state";
import { MeetingRenderer } from "./ui/renderer";
import { createTransport, type MoqTransportConfig, type TransportKind } from "./transport/moq";
import { hasSyntheticRemoteControls, type TransportHandle } from "./transport/types";

const LOCAL_ID = "local";

const participantsContainer = document.getElementById("participants") as HTMLDivElement | null;
const statusEl = document.getElementById("status") as HTMLParagraphElement | null;
const toggleMicButton = document.getElementById("toggle-mic") as HTMLButtonElement | null;
const toggleRemoteSpeakingButton = document.getElementById("toggle-remote-speaking") as HTMLButtonElement | null;
const addRemoteButton = document.getElementById("add-remote") as HTMLButtonElement | null;
const removeRemoteButton = document.getElementById("remove-remote") as HTMLButtonElement | null;

if (
  !participantsContainer ||
  !statusEl ||
  !toggleMicButton ||
  !toggleRemoteSpeakingButton ||
  !addRemoteButton ||
  !removeRemoteButton
) {
  throw new Error("Required DOM elements are missing from the page.");
}

const searchParams = new URLSearchParams(window.location.search);
const envTransport = (import.meta.env.VITE_TRANSPORT as string | undefined)?.toLowerCase();
const paramTransport = searchParams.get("transport")?.toLowerCase();

let transportKind: TransportKind = paramTransport === "moq" || envTransport === "moq" ? "moq" : "mock";

const relayUrlParam = searchParams.get("relay") ?? (import.meta.env.VITE_RELAY_URL as string | undefined) ?? "";
if (transportKind === "moq" && !relayUrlParam) {
  console.warn("Missing relay URL; falling back to mock transport for sandbox testing.");
  transportKind = "mock";
}

const roomPath = searchParams.get("room") ?? (import.meta.env.VITE_ROOM as string | undefined) ?? "js-api-meet";
const storedParticipantIdKey = "jsApiMeet.participantId";
let participantId = localStorage.getItem(storedParticipantIdKey) ?? undefined;
if (!participantId) {
  participantId = crypto.randomUUID();
  localStorage.setItem(storedParticipantIdKey, participantId);
}

const displayNameParam = searchParams.get("name");
if (displayNameParam) {
  localStorage.setItem("jsApiMeet.displayName", displayNameParam);
}
const storedDisplayName = localStorage.getItem("jsApiMeet.displayName") ?? undefined;

const transportConfig: MoqTransportConfig = {
  relayUrl: relayUrlParam || "http://localhost:4443/anon",
  roomPath,
  participantId,
  displayName: displayNameParam ?? storedDisplayName ?? "Guest",
  autoEnableAudio: true,
};

const transport = createTransport(transportKind, transportConfig);
const syntheticTransport = hasSyntheticRemoteControls(transport) ? transport : undefined;
const syntheticControls = Boolean(syntheticTransport);

const meetingState = new MeetingState();
// The renderer keeps the DOM in sync with meeting state updates.
const renderer = new MeetingRenderer(meetingState, {
  container: participantsContainer,
  status: statusEl,
  muteButton: toggleMicButton,
  remoteSpeakingButton: toggleRemoteSpeakingButton,
  addRemoteButton: syntheticControls ? addRemoteButton : undefined,
  removeRemoteButton: syntheticControls ? removeRemoteButton : undefined,
  allowRemoteSpeakingToggle: syntheticControls,
});

if (!syntheticControls) {
  const mockControlsGroup = document.querySelector<HTMLDivElement>(".controls__group");
  if (mockControlsGroup) {
    mockControlsGroup.style.display = "none";
  }
}

let transportHandle: TransportHandle | undefined;

async function init(): Promise<void> {
  try {
    statusEl.textContent = "Requesting camera + microphone…";

    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    const localParticipant = meetingState.addParticipant({
      id: LOCAL_ID,
      name: transportConfig.displayName ?? "You",
      kind: "local",
      stream: localStream,
      muted: false,
      speaking: false,
    });

    if (transportKind === "moq") {
      statusEl.textContent = "Connecting to relay…";
    }

    transportHandle = await transport.start({
      state: meetingState,
      localParticipant,
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

    if (syntheticTransport) {
      toggleRemoteSpeakingButton.addEventListener("click", () => {
        const remote = meetingState.getRemoteParticipants()[0];
        if (!remote) return;

        meetingState.updateParticipant(remote.id, {
          speaking: !remote.speaking,
        });
      });

      addRemoteButton?.addEventListener("click", () => {
        syntheticTransport.addRemoteParticipant();
      });

      removeRemoteButton?.addEventListener("click", () => {
        syntheticTransport.removeRemoteParticipant();
      });
    }

    window.addEventListener("beforeunload", () => {
      transportHandle?.stop().catch((error) => {
        console.warn("failed to stop transport", error);
      });
    });
  } catch (error) {
    console.error("Unable to initialise mock meeting", error);
    statusEl.textContent = "Failed to acquire camera or microphone. See console for details.";
    toggleMicButton.disabled = true;
    toggleRemoteSpeakingButton.disabled = true;

    // Clean up listeners so the renderer no longer attempts updates.
    renderer.destroy();
    await transportHandle?.stop().catch((err) => {
      console.warn("failed to stop transport after error", err);
    });
  }
}

void init();
