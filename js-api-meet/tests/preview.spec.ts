import { expect, test } from "@playwright/test";

const HAVE_CURRENT_DATA = 2;

test.describe("fake camera preview", () => {
  test("renders the fake webcam stream", async ({ page }) => {
    await page.goto("/");

    const video = page.locator("#preview");
    await expect(video).toBeVisible();

    // Wait until the video element reports that it has enough data to play.
    await expect.poll(async () => {
      return video.evaluate((element) => (element as HTMLVideoElement).readyState);
    }, {
      message: "video readyState did not reach HAVE_CURRENT_DATA"
    }).toBeGreaterThanOrEqual(HAVE_CURRENT_DATA);

    const dimensions = await video.evaluate((element) => {
      const media = element as HTMLVideoElement;
      return { width: media.videoWidth, height: media.videoHeight, paused: media.paused };
    });

    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);
    expect(dimensions.paused).toBe(false);

    const status = page.locator("#status");
    await expect(status).toHaveText(/Camera stream is playing/i);
  });
});
