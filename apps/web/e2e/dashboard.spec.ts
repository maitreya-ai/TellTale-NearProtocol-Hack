import { expect, test, type Page } from "@playwright/test";

async function openLab(page: Page) {
  await page.goto("/lab");
  await expect(page.getByTestId("lab-state")).not.toHaveText("…");
  const rearm = page.getByTestId("rearm");
  if (await rearm.isEnabled()) {
    await rearm.click();
    await expect(page.getByTestId("lab-state")).toHaveText("Armed");
  }
}

test.describe("Telltale (simulation)", () => {
  test("overview shows an armed vault with four pay-only agent keys", async ({ page }) => {
    await openLab(page);
    await page.goto("/dashboard");
    await expect(page.getByTestId("sim-banner")).toBeVisible();
    await expect(page.getByTestId("state-word")).toHaveText("Armed");
    await expect(page.getByTestId("key-count")).toHaveText("4");
    await expect(page.getByTestId("keys").getByText("pay only")).toHaveCount(4);
  });

  test("stolen .env trips the vault and deletes every key", async ({ page }) => {
    await openLab(page);
    await page.getByTestId("run-stolen-env").click();
    const terminal = page.getByTestId("terminal");
    await expect(terminal).toContainText("TRIPPED: key used without a signer proof");
    await expect(terminal).toContainText("access key does not exist");
    await expect(page.getByTestId("lab-state")).toHaveText("Tripped");

    await page.goto("/dashboard");
    await expect(page.getByTestId("state-word")).toHaveText("Tripped");
    await expect(page.getByTestId("key-count")).toHaveText("0");
    await expect(page.getByTestId("trips")).toContainText("Stolen key used without a proof");
  });

  test("poisoned invoice trips through the decoy tool, then re-arm restores keys", async ({
    page,
  }) => {
    await openLab(page);
    await page.getByTestId("run-poisoned-invoice").click();
    await expect(page.getByTestId("terminal")).toContainText(
      "Decoy tool called: raise_spending_limit",
    );
    await expect(page.getByTestId("lab-state")).toHaveText("Tripped");
    await page.getByTestId("rearm").click();
    await expect(page.getByTestId("lab-state")).toHaveText("Armed");

    await page.goto("/dashboard");
    await expect(page.getByTestId("key-count")).toHaveText("4");
    await expect(page.getByTestId("trips")).toContainText("Agent called a decoy tool");
  });

  test("honest run pays invoices and stays armed", async ({ page }) => {
    await openLab(page);
    await page.getByTestId("run-honest").click();
    await expect(page.getByTestId("terminal")).toContainText(
      "Done. Vault still armed. 2 payments made.",
    );
    await expect(page.getByTestId("lab-state")).toHaveText("Armed");
  });

  test("how it works explains the proof", async ({ page }) => {
    await page.goto("/how-it-works");
    await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
    await expect(page.getByText("telltale-pay-v1", { exact: false })).toBeVisible();
  });

  test("console pages render from the vault snapshot", async ({ page }) => {
    await page.goto("/keys");
    await expect(page.getByTestId("keys-table")).toContainText("pay only");
    await page.goto("/activity");
    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
    await page.goto("/policy");
    await expect(page.getByText("Spending limits")).toBeVisible();
    await page.goto("/integrations");
    await expect(page.getByText("claude_desktop_config.json")).toBeVisible();
  });

  test("the command menu jumps to a page", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("state-word")).toBeVisible();
    await page.keyboard.press("ControlOrMeta+k");
    await page.getByPlaceholder("Search pages and actions…").fill("policy");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/policy$/);
  });

  for (const path of [
    "/",
    "/dashboard",
    "/activity",
    "/keys",
    "/policy",
    "/integrations",
    "/lab",
    "/how-it-works",
  ]) {
    test(`${path} never scrolls sideways`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
