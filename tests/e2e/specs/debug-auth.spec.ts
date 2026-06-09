/**
 * Debug test to check authentication
 */

import { test, expect } from "../fixtures/auth";

test("Debug: Check authentication", async ({ authenticatedRequest }) => {
  // First, let's try to access a protected endpoint
  const response = await authenticatedRequest.get("/api/v1/auth/state");

  console.log("=== DEBUG INFO ===");
  console.log("Response status:", response.status());
  console.log("Response headers:", JSON.stringify(response.headers(), null, 2));

  const body = await response.text();
  console.log("Response body:", body);

  expect(response.status()).toBe(200);
});
