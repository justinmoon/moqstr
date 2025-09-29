import { expect, test } from "@playwright/test";

const HAVE_CURRENT_DATA = 2;

test.describe("mock meeting sandbox", () => {
  test.beforeEach(({ page }) => {
    page.addInitScript(() => {
      const original = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
      if (!navigator.mediaDevices) return;
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        if (original) {
          try {
            return await original(constraints);
          } catch {
            return new MediaStream();
          }
        }
        return new MediaStream();
      };
    });

    page.on("console", (message) => {
      console.log(`[browser] ${message.type()} ${message.text()}`);
    });
    page.on("pageerror", (error) => {
      console.log(`[browser] pageerror ${error.message}`);
    });
  });

  test("shows onboarding page", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /Start a meeting/i })).toBeVisible();
    await expect(page.getByLabel(/Meeting name/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Start meeting/i })).toBeVisible();
  });

  test("renders local preview and responds to UI interactions", async ({ page }) => {
    await page.goto("/mock-room?mockControls=1&transport=mock");

    const localVideo = page.locator('[data-participant-id="local"] video');
    await expect(localVideo).toBeVisible();

    await expect
      .poll(
        async () => {
          return localVideo.evaluate((element) => (element as HTMLVideoElement).readyState);
        },
        {
          message: "local video readyState did not reach HAVE_CURRENT_DATA",
        },
      )
      .toBeGreaterThanOrEqual(HAVE_CURRENT_DATA);

    const dimensions = await localVideo.evaluate((element) => {
      const media = element as HTMLVideoElement;
      return { width: media.videoWidth, height: media.videoHeight, paused: media.paused };
    });

    expect(dimensions.width).toBe(320);
    expect(dimensions.height).toBe(240);
    expect(dimensions.paused).toBe(false);

    const remoteTiles = page.locator('[data-kind="remote"]');
    await expect(remoteTiles).toHaveCount(1);
    await expect(remoteTiles.first()).toHaveAttribute("data-speaking", "false");

    await page.getByRole("button", { name: /Mark remote as speaking/i }).click();
    await expect(remoteTiles.first()).toHaveAttribute("data-speaking", "true");
    await expect(page.locator("#status")).toContainText("Remote participant is speaking");

    await page.getByRole("button", { name: /Mute microphone|Unmute microphone/i }).click();
    const localTile = page.locator('[data-participant-id="local"]');
    await expect(localTile).toHaveAttribute("data-muted", "true");
    await expect(page.locator("#status")).toContainText("Your mic is muted");
    await expect(page.getByRole("button", { name: /Unmute microphone/i })).toBeVisible();

    const removeRemoteButton = page.getByRole("button", { name: /Remove mock remote/i });
    const addRemoteButton = page.getByRole("button", { name: /Add mock remote/i });

    await removeRemoteButton.click();
    await expect(remoteTiles).toHaveCount(0);
    await expect(page.locator("#status")).toContainText("No remote participants");
    await expect(removeRemoteButton).toBeDisabled();
    await expect(page.getByRole("button", { name: /Mark remote as speaking/i })).toBeDisabled();

    await addRemoteButton.click();
    await expect(remoteTiles).toHaveCount(1);
    await expect(remoteTiles.first()).toHaveAttribute("data-speaking", "false");
    await expect(page.getByRole("button", { name: /Mark remote as speaking/i })).toBeEnabled();
  });
});
