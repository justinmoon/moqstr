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

export interface SyntheticRemoteControls {
  addRemoteParticipant(): Participant;
  removeRemoteParticipant(id?: string): Participant | undefined;
}

export function hasSyntheticRemoteControls(
  transport: MeetingTransport,
): transport is MeetingTransport & SyntheticRemoteControls {
  return typeof (transport as SyntheticRemoteControls).addRemoteParticipant === "function";
}
