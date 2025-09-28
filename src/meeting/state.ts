import type {
  MeetingEvent,
  MeetingEventType,
  MeetingListener,
  Participant,
  ParticipantUpdate,
} from "./types";

const EVENT_TYPES: MeetingEventType[] = [
  "participant-added",
  "participant-updated",
  "participant-removed",
];

export class MeetingState {
  #participants = new Map<string, Participant>();
  #listeners = new Map<MeetingEventType, Set<MeetingListener>>();
  #localParticipantId?: string;

  constructor() {
    for (const type of EVENT_TYPES) {
      this.#listeners.set(type, new Set());
    }
  }

  addParticipant(participant: Participant): Participant {
    if (this.#participants.has(participant.id)) {
      throw new Error(`participant with id "${participant.id}" already exists`);
    }

    if (participant.kind === "local") {
      this.#localParticipantId = participant.id;
    }

    const stored: Participant = { ...participant };
    this.#participants.set(participant.id, stored);
    this.#emit("participant-added", stored);
    return this.#cloneParticipant(stored);
  }

  updateParticipant(id: string, update: ParticipantUpdate): Participant {
    const current = this.#participants.get(id);
    if (!current) throw new Error(`participant "${id}" not found`);

    const updated: Participant = { ...current, ...update };
    this.#participants.set(id, updated);

    if (updated.kind === "local") {
      this.#localParticipantId = updated.id;
    }

    this.#emit("participant-updated", updated);
    return this.#cloneParticipant(updated);
  }

  removeParticipant(id: string): void {
    const existing = this.#participants.get(id);
    if (!existing) return;

    this.#participants.delete(id);
    if (this.#localParticipantId === id) {
      this.#localParticipantId = undefined;
    }

    this.#emit("participant-removed", existing);
  }

  getParticipant(id: string): Participant | undefined {
    const participant = this.#participants.get(id);
    return participant ? this.#cloneParticipant(participant) : undefined;
  }

  getParticipants(): Participant[] {
    return Array.from(this.#participants.values(), (participant) =>
      this.#cloneParticipant(participant),
    );
  }

  getLocalParticipant(): Participant | undefined {
    if (!this.#localParticipantId) return undefined;
    return this.getParticipant(this.#localParticipantId);
  }

  getRemoteParticipants(): Participant[] {
    return this.getParticipants().filter((participant) => participant.kind === "remote");
  }

  on(type: MeetingEventType, listener: MeetingListener): () => void {
    const listeners = this.#listeners.get(type);
    if (!listeners) throw new Error(`unsupported listener type: ${type}`);

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  #emit(type: MeetingEventType, participant: Participant): void {
    const listeners = this.#listeners.get(type);
    if (!listeners || listeners.size === 0) return;

    const payload: MeetingEvent = {
      type,
      participant: this.#cloneParticipant(participant),
    };

    for (const listener of listeners) {
      listener(payload);
    }
  }

  #cloneParticipant(participant: Participant): Participant {
    return { ...participant };
  }
}
