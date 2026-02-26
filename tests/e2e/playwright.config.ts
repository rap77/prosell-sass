import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // Global setup to generate authentication storage state
  globalSetup: "./global-setup.ts",
  testDir: "./", // Run tests from root (includes both ./specs and ./auth)
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html"], ["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use storageState for dashboard tests (protected routes)
        storageState: process.env.SKIP_AUTH
          ? undefined
          : "./.auth/storage-state.json",
      },
    },
    // Firefox and WebKit disabled - not installed in current environment
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
  ],
  // Automatically start Next.js dev server before tests
  webServer: {
    command: "cd ../../apps/web && pnpm dev",
    url: "http://localhost:3000",
    timeout: 120 * 1000, // 2 minutes - Next.js can take time to start
    reuseExistingServer: !process.env.CI, // Use existing server if running (dev mode)
    stdout: "pipe", // Pipe stdout to avoid cluttering test output
    stderr: "pipe",
  },
});
