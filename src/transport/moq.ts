import { Effect } from "@kixelated/signals";
import { Moq, Publish, Watch } from "@kixelated/hang";
import { Room } from "@kixelated/hang/meet";

import type { MeetingState } from "../meeting/state";
import type { Participant } from "../meeting/types";
import type { MeetingTransport, TransportHandle, TransportOptions } from "./types";
import { MockMeetingTransport } from "./mock";

export type MoqTransportConfig = {
  relayUrl: string;
  roomPath: string;
  participantId: string;
  displayName?: string;
  autoEnableAudio?: boolean;
};

const DEFAULT_AUTO_AUDIO = true;

export class MoqMeetingTransport implements MeetingTransport {
  #config: MoqTransportConfig;
  #connection?: Moq.Connection.Established;
  #broadcast?: Publish.Broadcast;
  #room?: Room;
  #state?: MeetingState;
  #localPath?: Moq.Path.Valid;
  #remoteResources = new Map<string, RemoteResources>();

  constructor(config: MoqTransportConfig) {
    this.#config = config;
  }

  async start(options: TransportOptions): Promise<TransportHandle> {
    const { state, localParticipant } = options;
    const relayUrl = new URL(this.#config.relayUrl);

    this.#state = state;

    try {
      this.#connection = await Moq.Connection.connect(relayUrl, {
        websocket: { enabled: false },
      });

      const roomPath = this.#config.roomPath.trim();
      const roomPrefix = roomPath ? Moq.Path.from(roomPath) : Moq.Path.empty();
      const participantId = this.#config.participantId || crypto.randomUUID();
      const broadcastPath = roomPath
        ? Moq.Path.join(roomPrefix, Moq.Path.from(participantId))
        : Moq.Path.from(participantId);
      this.#localPath = broadcastPath;

      const audioTrack = localParticipant.stream.getAudioTracks()[0] as Publish.Audio.Source | undefined;
      const videoTrack = localParticipant.stream.getVideoTracks()[0] as Publish.Video.Source | undefined;

      this.#broadcast = new Publish.Broadcast({
        connection: this.#connection,
        enabled: true,
        path: broadcastPath,
        audio: audioTrack
          ? {
              enabled: true,
              source: audioTrack,
              speaking: { enabled: true },
            }
          : { enabled: false },
        video: videoTrack
          ? {
              enabled: true,
              source: videoTrack,
            }
          : { enabled: false },
        user: {
          name: this.#config.displayName ?? "MoQ Caller",
        },
      });

      // Advertise the local broadcast to the room so it shows up as active.
      this.#room = new Room({
        connection: this.#connection,
        path: roomPrefix,
      });
      this.#room.preview(broadcastPath, this.#broadcast);

      this.#room.onRemote(this.#onRemote.bind(this));

      const autoAudio = this.#config.autoEnableAudio ?? DEFAULT_AUTO_AUDIO;
      if (audioTrack) {
        audioTrack.enabled = autoAudio;
      }

      return {
        stop: async () => {
          this.#teardown();
        },
      };
    } catch (error) {
      console.error("Failed to start MoQ transport", error);
      this.#teardown();
      throw error;
    }
  }

  #onRemote(path: Moq.Path.Valid, broadcast?: Watch.Broadcast) {
    if (!broadcast) {
      this.#cleanupRemote(path);
      const participantId = this.#pathToParticipantId(path);
      this.#state?.removeParticipant(participantId);
      return;
    }

    this.#cleanupRemote(path);

    broadcast.enabled.set(true);
    broadcast.video.enabled.set(true);
    broadcast.audio.enabled.set(true);
    broadcast.audio.speaking.enabled.set(true);
    broadcast.user.enabled.set(true);

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    Object.assign(canvas.style, {
      position: "fixed",
      width: "1px",
      height: "1px",
      top: "0",
      left: "0",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "-1",
    });
    document.body.appendChild(canvas);

    const renderer = new Watch.Video.Renderer(broadcast.video, { canvas });
    renderer.source.enabled.set(true);
    renderer.paused.set(false);
    const stream = canvas.captureStream(30);
    const emitter = new Watch.Audio.Emitter(broadcast.audio, {
      muted: false,
    });

    const participantId = this.#pathToParticipantId(path);
    const displayName = this.#displayNameFor(path);

    // Remove stale participant entry if we are reconnecting.
    this.#state?.removeParticipant(participantId);

    const participant: Participant = {
      id: participantId,
      name: displayName,
      kind: "remote",
      stream,
      muted: false,
      speaking: false,
    };

    this.#state?.addParticipant(participant);

    const speakingEffect = new Effect();
    speakingEffect.effect((effect) => {
      const active = effect.get(broadcast.audio.speaking.active);
      if (typeof active === "boolean") {
        this.#state?.updateParticipant(participantId, { speaking: active });
      }
    });

    const userEffect = new Effect();
    userEffect.effect((effect) => {
      const name = effect.get(broadcast.user.name);
      if (name) {
        this.#state?.updateParticipant(participantId, { name });
      }
    });

    this.#remoteResources.set(path, {
      renderer,
      emitter,
      canvas,
      stream,
      effects: [speakingEffect, userEffect],
    });
  }

  #cleanupRemote(path: Moq.Path.Valid) {
    const resources = this.#remoteResources.get(path);
    if (resources) {
      resources.renderer.close();
      resources.emitter.close();
      resources.stream.getTracks().forEach((track) => track.stop());
      this.#remoteResources.delete(path);

      for (const effect of resources.effects) {
        effect.close();
      }

      if (resources.canvas.isConnected) {
        resources.canvas.remove();
      }
    }
  }

  #pathToParticipantId(path: Moq.Path.Valid): string {
    const localPath = this.#localPath;
    if (localPath && path === localPath) {
      return "local";
    }

    const base = this.#config.roomPath.trim();
    if (!base) {
      return path;
    }

    const suffix = Moq.Path.stripPrefix(Moq.Path.from(base), path);
    return suffix ?? path;
  }

  #displayNameFor(path: Moq.Path.Valid): string {
    const suffix = this.#pathToParticipantId(path);
    if (suffix && suffix !== path) {
      return suffix || path;
    }

    return path.split("/").pop() ?? path;
  }

  #teardown() {
    this.#broadcast?.close();
    this.#room?.close();
    this.#connection?.close();

    for (const resources of this.#remoteResources.values()) {
      resources.renderer.close();
      resources.emitter.close();
      resources.stream.getTracks().forEach((track) => track.stop());
      for (const effect of resources.effects) {
        effect.close();
      }
    }
    this.#remoteResources.clear();
  }
}

type RemoteResources = {
  renderer: Watch.Video.Renderer;
  emitter: Watch.Audio.Emitter;
  canvas: HTMLCanvasElement;
  stream: MediaStream;
  effects: Effect[];
};

export type TransportKind = "mock" | "moq";

export function createTransport(kind: TransportKind, config: MoqTransportConfig): MeetingTransport {
  if (kind === "moq") {
    return new MoqMeetingTransport(config);
  }
  return new MockMeetingTransport();
}
