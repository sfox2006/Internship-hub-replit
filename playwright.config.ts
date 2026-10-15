import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testIgnore: ["tests/production/**"],
  fullyParallel: false,
  // The auth/enrollment browser fixture intentionally shares one isolated
  // in-memory account store; serialize tests so independent specs cannot race it.
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3004",
    headless: true,
    extraHTTPHeaders: { "x-hub-test-fixture": "normal" },
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
  },
  webServer: [
    {
      command:
        "npm run build -- --mode e2e && NODE_ENV=test APP_AUTH_TEST_FIXTURES=1 MESSAGING_ENABLED=false npm start",
      env: {
        PORT: "3004",
        APP_URL: "http://127.0.0.1:3004",
      },
      url: "http://127.0.0.1:3004/api/health",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "node tests/messaging-server.mjs",
      url: "http://127.0.0.1:3005/api/health",
      reuseExistingServer: false,
    },
  ],
  reporter: "list",
});
