import { expect, test, type Page } from "@playwright/test";

async function rearmIfTripped(page: Page) {
  const rearm = page.getByTestId("rearm");
  if (await rearm.isEnabled()) {
    await rearm.click();
    await expect(page.getByTestId("state-word")).toHaveText("ARMED");
  }
}

test.describe("Telltale dashboard (simulation)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("sim-banner")).toBeVisible();
    await expect(page.getByTestId("state-word")).not.toHaveText("…");
    await rearmIfTripped(page);
  });

  test("shows an armed vault with four pay-only agent keys", async ({ page }) => {
    await expect(page.getByTestId("state-word")).toHaveText("ARMED");
    await expect(page.getByTestId("key-count")).toHaveText("4");
    await expect(page.getByTestId("keys").getByText("pay only")).toHaveCount(4);
  });

  test("stolen .env trips the vault and deletes every key", async ({ page }) => {
    await page.getByTestId("run-stolen-env").click();
    const terminal = page.getByTestId("terminal");
    await expect(terminal).toContainText("TRIPPED: key used without a signer proof");
    await expect(terminal).toContainText("access key does not exist");
    await expect(page.getByTestId("state-word")).toHaveText("TRIPPED");
    await expect(page.getByTestId("key-count")).toHaveText("0");
    await expect(page.getByTestId("trips")).toContainText("Stolen key used without a proof");
  });

  test("poisoned invoice trips through the decoy tool, then re-arm restores keys", async ({
    page,
  }) => {
    await page.getByTestId("run-poisoned-invoice").click();
    await expect(page.getByTestId("terminal")).toContainText(
      "Decoy tool called: raise_spending_limit",
    );
    await expect(page.getByTestId("state-word")).toHaveText("TRIPPED");
    await expect(page.getByTestId("trips")).toContainText("Agent called a decoy tool");
    await page.getByTestId("rearm").click();
    await expect(page.getByTestId("state-word")).toHaveText("ARMED");
    await expect(page.getByTestId("key-count")).toHaveText("4");
  });

  test("honest run pays invoices and stays armed", async ({ page }) => {
    await page.getByTestId("run-honest").click();
    await expect(page.getByTestId("terminal")).toContainText(
      "Done. Vault still armed. 2 payments made.",
    );
    await expect(page.getByTestId("state-word")).toHaveText("ARMED");
  });

  test("the page never scrolls sideways", async ({ page }) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
