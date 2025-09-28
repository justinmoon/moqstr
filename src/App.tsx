import { type Component, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";

import type { MeetingState } from "./meeting/state";
import type { Participant } from "./meeting/types";
import type { MoqTransportConfig, TransportKind } from "./transport/moq";
import type { MeetingTransport, SyntheticRemoteControls, TransportHandle } from "./transport/types";
import { ParticipantTile } from "./ui/ParticipantTile";
import { useMeetingSignals } from "./ui/useMeetingSignals";

export type AppProps = {
  meetingState: MeetingState;
  transport: MeetingTransport;
  transportConfig: MoqTransportConfig;
  transportKind: TransportKind;
  syntheticTransport?: MeetingTransport & SyntheticRemoteControls;
  mockControlsEnabled?: boolean;
  autoMockRemote?: boolean;
};

const LOCAL_ID = "local";

export const App: Component<AppProps> = (props) => {
  const { participants, localParticipant, remoteParticipants } = useMeetingSignals(
    props.meetingState,
  );

  const [systemStatus, setSystemStatus] = createSignal<string | null>("Initializing…");

  const statusText = createMemo(() => {
    const override = systemStatus();
    if (override) return override;

    const participantList = participants();
    const total = participantList.length;
    const local = localParticipant();
    const remotes = remoteParticipants();
    const speakingRemote = remotes.find((participant) => participant.speaking);

    const localStatus = local
      ? local.muted
        ? "Your mic is muted"
        : "Your mic is live"
      : "No local participant";
    let remoteStatus = "No remote participants";
    if (remotes.length > 0) {
      remoteStatus = speakingRemote
        ? "Remote participant is speaking"
        : "Remote participant is listening";
    }

    return `${total} participants in room • ${localStatus} • ${remoteStatus}`;
  });

  const micDisabled = createMemo(() => !localParticipant());
  const micLabel = createMemo(() => {
    const local = localParticipant();
    if (!local) return "Mute microphone";
    return local.muted ? "Unmute microphone" : "Mute microphone";
  });

  const showMockControls = createMemo(() =>
    Boolean(props.mockControlsEnabled && props.syntheticTransport),
  );

  const remoteSpeakingLabel = createMemo(() => {
    const remote = remoteParticipants()[0];
    if (!remote) return "Mark remote as speaking";
    return remote.speaking ? "Mark remote as listening" : "Mark remote as speaking";
  });

  const remoteSpeakingDisabled = createMemo(() => {
    if (!showMockControls()) return true;
    return remoteParticipants().length === 0;
  });

  const addRemoteDisabled = createMemo(() => {
    if (!showMockControls()) return true;
    return !localParticipant();
  });

  const removeRemoteDisabled = createMemo(() => {
    if (!showMockControls()) return true;
    return remoteParticipants().length === 0;
  });

  let transportHandle: TransportHandle | undefined;
  let unloadHandler: ((event: BeforeUnloadEvent) => void) | undefined;

  const stopTransport = async () => {
    if (!transportHandle) return;
    try {
      await transportHandle.stop();
    } catch (error) {
      console.warn("failed to stop transport", error);
    }
    transportHandle = undefined;
  };

  const toggleMic = () => {
    const local = localParticipant();
    if (!local) return;

    const muted = !local.muted;
    local.stream.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
    props.meetingState.updateParticipant(local.id, { muted });
  };

  const toggleRemoteSpeaking = () => {
    if (!showMockControls()) return;
    const remote = remoteParticipants()[0];
    if (!remote) return;

    props.meetingState.updateParticipant(remote.id, { speaking: !remote.speaking });
  };

  const addRemote = () => {
    if (!showMockControls()) return;
    props.syntheticTransport?.addRemoteParticipant();
  };

  const removeRemote = () => {
    if (!showMockControls()) return;
    props.syntheticTransport?.removeRemoteParticipant();
  };

  if (props.syntheticTransport) {
    const transport = props.syntheticTransport;
    const w = window as typeof window & {
      __mockTransport?: MeetingTransport & SyntheticRemoteControls;
      __addMockRemote?: () => Participant;
      __removeMockRemote?: (id?: string) => Participant | undefined;
    };

    w.__mockTransport = transport;
    w.__addMockRemote = () => transport.addRemoteParticipant();
    w.__removeMockRemote = (id?: string) => transport.removeRemoteParticipant(id);

    onCleanup(() => {
      if (w.__mockTransport === transport) {
        delete w.__mockTransport;
        delete w.__addMockRemote;
        delete w.__removeMockRemote;
      }
    });
  }

  onMount(() => {
    void (async () => {
      try {
        setSystemStatus("Requesting camera + microphone…");

        const localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        const local: Participant = props.meetingState.addParticipant({
          id: LOCAL_ID,
          name: props.transportConfig.displayName ?? "You",
          kind: "local",
          stream: localStream,
          muted: false,
          speaking: false,
        });

        if (props.transportKind === "moq") {
          setSystemStatus("Connecting to relay…");
        } else {
          setSystemStatus(null);
        }

        transportHandle = await props.transport.start({
          state: props.meetingState,
          localParticipant: local,
        });

        if (props.syntheticTransport && props.autoMockRemote) {
          props.syntheticTransport.addRemoteParticipant();
        }

        setSystemStatus(null);

        unloadHandler = () => {
          void stopTransport();
        };
        window.addEventListener("beforeunload", unloadHandler);
      } catch (error) {
        console.error("Unable to initialise mock meeting", error);
        setSystemStatus("Failed to acquire camera or microphone. See console for details.");
        await stopTransport();
      }
    })();
  });

  onCleanup(() => {
    if (unloadHandler) {
      window.removeEventListener("beforeunload", unloadHandler);
      unloadHandler = undefined;
    }
    void stopTransport();
  });

  return (
    <main class="app">
      <header class="app__header">
        <h1>Mock Meeting Sandbox</h1>
        <p class="app__subtitle">
          Local preview plus a simulated remote participant for UI/dev testing.
        </p>
      </header>

      <section class="controls" aria-label="Meeting controls">
        <button type="button" onClick={toggleMic} disabled={micDisabled()}>
          {micLabel()}
        </button>
        <Show when={showMockControls()}>
          <div class="controls__mock">
            <button
              type="button"
              onClick={toggleRemoteSpeaking}
              disabled={remoteSpeakingDisabled()}
            >
              {remoteSpeakingLabel()}
            </button>
            <div class="controls__group">
              <button type="button" onClick={addRemote} disabled={addRemoteDisabled()}>
                Add mock remote
              </button>
              <button type="button" onClick={removeRemote} disabled={removeRemoteDisabled()}>
                Remove mock remote
              </button>
            </div>
          </div>
        </Show>
      </section>

      <section
        id="participants"
        class="participants"
        aria-live="polite"
        aria-label="Participants grid"
      >
        <For each={participants()}>
          {(participant) => <ParticipantTile participant={participant} />}
        </For>
      </section>

      <p id="status" class="status">
        {statusText()}
      </p>
    </main>
  );
};
