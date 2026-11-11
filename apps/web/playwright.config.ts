import { defineConfig, devices } from "@playwright/test";

const port = 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  // Tests the production Worker bundle (simulation vars from env.e2e) under wrangler dev.
  // Set E2E_DEV=1 to test the Vite dev server instead.
  webServer: {
    command: process.env.E2E_DEV
      ? `vite dev --port ${port} --strictPort`
      : `vite build && wrangler dev --config dist/server/wrangler.json --port ${port} --ip 127.0.0.1`,
    env: { CLOUDFLARE_ENV: "e2e" },
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
