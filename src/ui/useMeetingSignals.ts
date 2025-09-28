import { Signal } from "@kixelated/signals";
import solid from "@kixelated/signals/solid";
import type { Accessor } from "solid-js";
import { onCleanup } from "solid-js";

import type { MeetingState } from "../meeting/state";
import type { Participant } from "../meeting/types";

export type MeetingSignals = {
  participants: Accessor<Participant[]>;
  localParticipant: Accessor<Participant | undefined>;
  remoteParticipants: Accessor<Participant[]>;
};

export function useMeetingSignals(state: MeetingState): MeetingSignals {
  const participantsSignal = new Signal<Participant[]>(state.getParticipants());
  const localSignal = new Signal<Participant | undefined>(state.getLocalParticipant());
  const remoteSignal = new Signal<Participant[]>(state.getRemoteParticipants());

  const sync = () => {
    participantsSignal.set(state.getParticipants());
    localSignal.set(state.getLocalParticipant());
    remoteSignal.set(state.getRemoteParticipants());
  };

  const subscriptions = [
    state.on("participant-added", () => sync()),
    state.on("participant-updated", () => sync()),
    state.on("participant-removed", () => sync()),
  ];

  onCleanup(() => {
    for (const dispose of subscriptions) {
      dispose();
    }
  });

  return {
    participants: solid(participantsSignal),
    localParticipant: solid(localSignal),
    remoteParticipants: solid(remoteSignal),
  };
}
