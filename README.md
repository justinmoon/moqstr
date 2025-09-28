# js-api-meet

This workspace hosts the Playwright harness for experimenting with Media over QUIC demos. The sandbox now renders a local preview plus a simulated remote participant via a mock transport adapter, so UI flows can be rehearsed before wiring in real transports.

## Transport Modes

- **Mock (default):** launches the synthetic transport that mirrors the local stream into a fake remote tile and exposes add/remove controls for Playwright. No MoQ stack required.
- **MoQ relay:** pass `?transport=moq&relay=https://relay.example/anon&room=my-room` (or configure `VITE_TRANSPORT`, `VITE_RELAY_URL`, `VITE_ROOM`) to dial a real relay. The app publishes the local audio/video using the `@kixelated/hang` pipeline and subscribes to active broadcasts in the chosen room prefix. You can persist your display name via `?name=Alice`.

For local testing, run the dev relay provided in the monorepo:

```bash
cd ../moq/rs
cargo run --bin moq-relay -- moq-relay/cfg/dev.toml
```

Then start the sandbox with `npm run dev` and open `http://localhost:4173/?transport=moq&relay=http://localhost:4443/anon&room=demo` (Chrome will require the fingerprint served from the relay on first connect).

## Getting Started

```bash
npm install
npm run dev
```

The app will request `getUserMedia` and render a preview in the browser.

## Run the Playwright check

```bash
npm run test:e2e
```

Chrome is launched with fake camera/microphone devices, backed by fixtures in `fixtures/camera.y4m` and `fixtures/mic.wav`, so every run sees the same deterministic media. The test confirms that the local `<video>` element receives frames, the mock transport can add/remove remote participants, and the UI reacts to mute/speaking toggles.
