import { cloneMediaStream } from "../meeting/media";
import type { MeetingState } from "../meeting/state";
import type { Participant } from "../meeting/types";
import type { MeetingTransport, TransportHandle, TransportOptions } from "./types";

let counter = 0;

export class MockMeetingTransport implements MeetingTransport {
  async start(options: TransportOptions): Promise<TransportHandle> {
    const remote = this.#createRemoteParticipant(options.state, options.localParticipant);
    options.state.addParticipant(remote);

    return {
      stop: async () => {
        this.#teardown(remote);
        options.state.removeParticipant(remote.id);
      },
    };
  }

  #createRemoteParticipant(state: MeetingState, local: Participant): Participant {
    const id = `remote-mock-${counter++}`;
    const stream = cloneMediaStream(local.stream);

    return {
      id,
      name: "Remote (mock)",
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
