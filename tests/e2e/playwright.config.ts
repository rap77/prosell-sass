import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // Global setup to generate authentication storage state
  globalSetup: "./global-setup.ts",
  testDir: "./", // Run tests from root (includes both ./specs and ./auth)
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // B1.1.38: Retry flaky tests — 2 retries in CI, 1 locally
  retries: process.env.CI ? 2 : 1,
  // B1.1.37: Optimize for < 5 minute execution — increase workers in local dev
  workers: process.env.CI ? 2 : undefined,
  // B1.1.37: Global timeout per test to keep suite fast
  timeout: 30 * 1000,
  reporter: [["html"], ["list"]],
  // Set environment variables for tests
  // TEST_TENANT_ID will be set by global-setup from the authenticated user's ID
  env: {
    TEST_TENANT_ID: process.env.TEST_TENANT_ID || "default-tenant-id",
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testMatch: "specs/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        // Use storageState for dashboard tests (protected routes)
        storageState: process.env.SKIP_AUTH
          ? undefined
          : "./.auth/storage-state.json",
      },
    },
    // Project for authentication tests (NO storageState)
    {
      name: "auth-tests",
      testMatch: "auth/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        storageState: undefined, // No saved auth state - start fresh
      },
    },
    // Project for Layer 2 contract tests (API-level validation)
    {
      name: "layer2-contract",
      testMatch: "layer2/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        // Use storageState for API tests (needs auth cookies)
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
  // Automatically start backend and frontend dev servers before tests.
  // Backend runs on port 8000, frontend on port 3000
  webServer: [
    {
      command: "cd ../../apps/api && ./.venv/bin/python3 -m fastapi dev src/prosell/infrastructure/api/main.py --port 8000",
      url: "http://localhost:8000",
      timeout: 120 * 1000, // 2 minutes - backend can take time to start
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "cd ../../apps/web && pnpm dev",
      url: "http://localhost:3000",
      timeout: 120 * 1000, // 2 minutes - Next.js can take time to start
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
