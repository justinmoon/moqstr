import type { MeetingState } from "../meeting/state";
import type { Participant } from "../meeting/types";

export type TransportOptions = {
  state: MeetingState;
  localParticipant: Participant;
};

export type TransportHandle = {
  stop(): Promise<void>;
};

export interface MeetingTransport {
  start(options: TransportOptions): Promise<TransportHandle>;
}
