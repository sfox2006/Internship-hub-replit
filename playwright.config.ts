import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  fullyParallel: false,
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:3004",
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
  },
  webServer: {
    command: "npm start",
    env: { PORT: "3004" },
    url: "http://127.0.0.1:3004/api/health",
    reuseExistingServer: true,
  },
  reporter: "list",
});
