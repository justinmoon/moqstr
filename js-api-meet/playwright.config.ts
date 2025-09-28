import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(currentDir, "fixtures");
const fakeVideo = path.join(fixturesDir, "camera.y4m");
const fakeAudio = path.join(fixturesDir, "mic.wav");

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:4173",
    permissions: ["camera", "microphone"],
    trace: "retain-on-failure",
    video: "retain-on-failure",
    launchOptions: {
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        "--allow-insecure-localhost",
        "--ignore-certificate-errors",
        "--mute-audio",
        `--use-file-for-fake-video-capture=${fakeVideo}`,
        `--use-file-for-fake-audio-capture=${fakeAudio}`
      ]
    }
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: "npm run dev -- --host --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
