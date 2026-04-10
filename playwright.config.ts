import { defineConfig } from "@playwright/test";

const port = 3005;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/smoke",
  timeout: 45_000,
  fullyParallel: true,
  use: {
    baseURL,
    headless: true,
  },
  webServer: {
    command: `pnpm exec next dev --turbopack --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
