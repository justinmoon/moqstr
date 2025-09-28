# js-api-meet

This workspace hosts the Playwright harness for experimenting with Media over QUIC demos. The sandbox now renders a local preview plus a simulated remote participant via a mock transport adapter, so UI flows can be rehearsed before wiring in real transports.

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
