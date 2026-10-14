import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/production",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3005",
    headless: true,
    extraHTTPHeaders: { "x-forwarded-proto": "http" },
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
  },
  webServer: {
    command:
      "VITE_CLERK_PROXY_URL=/api/__clerk npm run build && NODE_ENV=production APP_AUTH_TEST_FIXTURES=0 npm start",
    env: { PORT: "3005" },
    url: "http://127.0.0.1:3005/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  reporter: "list",
});
