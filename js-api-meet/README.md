# js-api-meet

This workspace hosts the Playwright harness for experimenting with Media over QUIC demos. The first check validates that Chrome's fake camera can be wired into a simple Vite page.

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

Chrome is launched with fake camera/microphone devices, backed by fixtures in `fixtures/camera.y4m` and `fixtures/mic.wav`, so every run sees the same deterministic media. The test confirms that the `<video>` element receives frames and updates its status message.
