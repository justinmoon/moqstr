import "./style.css";

import { render } from "solid-js/web";

import { App } from "./App";
import { MeetingState } from "./meeting/state";
import { createTransport, type MoqTransportConfig, type TransportKind } from "./transport/moq";
import { hasSyntheticRemoteControls } from "./transport/types";

const root = document.getElementById("root");
if (!root) {
  throw new Error('Root element with id "root" was not found.');
}

const searchParams = new URLSearchParams(window.location.search);
const envTransport = (import.meta.env.VITE_TRANSPORT as string | undefined)?.toLowerCase();
const paramTransport = searchParams.get("transport")?.toLowerCase();

const resolveTransportKind = (): TransportKind => {
  if (paramTransport === "moq" || paramTransport === "mock") {
    return paramTransport;
  }
  if (envTransport === "moq") {
    return "moq";
  }
  return "mock";
};

let transportKind: TransportKind = resolveTransportKind();

const relayUrlParam =
  searchParams.get("relay") ?? (import.meta.env.VITE_RELAY_URL as string | undefined) ?? "";
if (transportKind === "moq" && !relayUrlParam) {
  console.warn("Missing relay URL; falling back to mock transport for sandbox testing.");
  transportKind = "mock";
}

const roomPath =
  searchParams.get("room") ?? (import.meta.env.VITE_ROOM as string | undefined) ?? "js-api-meet";
const storedParticipantIdKey = "jsApiMeet.participantId";

const participantId = (() => {
  const existing = localStorage.getItem(storedParticipantIdKey);
  if (existing) return existing;
  const generated = crypto.randomUUID();
  localStorage.setItem(storedParticipantIdKey, generated);
  return generated;
})();

const displayNameParam = searchParams.get("name");
if (displayNameParam) {
  localStorage.setItem("jsApiMeet.displayName", displayNameParam);
}
const storedDisplayName = localStorage.getItem("jsApiMeet.displayName") ?? undefined;

const mockControlsEnabled = (() => {
  const param = searchParams.get("mockControls");
  if (param) {
    const value = param.toLowerCase();
    return value === "1" || value === "true";
  }
  const env = (import.meta.env.VITE_MOCK_CONTROLS as string | undefined)?.toLowerCase();
  return env === "1" || env === "true";
})();

const autoMockRemote = (() => {
  if (!mockControlsEnabled) return false;
  const param = searchParams.get("autoMockRemote");
  if (!param) return true;
  const value = param.toLowerCase();
  return value !== "0" && value !== "false";
})();

const transportConfig: MoqTransportConfig = {
  relayUrl: relayUrlParam || "http://localhost:4443/anon",
  roomPath,
  participantId,
  displayName: displayNameParam ?? storedDisplayName ?? "Guest",
  autoEnableAudio: true,
};

const transport = createTransport(transportKind, transportConfig);
const meetingState = new MeetingState();
const syntheticTransport = hasSyntheticRemoteControls(transport) ? transport : undefined;

render(
  () => (
    <App
      meetingState={meetingState}
      transport={transport}
      transportConfig={transportConfig}
      transportKind={transportKind}
      syntheticTransport={syntheticTransport}
      mockControlsEnabled={mockControlsEnabled}
      autoMockRemote={autoMockRemote}
    />
  ),
  root,
);
