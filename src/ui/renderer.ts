import { MeetingState } from "../meeting/state";
import { Participant } from "../meeting/types";

const SPEAKING_TRUE = "true";
const SPEAKING_FALSE = "false";
const MUTED_TRUE = "true";
const MUTED_FALSE = "false";

export type MeetingRendererOptions = {
  container: HTMLElement;
  status: HTMLElement;
  muteButton: HTMLButtonElement;
  remoteSpeakingButton: HTMLButtonElement;
};

type ParticipantTile = {
  container: HTMLDivElement;
  video: HTMLVideoElement;
  name: HTMLSpanElement;
  status: HTMLSpanElement;
};

export class MeetingRenderer {
  #tiles = new Map<string, ParticipantTile>();
  #subscriptions: Array<() => void> = [];

  constructor(private readonly state: MeetingState, private readonly options: MeetingRendererOptions) {
    const listener = (participant: Participant, type: "participant-added" | "participant-updated" | "participant-removed") => {
      if (type === "participant-removed") {
        this.#removeTile(participant.id);
      } else {
        this.#upsertTile(participant);
      }
      this.#updateStatus();
      this.#updateControls();
    };

    this.#subscriptions.push(
      this.state.on("participant-added", (event) => listener(event.participant, event.type)),
      this.state.on("participant-updated", (event) => listener(event.participant, event.type)),
      this.state.on("participant-removed", (event) => listener(event.participant, event.type)),
    );

    // Render any participants that may already exist.
    for (const participant of this.state.getParticipants()) {
      this.#upsertTile(participant);
    }
    this.#updateStatus();
    this.#updateControls();
  }

  destroy(): void {
    for (const unsubscribe of this.#subscriptions) {
      unsubscribe();
    }
    this.#subscriptions = [];
  }

  #upsertTile(participant: Participant): void {
    let tile = this.#tiles.get(participant.id);
    if (!tile) {
      tile = this.#createTile();
      this.#tiles.set(participant.id, tile);
      this.options.container.appendChild(tile.container);
    }

    tile.container.dataset.participantId = participant.id;
    tile.container.dataset.kind = participant.kind;
    tile.container.dataset.muted = participant.muted ? MUTED_TRUE : MUTED_FALSE;
    tile.container.dataset.speaking = participant.speaking ? SPEAKING_TRUE : SPEAKING_FALSE;
    tile.name.textContent = participant.name;
    tile.status.textContent = this.#describeStatus(participant);

    void this.#attachStream(tile.video, participant.stream, participant.kind === "local");
  }

  #removeTile(participantId: string): void {
    const tile = this.#tiles.get(participantId);
    if (!tile) return;
    tile.container.remove();
    this.#tiles.delete(participantId);
  }

  async #attachStream(video: HTMLVideoElement, stream: MediaStream, muted: boolean): Promise<void> {
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

  #createTile(): ParticipantTile {
    const container = document.createElement("div");
    container.className = "participant";

    const video = document.createElement("video");
    video.className = "participant__video";
    video.playsInline = true;
    video.autoplay = true;

    const info = document.createElement("div");
    info.className = "participant__info";

    const name = document.createElement("span");
    name.className = "participant__name";

    const status = document.createElement("span");
    status.className = "participant__status";

    info.appendChild(name);
    info.appendChild(status);
    container.appendChild(video);
    container.appendChild(info);

    return { container, video, name, status };
  }

  #describeStatus(participant: Participant): string {
    if (participant.kind === "local") {
      return participant.muted ? "Muted" : "Live";
    }
    if (participant.speaking) {
      return "Speaking";
    }
    return "Listening";
  }

  #updateStatus(): void {
    const participants = this.state.getParticipants();
    const total = participants.length;
    const local = this.state.getLocalParticipant();
    const remoteParticipants = this.state.getRemoteParticipants();
    const speakingRemote = remoteParticipants.find((participant) => participant.speaking);

    const localStatus = local ? (local.muted ? "Your mic is muted" : "Your mic is live") : "No local participant";
    let remoteStatus = "No remote participants";
    if (remoteParticipants.length > 0) {
      remoteStatus = speakingRemote ? "Remote participant is speaking" : "Remote participant is listening";
    }

    this.options.status.textContent = `${total} participants in room • ${localStatus} • ${remoteStatus}`;
  }

  #updateControls(): void {
    const local = this.state.getLocalParticipant();
    if (local) {
      this.options.muteButton.disabled = false;
      this.options.muteButton.textContent = local.muted ? "Unmute microphone" : "Mute microphone";
    } else {
      this.options.muteButton.disabled = true;
      this.options.muteButton.textContent = "Mute microphone";
    }

    const remote = this.state.getRemoteParticipants()[0];
    if (remote) {
      this.options.remoteSpeakingButton.disabled = false;
      this.options.remoteSpeakingButton.textContent = remote.speaking ? "Mark remote as listening" : "Mark remote as speaking";
    } else {
      this.options.remoteSpeakingButton.disabled = true;
      this.options.remoteSpeakingButton.textContent = "Mark remote as speaking";
    }
  }
}
