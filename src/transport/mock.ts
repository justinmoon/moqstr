import { cloneMediaStream } from "../meeting/media";
import type { MeetingState } from "../meeting/state";
import type { Participant } from "../meeting/types";
import type { MeetingTransport, TransportHandle, TransportOptions } from "./types";

let counter = 0;

export class MockMeetingTransport implements MeetingTransport {
  #state?: MeetingState;
  #local?: Participant;
  #remotes = new Map<string, Participant>();

  async start(options: TransportOptions): Promise<TransportHandle> {
    this.#state = options.state;
    this.#local = options.localParticipant;

    const handle: TransportHandle = {
      stop: async () => {
        for (const remote of this.#remotes.values()) {
          this.#teardown(remote);
          this.#state?.removeParticipant(remote.id);
        }
        this.#remotes.clear();
      },
    };

    this.addRemoteParticipant();

    return handle;
  }

  addRemoteParticipant(): Participant {
    if (!this.#state || !this.#local) {
      throw new Error("MockMeetingTransport must be started before adding remotes");
    }

    const remote = this.#createRemoteParticipant(this.#state, this.#local);
    this.#remotes.set(remote.id, remote);
    this.#state.addParticipant(remote);
    return remote;
  }

  removeRemoteParticipant(id?: string): Participant | undefined {
    if (!this.#state) return undefined;
    const targetId = id ?? Array.from(this.#remotes.keys()).pop();
    if (!targetId) return undefined;

    const participant = this.#remotes.get(targetId);
    if (!participant) return undefined;

    this.#teardown(participant);
    this.#remotes.delete(targetId);
    this.#state.removeParticipant(targetId);
    return participant;
  }

  #createRemoteParticipant(state: MeetingState, local: Participant): Participant {
    const index = counter++;
    const id = `remote-mock-${index}`;
    const stream = cloneMediaStream(local.stream);
    const name = index === 0 ? "Remote (mock)" : `Remote (mock) #${index + 1}`;

    return {
      id,
      name,
      kind: "remote",
      stream,
      muted: false,
      speaking: false,
    };
  }

  #teardown(participant: Participant): void {
    for (const track of participant.stream.getTracks()) {
      track.stop();
    }
  }
}
