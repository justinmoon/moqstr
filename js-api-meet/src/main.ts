import "./style.css";

type ParticipantKind = "local" | "remote";

type Participant = {
  id: string;
  name: string;
  kind: ParticipantKind;
  stream: MediaStream;
  muted: boolean;
  speaking: boolean;
};

type ParticipantTile = {
  container: HTMLDivElement;
  video: HTMLVideoElement;
  nameEl: HTMLSpanElement;
  statusEl: HTMLSpanElement;
};

const participants = new Map<string, Participant>();
const tiles = new Map<string, ParticipantTile>();

const participantsContainer = document.getElementById("participants") as HTMLDivElement | null;
const statusEl = document.getElementById("status") as HTMLParagraphElement | null;
const toggleMicButton = document.getElementById("toggle-mic") as HTMLButtonElement | null;
const toggleRemoteSpeakingButton = document.getElementById("toggle-remote-speaking") as HTMLButtonElement | null;

if (!participantsContainer || !statusEl || !toggleMicButton || !toggleRemoteSpeakingButton) {
  throw new Error("Required DOM elements are missing from the page.");
}

async function init(): Promise<void> {
  try {
    statusEl.textContent = "Requesting camera + microphone…";

    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    const localParticipant: Participant = {
      id: "local",
      name: "You",
      kind: "local",
      stream: localStream,
      muted: false,
      speaking: false,
    };

    const remoteParticipant: Participant = {
      id: "remote-mock",
      name: "Remote (mock)",
      kind: "remote",
      stream: cloneMediaStream(localStream),
      muted: false,
      speaking: false,
    };

    participants.set(localParticipant.id, localParticipant);
    participants.set(remoteParticipant.id, remoteParticipant);

    updateParticipantTile(localParticipant);
    updateParticipantTile(remoteParticipant);
    updateStatus();
    updateButtons();

    toggleMicButton.addEventListener("click", () => {
      const participant = participants.get(localParticipant.id);
      if (!participant) return;

      participant.muted = !participant.muted;
      participant.stream.getAudioTracks().forEach((track) => {
        track.enabled = !participant.muted;
      });

      updateParticipantTile(participant);
      updateButtons();
      updateStatus();
    });

    toggleRemoteSpeakingButton.addEventListener("click", () => {
      const participant = participants.get(remoteParticipant.id);
      if (!participant) return;

      participant.speaking = !participant.speaking;
      updateParticipantTile(participant);
      updateButtons();
      updateStatus();
    });

    statusEl.textContent = "Meeting ready. Both participants are connected.";
  } catch (error) {
    console.error("Unable to initialise mock meeting", error);
    statusEl.textContent = "Failed to acquire camera or microphone. See console for details.";
  }
}

function updateParticipantTile(participant: Participant): void {
  let tile = tiles.get(participant.id);
  if (!tile) {
    tile = createTile(participant);
    tiles.set(participant.id, tile);
    participantsContainer.appendChild(tile.container);
  }

  tile.container.dataset.participantId = participant.id;
  tile.container.dataset.kind = participant.kind;
  tile.container.dataset.muted = String(participant.muted);
  tile.container.dataset.speaking = String(participant.speaking);
  tile.nameEl.textContent = participant.name;
  tile.statusEl.textContent = describeParticipantStatus(participant);

  attachStream(tile.video, participant.stream, participant.kind === "local").catch((err) => {
    console.warn(`Could not attach stream for participant ${participant.id}`, err);
  });
}

function createTile(participant: Participant): ParticipantTile {
  const container = document.createElement("div");
  container.className = "participant";

  const video = document.createElement("video");
  video.className = "participant__video";
  video.playsInline = true;
  video.autoplay = true;

  const info = document.createElement("div");
  info.className = "participant__info";

  const nameEl = document.createElement("span");
  nameEl.className = "participant__name";

  const statusEl = document.createElement("span");
  statusEl.className = "participant__status";

  info.appendChild(nameEl);
  info.appendChild(statusEl);

  container.appendChild(video);
  container.appendChild(info);

  return { container, video, nameEl, statusEl };
}

async function attachStream(video: HTMLVideoElement, stream: MediaStream, muted: boolean): Promise<void> {
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
    throw error;
  }
}

function describeParticipantStatus(participant: Participant): string {
  if (participant.kind === "local") {
    return participant.muted ? "Muted" : "Live";
  }

  if (participant.speaking) {
    return "Speaking";
  }

  return "Listening";
}

function updateButtons(): void {
  const local = participants.get("local");
  const remote = participants.get("remote-mock");

  if (local) {
    toggleMicButton.textContent = local.muted ? "Unmute microphone" : "Mute microphone";
  }

  if (remote) {
    toggleRemoteSpeakingButton.textContent = remote.speaking ? "Mark remote as listening" : "Mark remote as speaking";
  }
}

function updateStatus(): void {
  const total = participants.size;
  const local = participants.get("local");
  const remote = participants.get("remote-mock");

  const localStatus = local?.muted ? "Your mic is muted" : "Your mic is live";
  const remoteStatus = remote?.speaking ? "Remote participant is speaking" : "Remote participant is listening";

  statusEl.textContent = `${total} participants in room • ${localStatus} • ${remoteStatus}`;
}

function cloneMediaStream(stream: MediaStream): MediaStream {
  const cloned = new MediaStream();
  for (const track of stream.getTracks()) {
    cloned.addTrack(track.clone());
  }
  return cloned;
}

void init();
