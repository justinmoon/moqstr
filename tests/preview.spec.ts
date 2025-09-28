import { expect, test } from "@playwright/test";

const HAVE_CURRENT_DATA = 2;

test.describe("mock meeting sandbox", () => {
  test("renders local preview and responds to UI interactions", async ({ page }) => {
    await page.goto("/");

    const localVideo = page.locator('[data-participant-id="local"] video');
    await expect(localVideo).toBeVisible();

    await expect.poll(async () => {
      return localVideo.evaluate((element) => (element as HTMLVideoElement).readyState);
    }, {
      message: "local video readyState did not reach HAVE_CURRENT_DATA",
    }).toBeGreaterThanOrEqual(HAVE_CURRENT_DATA);

    const dimensions = await localVideo.evaluate((element) => {
      const media = element as HTMLVideoElement;
      return { width: media.videoWidth, height: media.videoHeight, paused: media.paused };
    });

    expect(dimensions.width).toBe(320);
    expect(dimensions.height).toBe(240);
    expect(dimensions.paused).toBe(false);

    const remoteTile = page.locator('[data-kind="remote"]');
    await expect(remoteTile).toBeVisible();
    await expect(remoteTile).toHaveAttribute("data-speaking", "false");

    await page.getByRole("button", { name: /Mark remote as speaking/i }).click();
    await expect(remoteTile).toHaveAttribute("data-speaking", "true");
    await expect(page.locator("#status")).toContainText("Remote participant is speaking");

    await page.getByRole("button", { name: /Mute microphone|Unmute microphone/i }).click();
    const localTile = page.locator('[data-participant-id="local"]');
    await expect(localTile).toHaveAttribute("data-muted", "true");
    await expect(page.locator("#status")).toContainText("Your mic is muted");
    await expect(page.getByRole("button", { name: /Unmute microphone/i })).toBeVisible();
  });
});
