import { expect, test } from "@playwright/test";

test.describe("Landing page", () => {
  test("says what Telltale is, and Launch opens How it works", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Every agent key is a tripwire.",
    );
    await expect(page.getByTestId("live-chip")).toContainText("Vault armed");
    await page.getByTestId("nav-launch").click();
    await expect(page).toHaveURL(/\/how-it-works$/);
    await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  });

  test("the hero demo trips on a stolen key and re-arms", async ({ page }) => {
    await page.goto("/");
    const state = page.getByTestId("demo-state");
    await expect(state).toHaveText("Armed");
    await page.getByTestId("demo-steal").click();
    await expect(state).toHaveText("Tripped");
    await expect(page.getByTestId("trip-demo")).toContainText("Every agent key deleted");
    await page.getByTestId("demo-rearm").click();
    await expect(state).toHaveText("Armed");
    await expect(page.getByTestId("trip-demo")).toContainText("epoch 1");
  });

  test("the app links back to the landing page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Back to home" }).first().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Every agent key");
  });

  test("unknown pages return the 404 page", async ({ page }) => {
    const res = await page.goto("/no-such-page");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("access key does not exist")).toBeVisible();
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
