# JS API Hang Demo Plan (V1.1)

## Objective
- build a minimal Google Meet–style MoQ meeting demo entirely inside `~/code/moq/demos`, relying on plain TypeScript/JS APIs (no Web Components) while reusing the audio worklet–based capture/encode pipeline exposed by the library.

## Constraints & Approach
- keep all demo source, assets, and tooling local to `~/code/moq/demos`; only touch `~/code/moq/moq` if a library fix is absolutely required.
- mirror the Vite + Tailwind + Biome setup used by `moq/js/hang-demo`, but recreate the configuration locally so the demo is self-contained.

## Reconnaissance
- review `~/code/moq/moq/js/hang` to inventory available publish/watch/meet primitives (`Publish.Audio.Encoder`, `Publish.Video.Source`, `Watch.Video.Player`, `Meet.Room`, etc.) that we can consume from the library.
- trace how the audio capture worklet is brought in (`capture-worklet?worker&url`) so we can register it from our own Vite build without bringing over the Web Components.
- catalog any environment variables or helper utilities (relay URL resolution, path helpers) we should replicate inside the demos project.

## Implementation Steps
1. Scaffold a new Vite workspace under `~/code/moq/demos/js-api-meet` (package.json, tsconfig, vite.config.ts, tailwind config, src/). Copy needed config patterns from `hang-demo` but keep paths relative to the demos folder.
2. Author an entry point (`src/main.ts`) that bootstraps the meeting experience: parse relay URL + meeting path, establish a `Moq.Connection`, create a `Meet.Room`, and expose state via lightweight signals/stores.
3. Implement local publishing modules within the demos project: wrap `Publish.Video.Source` and `Publish.Audio.Encoder` (with the audio worklet) to manage device selection, mute toggles, and preview registration against the room.
4. Implement remote media handling: for each announced broadcast from the room, spin up DOM-backed renderers using `Watch.Video.Player` and `Watch.Audio.Player`, manage lifecycle (enable on view, dispose on leave), and reconcile with local previews.
5. Build a minimal UI layer (HTML + Tailwind/utility CSS) featuring a participants grid, local preview, join/leave and mic/cam controls, and simple status indicators sourced from the meeting state.
6. Add supporting utilities (error boundary, logging, device prompts) and ensure everything is typed; organize code into modules like `state/`, `ui/`, `media/` within the demos project for clarity.
7. Wire up package scripts (`pnpm dev`, `pnpm build`) and document how to run the demo from `~/code/moq/demos`, including any required env vars (relay token).

## Audio Worklet Notes
- rely on `Publish.Audio.Encoder` so we inherit the existing `capture-worklet` path; preload/register the worklet before enabling audio capture to avoid race conditions.
- surface gain/mute controls by binding to encoder signals; expose speaking-activity data (`encoder.speaking.catalog`) so the UI can highlight active speakers.
- validate sample rate/channel configuration against the acquired `MediaStreamTrack` to avoid glitches, and gracefully report failures if the worklet cannot initialize.

## Validation & Observability
- manual QA: open two browser tabs against the demo, confirm local preview, remote rendering, audio quality, and control toggles.
- add console logging for connection lifecycle, worklet readiness, and room membership changes to simplify debugging.
- run `pnpm check` (tsc + biome) inside `~/code/moq/demos/js-api-meet` to ensure type safety and lint cleanliness.

## Open Questions
- should the demos project host multiple entries (e.g., keep existing examples) or dedicate this workspace solely to the meeting demo?
- do we prompt for a meeting path or auto-join a default path on load?
- is device selection (camera/mic dropdown) required for v1, or can we stick with default devices and add selection later?
