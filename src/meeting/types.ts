export type ParticipantKind = "local" | "remote";

export type Participant = {
  id: string;
  name: string;
  kind: ParticipantKind;
  stream: MediaStream;
  muted: boolean;
  speaking: boolean;
};

export type ParticipantUpdate = Partial<Omit<Participant, "id">>;

export type MeetingEventType = "participant-added" | "participant-updated" | "participant-removed";

export type MeetingEvent = {
  type: MeetingEventType;
  participant: Participant;
};

export type MeetingListener = (event: MeetingEvent) => void;
