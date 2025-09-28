import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Locator, test } from "@playwright/test";

const RELAY_HOST = "127.0.0.1";
const RELAY_PORT = 4443;
const RELAY_URL = `http://${RELAY_HOST}:${RELAY_PORT}/anon`;
const ROOM_NAME = `playwright-room-${Date.now()}`;
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_RELAY_CONFIG = path.resolve(CURRENT_DIR, "../config/moq-relay-dev.toml");

function parseArgs(value: string | undefined): string[] {
  if (!value) return [];
  const matches = value.match(/(?:"[^"]*"|'[^']*'|[^\s"]+)/g);
  if (!matches) return [];
  return matches.map((token) => token.replace(/^['"]|['"]$/g, ""));
}

function startRelay(): ReturnType<typeof spawn> {
  const relayBin = process.env.MOQ_RELAY_BIN;
  const relayArgs = parseArgs(process.env.MOQ_RELAY_ARGS);
  const relayConfig = process.env.MOQ_RELAY_CONFIG ?? DEFAULT_RELAY_CONFIG;

  if (!existsSync(relayConfig)) {
    throw new Error(`moq-relay config not found at ${relayConfig}`);
  }

  if (relayBin) {
    const args = [...relayArgs, relayConfig];
    const child = spawn(relayBin, args, {
      stdio: "pipe",
      env: { ...process.env, RUST_LOG: process.env.RUST_LOG ?? "warn" },
    });
    return child;
  }

  const relayCwd = path.resolve(CURRENT_DIR, "../../moq/rs");
  return spawn("cargo", ["run", "--bin", "moq-relay", "--", "moq-relay/cfg/dev.toml"], {
    cwd: relayCwd,
    stdio: "pipe",
    env: { ...process.env, RUST_LOG: process.env.RUST_LOG ?? "warn" },
  });
}

async function waitForPort(port: number, host: string, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  for (;;) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection({ port, host }, () => {
          socket.end();
          resolve();
        });
        socket.on("error", reject);
      });
      return;
    } catch {
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Timed out waiting for ${host}:${port}`);
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }
}

test.describe("MoQ transport remote playback", () => {
  let relayProcess: ReturnType<typeof spawn> | undefined;

  test.beforeAll(async () => {
    relayProcess = startRelay();

    relayProcess.stdout?.on("data", (chunk) => {
      console.log(`[relay] ${chunk.toString().trim()}`);
    });
    relayProcess.stderr?.on("data", (chunk) => {
      console.warn(`[relay:err] ${chunk.toString().trim()}`);
    });

    await waitForPort(RELAY_PORT, RELAY_HOST);
  });

  test.afterAll(async () => {
    if (!relayProcess) return;
    await new Promise<void>((resolve) => {
      relayProcess?.once("close", () => resolve());
      relayProcess?.kill("SIGINT");
      setTimeout(() => resolve(), 2000);
    });
  });

  test("two chromium contexts render each other's video", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();

    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const base = `/?transport=moq&relay=${encodeURIComponent(RELAY_URL)}&room=${ROOM_NAME}`;

    await pageA.goto(`${base}&name=ClientA`);
    await pageB.goto(`${base}&name=ClientB`);

    const HAVE_CURRENT_DATA = 2;

    // Local previews ready
    for (const page of [pageA, pageB]) {
      const localVideo = page.locator('[data-participant-id="local"] video');
      await expect(localVideo).toBeVisible();
      await expect
        .poll(
          async () => {
            return localVideo.evaluate((el) => (el as HTMLVideoElement).readyState);
          },
          { message: "local readyState" },
        )
        .toBeGreaterThanOrEqual(HAVE_CURRENT_DATA);
    }

    // Each page should see exactly one remote participant (the other client)
    const remoteA = pageA.locator('[data-kind="remote"] video');
    const remoteB = pageB.locator('[data-kind="remote"] video');

    await expect(remoteA).toHaveCount(1, { timeout: 15000 });
    await expect(remoteB).toHaveCount(1, { timeout: 15000 });

    const checkVideo = async (locator: Locator) => {
      await expect(locator).toBeVisible();
      await expect
        .poll(
          async () => {
            return locator.evaluate((el) => (el as HTMLVideoElement).readyState);
          },
          { message: "remote readyState" },
        )
        .toBeGreaterThanOrEqual(HAVE_CURRENT_DATA);

      const dims = await locator.evaluate((el) => {
        const video = el as HTMLVideoElement;
        return { width: video.videoWidth, height: video.videoHeight };
      });
      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBeGreaterThan(0);
    };

    await checkVideo(remoteA.first());
    await checkVideo(remoteB.first());

    await ctxA.close();
    await ctxB.close();
  });
});
