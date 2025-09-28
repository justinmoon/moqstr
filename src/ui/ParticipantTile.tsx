import type { Component } from "solid-js";
import { createEffect, onCleanup } from "solid-js";

import type { Participant } from "../meeting/types";
import { attachStream } from "./media";

function describeStatus(participant: Participant): string {
  if (participant.kind === "local") {
    return participant.muted ? "Muted" : "Live";
  }

  return participant.speaking ? "Speaking" : "Listening";
}

export const ParticipantTile: Component<{ participant: Participant }> = (props) => {
  let videoRef: HTMLVideoElement | undefined;

  createEffect(() => {
    const participant = props.participant;
    if (!videoRef) return;
    void attachStream(videoRef, participant.stream, participant.kind === "local");
  });

  onCleanup(() => {
    if (videoRef) {
      videoRef.pause();
      videoRef.srcObject = null;
    }
  });

  return (
    <div
      class="participant"
      data-participant-id={props.participant.id}
      data-kind={props.participant.kind}
      data-muted={String(props.participant.muted)}
      data-speaking={String(props.participant.speaking)}
    >
      <video
        ref={(el) => {
          videoRef = el;
        }}
        class="participant__video"
        playsInline
        autoplay
        muted={props.participant.kind === "local"}
      />
      <div class="participant__info">
        <span class="participant__name">{props.participant.name}</span>
        <span class="participant__status">{describeStatus(props.participant)}</span>
      </div>
    </div>
  );
};
