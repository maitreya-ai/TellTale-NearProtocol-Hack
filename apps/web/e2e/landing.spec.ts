import { expect, test } from "@playwright/test";

test.describe("Landing page", () => {
  test("says what Telltale is, and Launch opens How it works", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Every agent key is a tripwire." }),
    ).toBeVisible();
    await expect(page.getByTestId("live-chip")).toContainText("Vault armed");
    await page.getByTestId("nav-launch").click();
    await expect(page).toHaveURL(/\/how-it-works$/);
    await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  });

  test("the scroll story walks from armed to tripped to re-armed", async ({ page }) => {
    await page.goto("/");
    const story = page.getByTestId("story");
    const title = page.getByTestId("story-title");
    const scrollTo = (fraction: number) =>
      page.evaluate((f) => {
        const el = document.getElementById("how")!;
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: top + f * (el.offsetHeight - window.innerHeight),
          behavior: "instant",
        });
      }, fraction);

    for (const [fraction, stage, word] of [
      [0.1, "0", "Armed."],
      [0.35, "1", "Caught."],
      [0.6, "2", "Tripped."],
      [0.9, "3", "Re-armed."],
    ] as const) {
      await scrollTo(fraction);
      await expect(story).toHaveAttribute("data-stage", stage);
      await expect(title).toHaveText(word);
    }
  });

  test("unknown pages return the 404 page", async ({ page }) => {
    const res = await page.goto("/no-such-page");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("access key does not exist")).toBeVisible();
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
