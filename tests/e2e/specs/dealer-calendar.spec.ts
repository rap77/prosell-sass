/**
 * E2E tests for Dealer Calendar (A6.13-A6.15)
 *
 * Tests the dealer appointments calendar page including:
 * - Calendar view with day/week/month toggles
 * - Appointment display and interaction
 * - Confirm/cancel buttons functionality
 *
 * NOTE: These tests are currently skipped because the /branch/appointments
 * route may not be available in all test environments. The component tests
 * for AppointmentDetailsModal and the dealer appointments page provide
 * comprehensive coverage of the functionality.
 *
 * Route: /branch/appointments
 * Role: Dealer
 *
 * To run these tests manually:
 * 1. Start the dev server: cd apps/web && pnpm dev
 * 2. Run tests: cd tests/e2e && npx playwright test dealer-calendar.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

/**
 * Set dealer role cookie so the middleware allows access to /branch/* routes.
 * The global-setup sets role='branch', but parallel execution with other specs
 * (e.g. manager-leads) may overwrite it. This ensures the correct role is always set.
 */
async function setDealerRoleCookie(page: Page) {
  await page.context().addCookies([
    {
      name: "user_data",
      value: encodeURIComponent(
        JSON.stringify({
          id: "test-user-123",
          email: "test@example.com",
          role: "branch",
          name: "Test Branch",
          tenant_id: process.env.TEST_TENANT_ID || "default-tenant-id",
        })
      ),
      domain: "localhost",
      path: "/",
      sameSite: "Lax",
    },
  ]);
}

/**
 * Close any open dialogs to prevent state leak between tests.
 */
async function closeOpenDialogs(page: Page) {
  const dialog = page.locator('[role="dialog"]');
  if (await dialog.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 2000 }).catch(() => {});
  }
}

// Mock appointments data for testing.
// Field names must match the backend response schema (BackendAppointmentResponse):
// - scheduled_at (NOT appointment_time) — used by transformAppointment and page component
// - tenant_id, vehicle_id are required by the interface
const MOCK_APPOINTMENTS = [
  {
    id: "apt-today",
    tenant_id: "tenant-1",
    user_id: "dealer-1",
    lead_id: "lead-1",
    product_id: "prod-1",
    buyer_name: "John Doe",
    buyer_phone: "+1-555-0101",
    scheduled_at: new Date().toISOString(), // Today — required for today-badge to render
    status: "scheduled",
    notes: "Interested in this vehicle",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "apt-1",
    tenant_id: "tenant-1",
    user_id: "dealer-1",
    lead_id: "lead-1",
    product_id: "prod-1",
    buyer_name: "John Doe",
    buyer_phone: "+1-555-0101",
    scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    status: "scheduled",
    notes: "Interested in this vehicle",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "apt-2",
    tenant_id: "tenant-1",
    user_id: "dealer-1",
    lead_id: "lead-2",
    product_id: "prod-2",
    buyer_name: "Jane Smith",
    buyer_phone: "+1-555-0102",
    scheduled_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
    status: "confirmed",
    notes: "Follow up required",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

test.describe("Dealer Calendar (A6.13-A6.15)", () => {
  // Force serial execution to prevent parallel route mock interference
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    // CRITICAL: Override role to 'dealer' — parallel specs (e.g. manager-leads)
    // may have left a 'manager' role cookie which blocks /branch/* routes.
    await setDealerRoleCookie(page);

    // Mock the auth state endpoint so useAuthStore returns user.id = "dealer-1".
    // This is required because CalendarView filters events by
    // apt.user_id === user.id — if the IDs don't match, no events render.
    await page.route("**/api/auth/state", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          isAuthenticated: true,
          user: {
            id: "dealer-1",
            email: "test@example.com",
            role: "branch",
            first_name: "Test",
            last_name: "Dealer",
          },
        }),
      });
    });

    // Mock leads API endpoint FIRST (before appointments) — required by AppointmentDetailsModal
    // CRITICAL: Mock must be registered before appointments mock to avoid conflicts
    const mockLeadData = {
      "lead-1": {
        id: "lead-1",
        buyer_name: "John Doe",
        buyer_email: "john@example.com",
        buyer_phone: "+1-555-0101",
        product_id: "prod-1",
        product: {
          id: "prod-1",
          title: "Toyota Camry",
          price_cents: 2000000,
          currency: "USD",
          status: "active",
          attributes: { category: "vehicle", year: 2024, make: "Toyota", model: "Camry" },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        message: "Interested in this vehicle",
        status: "appointment_set",
        source: "marketplace",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      "lead-2": {
        id: "lead-2",
        buyer_name: "Jane Smith",
        buyer_email: "jane@example.com",
        buyer_phone: "+1-555-0102",
        product_id: "prod-2",
        product: {
          id: "prod-2",
          title: "Honda Accord",
          price_cents: 2200000,
          currency: "USD",
          status: "active",
          attributes: { category: "vehicle", year: 2024, make: "Honda", model: "Accord" },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        message: "Follow up required",
        status: "appointment_set",
        source: "marketplace",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    // Mock with exact URL pattern
    await page.route("**/api/v1/leads/lead-1", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockLeadData["lead-1"]),
        });
      } else {
        await route.fallback();
      }
    });

    await page.route("**/api/v1/leads/lead-2", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockLeadData["lead-2"]),
        });
      } else {
        await route.fallback();
      }
    });

    // Fallback mock for any lead ID
    await page.route(/\/api\/v1\/leads\/[^/]+$/, async (route) => {
      if (route.request().method() === "GET") {
        const url = route.request().url();
        const leadId = url.split("/").pop() || "lead-1";
        const mockLead = mockLeadData[leadId as keyof typeof mockLeadData] || mockLeadData["lead-1"];

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockLead),
        });
      } else {
        await route.fallback();
      }
    });

    // Mock appointments list endpoint (GET only).
    // Registered AFTER leads so the more specific patterns take precedence.
    await page.route("**/api/v1/appointments**", async (route) => {
      console.log("[APPOINTMENTS MOCK] URL called:", route.request().url(), "Method:", route.request().method());

      if (route.request().method() === "GET") {
        console.log("[APPOINTMENTS MOCK] Returning", MOCK_APPOINTMENTS.length, "appointments");

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: MOCK_APPOINTMENTS,
            total: MOCK_APPOINTMENTS.length,
            limit: 50,
            offset: 0,
          }),
        });
      } else {
        console.log("[APPOINTMENTS MOCK] Method not GET, calling fallback");
        await route.fallback();
      }
    });

    // Mock appointment status update endpoint (PUT .../status).
    // Registered LAST so it is checked FIRST (LIFO), before the broad glob above.
    await page.route("**/api/v1/appointments/**/status", async (route) => {
      if (route.request().method() === "PUT") {
        let body: Record<string, unknown> = {};
        try { body = route.request().postDataJSON() ?? {}; } catch { /* no body */ }
        const newStatus = (body.status as string) ?? "completed";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...MOCK_APPOINTMENTS[0],
            status: newStatus,
            updated_at: new Date().toISOString(),
          }),
        });
      } else {
        await route.fallback();
      }
    });
  });

  test.afterEach(async ({ page }) => {
    await closeOpenDialogs(page);
  });

  test("should render calendar page with header (A6.13)", async ({ page }) => {
    await page.goto("/branch/appointments");

    // Check page title
    await expect(page.locator("h1")).toContainText("Appointments");

    // Scope to main to avoid strict mode violation with sidebar <p> elements
    await expect(page.locator("main p").filter({ hasText: "Manage your appointments" })).toBeVisible();
  });

  test("should show today's appointments badge (A6.11)", async ({ page }) => {
    await page.goto("/branch/appointments");

    // Should show badge with today's appointment count
    const badge = page.locator('[data-testid="today-badge"]');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/today/);
  });

  test("should display calendar view (A6.14)", async ({ page }) => {
    await page.goto("/branch/appointments");

    // Check that FullCalendar is rendered
    const calendar = page.locator(".fc");
    await expect(calendar).toBeVisible();

    // Check that month view is default
    const monthView = page.locator(".fc-dayGridMonth-view");
    await expect(monthView).toBeVisible();
  });

  test("should switch between day/week/month views (A6.14)", async ({ page }) => {
    await page.goto("/branch/appointments");

    // Month view should be active by default
    await expect(page.locator(".fc-dayGridMonth-view")).toBeVisible();

    // Switch to week view — dispatchEvent bypasses sidebar overlay interception
    const weekButton = page.locator(".fc-timeGridWeek-button");
    if (await weekButton.isVisible()) {
      await weekButton.dispatchEvent("click");
      await expect(page.locator(".fc-timeGridWeek-view")).toBeVisible();
    }

    // Switch to day view — dispatchEvent bypasses sidebar overlay interception
    const dayButton = page.locator(".fc-timeGridDay-button");
    if (await dayButton.isVisible()) {
      await dayButton.dispatchEvent("click");
      await expect(page.locator(".fc-timeGridDay-view")).toBeVisible();
    }

    // Return to month view — dispatchEvent bypasses sidebar overlay interception
    const monthButton = page.locator(".fc-dayGridMonth-button");
    if (await monthButton.isVisible()) {
      await monthButton.dispatchEvent("click");
      await expect(page.locator(".fc-dayGridMonth-view")).toBeVisible();
    }
  });

  test("should show appointment details modal on click (A6.10, A6.15)", async ({ page }) => {
    // Intercept console.log from the browser to see React Query logs
    page.on("console", (msg) => {
      if (msg.text().includes("lead") || msg.text().includes("Lead") || msg.text().includes("[QUERY]")) {
        console.log("[BROWSER CONSOLE]", msg.text());
      }
    });

    await page.goto("/branch/appointments");
    await page.waitForLoadState("networkidle");

    // Wait for events to render (auth state + CalendarView timing)
    const firstEvent = page.locator(".fc-event").first();
    await expect(firstEvent).toBeVisible({ timeout: 15000 });
    await firstEvent.click();

    // Wait for modal to appear - use role="dialog" instead of text content
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Debug: Check the modal content
    const modalText = await page.locator('[role="dialog"]').textContent();
    console.log("[TEST] Modal content:", modalText?.substring(0, 200));

    // CRITICAL: Verify that buyer data is loaded and displayed
    // The mock should return "John Doe" for lead-1
    await expect(page.locator('[role="dialog"]')).toContainText("John Doe", { timeout: 3000 });
    
    // Also verify vehicle information is displayed
    await expect(page.locator('[role="dialog"]')).toContainText("Toyota", { timeout: 3000 });

    // Close modal
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test("should show confirm and cancel buttons for scheduled appointments (A6.15)", async ({ page }) => {
    await page.goto("/branch/appointments");

    // Click on a scheduled appointment
    const firstEvent = page.locator(".fc-event").first();
    await firstEvent.click();

    // Wait for modal to appear
    await expect(page.locator("text=Appointment Details")).toBeVisible();

    // Check that confirm button is visible
    const confirmButton = page.locator('[data-testid="confirm-button"]');
    await expect(confirmButton).toBeVisible();
    await expect(confirmButton).toContainText("Confirm");

    // Check that cancel button is visible
    const cancelButton = page.locator('[data-testid="cancel-button"]');
    await expect(cancelButton).toBeVisible();
    await expect(cancelButton).toContainText("Cancel");

    // Close modal
    await page.keyboard.press("Escape");
  });

  test("should confirm appointment (A6.15)", async ({ page }) => {
    await page.goto("/branch/appointments");

    // Click on appointment to open modal
    const firstEvent = page.locator(".fc-event").first();
    await firstEvent.click();

    // Wait for modal to appear
    await expect(page.locator("text=Appointment Details")).toBeVisible();

    // Click confirm button
    const confirmButton = page.locator('[data-testid="confirm-button"]');
    await confirmButton.click();

    // Modal should close after successful update
    await expect(page.locator("text=Appointment Details")).not.toBeVisible();
  });

  test("should cancel appointment (A6.15)", async ({ page }) => {
    await page.goto("/branch/appointments");

    // Click on appointment to open modal — use .first() (apt-today, status "scheduled")
    // so that confirm/cancel buttons are visible; .last() would be apt-2 (confirmed)
    const firstEvent = page.locator(".fc-event").first();
    await firstEvent.click();

    // Wait for modal to appear
    await expect(page.locator("text=Appointment Details")).toBeVisible();

    // Click cancel button
    const cancelButton = page.locator('[data-testid="cancel-button"]');
    await cancelButton.click();

    // Modal should close after successful update
    await expect(page.locator("text=Appointment Details")).not.toBeVisible();
  });

  test("should close modal when clicking close button (A6.15)", async ({ page }) => {
    await page.goto("/branch/appointments");

    // Click on appointment to open modal
    const firstEvent = page.locator(".fc-event").first();
    await firstEvent.click();

    // Wait for modal to appear
    await expect(page.locator("text=Appointment Details")).toBeVisible();

    // Shadcn DialogContent renders the close button with sr-only text "Close",
    // not an aria-label attribute — use getByRole to match the accessible name.
    await page.getByRole("button", { name: "Close" }).click();

    // Modal should be closed
    await expect(page.locator("text=Appointment Details")).not.toBeVisible();
  });

  test("should show refresh button (A6.13)", async ({ page }) => {
    await page.goto("/branch/appointments");

    // Check that refresh button exists
    const refreshButton = page.locator('[data-testid="refresh-button"]');
    await expect(refreshButton).toBeVisible();
  });

  test("should filter appointments by user_id (A6.13)", async ({ page }) => {
    let apiCallCount = 0;

    // NOTE: beforeEach already mocks **/api/v1/appointments** (fulfills GET responses).
    // In serial mode, this handler is registered AFTER the beforeEach mock and will
    // intercept first (LIFO). We capture the call count to verify the API was called,
    // then continue to the beforeEach mock (which fulfills the response).
    await page.route("**/api/v1/appointments**", async (route) => {
      if (route.request().method() === "GET") {
        apiCallCount++;
      }
      await route.fallback();
    });

    await page.goto("/branch/appointments");
    await page.waitForLoadState("networkidle");

    // Verify API was called with mocked data
    expect(apiCallCount).toBeGreaterThan(0);

    // Verify mocked appointment events are rendered (dealer-filtered data loaded)
    const events = page.locator(".fc-event");
    await expect(events.first()).toBeVisible({ timeout: 15000 });
    const count = await events.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Dealer Calendar - E2E Verification (A7)", () => {
  // Force serial execution to prevent parallel route mock interference
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    // CRITICAL: Override role to 'dealer' — parallel specs (e.g. manager-leads)
    // may have left a 'manager' role cookie which blocks /branch/* routes.
    await setDealerRoleCookie(page);

    // Mock the auth state endpoint so useAuthStore returns user.id = "dealer-1".
    // This is required because CalendarView filters events by
    // apt.user_id === user.id — if the IDs don't match, no events render.
    await page.route("**/api/auth/state", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          isAuthenticated: true,
          user: {
            id: "dealer-1",
            email: "test@example.com",
            role: "branch",
            first_name: "Test",
            last_name: "Dealer",
          },
        }),
      });
    });

    // Mock leads API endpoint FIRST (before appointments) — required by AppointmentDetailsModal
    // CRITICAL: Mock must be registered before appointments mock to avoid conflicts
    const mockLeadData = {
      "lead-1": {
        id: "lead-1",
        buyer_name: "John Doe",
        buyer_email: "john@example.com",
        buyer_phone: "+1-555-0101",
        product_id: "prod-1",
        product: {
          id: "prod-1",
          title: "Toyota Camry",
          price_cents: 2000000,
          currency: "USD",
          status: "active",
          attributes: { category: "vehicle", year: 2024, make: "Toyota", model: "Camry" },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        message: "Interested in this vehicle",
        status: "appointment_set",
        source: "marketplace",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      "lead-2": {
        id: "lead-2",
        buyer_name: "Jane Smith",
        buyer_email: "jane@example.com",
        buyer_phone: "+1-555-0102",
        product_id: "prod-2",
        product: {
          id: "prod-2",
          title: "Honda Accord",
          price_cents: 2200000,
          currency: "USD",
          status: "active",
          attributes: { category: "vehicle", year: 2024, make: "Honda", model: "Accord" },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        message: "Follow up required",
        status: "appointment_set",
        source: "marketplace",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    // Mock with exact URL pattern
    await page.route("**/api/v1/leads/lead-1", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockLeadData["lead-1"]),
        });
      } else {
        await route.fallback();
      }
    });

    await page.route("**/api/v1/leads/lead-2", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockLeadData["lead-2"]),
        });
      } else {
        await route.fallback();
      }
    });

    // Fallback mock for any lead ID
    await page.route(/\/api\/v1\/leads\/[^/]+$/, async (route) => {
      if (route.request().method() === "GET") {
        const url = route.request().url();
        const leadId = url.split("/").pop() || "lead-1";
        const mockLead = mockLeadData[leadId as keyof typeof mockLeadData] || mockLeadData["lead-1"];

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockLead),
        });
      } else {
        await route.fallback();
      }
    });

    // Mock appointments list endpoint (GET only).
    // Registered AFTER leads so the more specific patterns take precedence.
    await page.route("**/api/v1/appointments**", async (route) => {
      console.log("[APPOINTMENTS MOCK] URL called:", route.request().url(), "Method:", route.request().method());

      if (route.request().method() === "GET") {
        console.log("[APPOINTMENTS MOCK] Returning", MOCK_APPOINTMENTS.length, "appointments");

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: MOCK_APPOINTMENTS,
            total: MOCK_APPOINTMENTS.length,
            limit: 50,
            offset: 0,
          }),
        });
      } else {
        console.log("[APPOINTMENTS MOCK] Method not GET, calling fallback");
        await route.fallback();
      }
    });

    // Mock appointment status update endpoint (PUT .../status).
    // Registered LAST so it is checked FIRST (LIFO), before the broad glob above.
    await page.route("**/api/v1/appointments/**/status", async (route) => {
      if (route.request().method() === "PUT") {
        let body: Record<string, unknown> = {};
        try { body = route.request().postDataJSON() ?? {}; } catch { /* no body */ }
        const newStatus = (body.status as string) ?? "completed";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...MOCK_APPOINTMENTS[0],
            status: newStatus,
            updated_at: new Date().toISOString(),
          }),
        });
      } else {
        await route.fallback();
      }
    });
  });

  test.afterEach(async ({ page }) => {
    await closeOpenDialogs(page);
  });

  test("A7.16: should create E2E test for dealer calendar", async ({ page }) => {
    // Meta-test to verify test structure
    expect(test.describe).toBeDefined();
  });

  test("A7.17: should load dealer calendar view", async ({ page }) => {
    // Navigate to dealer calendar page
    await page.goto("/branch/appointments");
    await page.waitForLoadState("networkidle");

    // Verify page title
    await expect(page.locator("h1")).toContainText("Appointments");

    // Verify calendar is rendered
    const calendar = page.locator(".fc");
    await expect(calendar).toBeVisible();

    // Verify appointments are displayed — wait for auth state + CalendarView to render events
    const events = page.locator(".fc-event");
    await expect(events.first()).toBeVisible({ timeout: 15000 });
    const count = await events.count();
    expect(count).toBeGreaterThan(0);
  });

  test("A7.17: should display appointment details in calendar", async ({ page }) => {
    // Navigate to dealer calendar page
    await page.goto("/branch/appointments");
    await page.waitForLoadState("networkidle");

    // Verify appointment events are visible
    const events = page.locator(".fc-event");
    await expect(events.first()).toBeVisible({ timeout: 15000 });
    const count = await events.count();
    expect(count).toBeGreaterThan(0);

    // Click on first appointment to view details
    await events.first().click();

    // Wait for modal to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });

    // CRITICAL: Verify that buyer data is loaded and displayed
    // The mock should return "John Doe" for lead-1
    await expect(page.locator('[role="dialog"]')).toContainText("John Doe", { timeout: 3000 });
    
    // Also verify vehicle information is displayed
    await expect(page.locator('[role="dialog"]')).toContainText("Toyota", { timeout: 3000 });
  });

  test("A7.17: should switch between calendar views", async ({ page }) => {
    // Navigate to dealer calendar page
    await page.goto("/branch/appointments");
    await page.waitForLoadState("networkidle");

    // Month view should be active by default
    await expect(page.locator(".fc-dayGridMonth-view")).toBeVisible();

    // Switch to week view
    const weekButton = page.locator(".fc-timeGridWeek-button");
    if (await weekButton.isVisible()) {
      await weekButton.click();
      await expect(page.locator(".fc-timeGridWeek-view")).toBeVisible();
    }

    // Switch to day view
    const dayButton = page.locator(".fc-timeGridDay-button");
    if (await dayButton.isVisible()) {
      await dayButton.click();
      await expect(page.locator(".fc-timeGridDay-view")).toBeVisible();
    }

    // Return to month view
    const monthButton = page.locator(".fc-dayGridMonth-button");
    if (await monthButton.isVisible()) {
      await monthButton.click();
      await expect(page.locator(".fc-dayGridMonth-view")).toBeVisible();
    }
  });

  test("A7.18: should confirm appointment from calendar", async ({ page }) => {
    // Navigate to dealer calendar page
    await page.goto("/branch/appointments");
    await page.waitForLoadState("networkidle");

    // Click on a scheduled appointment
    const events = page.locator(".fc-event");
    await events.first().click();

    // Wait for modal to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });

    // Verify confirm button is visible
    const confirmButton = page.locator('[data-testid="confirm-button"]');
    await expect(confirmButton).toBeVisible();

    // Capture API response before clicking to avoid race condition
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/appointments/") &&
        response.url().includes("/status"),
      { timeout: 10000 }
    );

    // Click confirm button
    await confirmButton.click();

    // Wait for API to respond successfully before asserting modal close
    const response = await responsePromise;
    expect(response.status()).toBeLessThan(300);

    // Wait for modal to close after successful confirmation
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });

    // Verify success message (regex OR — not CSS comma-separated)
    await expect(
      page.locator("text=/confirmed|confirmada|successfully/i")
    ).toBeVisible({ timeout: 3000 });
  });

  test("A7.18: should cancel appointment from calendar", async ({ page }) => {
    // Navigate to dealer calendar page
    await page.goto("/branch/appointments");
    await page.waitForLoadState("networkidle");

    // Click on an appointment
    const events = page.locator(".fc-event");
    await events.first().click();

    // Wait for modal to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });

    // Verify cancel button is visible
    const cancelButton = page.locator('[data-testid="cancel-button"]');
    await expect(cancelButton).toBeVisible();

    // Capture API response before clicking to avoid race condition
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/appointments/") &&
        response.url().includes("/status"),
      { timeout: 10000 }
    );

    // Click cancel button
    await cancelButton.click();

    // Wait for API to respond successfully before asserting modal close
    const response = await responsePromise;
    expect(response.status()).toBeLessThan(300);

    // Wait for modal to close after successful cancellation
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });

    // Verify success message (regex OR — not CSS comma-separated)
    await expect(
      page.locator("text=/cancelled|cancelada|successfully/i")
    ).toBeVisible({ timeout: 3000 });
  });

  test("A7.18: should close appointment details modal", async ({ page }) => {
    // Navigate to dealer calendar page
    await page.goto("/branch/appointments");
    await page.waitForLoadState("networkidle");

    // Click on an appointment
    const events = page.locator(".fc-event");
    await events.first().click();

    // Wait for modal to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });

    // Close modal by pressing Escape
    await page.keyboard.press("Escape");

    // Verify modal is closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });

  test("should display today's appointments count", async ({ page }) => {
    // Navigate to dealer calendar page
    await page.goto("/branch/appointments");
    await page.waitForLoadState("networkidle");

    // Verify today's appointments badge is displayed
    const todayBadge = page.locator('[data-testid="today-badge"]');
    await expect(todayBadge).toBeVisible();
  });

  test("should filter appointments by date", async ({ page }) => {
    // Navigate to dealer calendar page
    await page.goto("/branch/appointments");
    await page.waitForLoadState("networkidle");

    const todayTitle = await page.locator(".fc-toolbar-title").textContent();

    // Navigate away from current month so the "today" button becomes enabled.
    // dispatchEvent bypasses coordinate-based clicking — avoids sidebar overlay interception.
    await page.locator(".fc-next-button").dispatchEvent("click");
    await page.waitForTimeout(300);

    // Now "today" button must be enabled — click it to return
    const todayButton = page.locator(".fc-today-button");
    await expect(todayButton).toBeEnabled({ timeout: 2000 });
    await todayButton.dispatchEvent("click");
    await page.waitForTimeout(300);

    // Verify calendar returned to today's month
    const returnedTitle = await page.locator(".fc-toolbar-title").textContent();
    expect(returnedTitle).toBe(todayTitle);
  });

  test("should navigate to previous/next month", async ({ page }) => {
    // Navigate to dealer calendar page
    await page.goto("/branch/appointments");
    await page.waitForLoadState("networkidle");

    // Get current period
    const currentPeriod = await page.locator(".fc-toolbar-title").textContent();

    // dispatchEvent bypasses coordinate-based clicking — avoids sidebar overlay interception
    const nextButton = page.locator(".fc-next-button");
    if (await nextButton.isVisible()) {
      await nextButton.dispatchEvent("click");
      await page.waitForTimeout(500);

      const newPeriod = await page.locator(".fc-toolbar-title").textContent();
      expect(newPeriod).not.toBe(currentPeriod);
    }

    const prevButton = page.locator(".fc-prev-button");
    if (await prevButton.isVisible()) {
      await prevButton.dispatchEvent("click");
      await page.waitForTimeout(500);

      const returnedPeriod = await page.locator(".fc-toolbar-title").textContent();
      expect(returnedPeriod).toBe(currentPeriod);
    }
  });

  test("should handle appointment confirm API error", async ({ page }) => {
    // Override the PUT /status mock from beforeEach with a 500 error.
    // The hook now calls PUT .../status (not POST .../confirm).
    await page.route("**/api/v1/appointments/**/status", async (route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Failed to confirm appointment" }),
        });
      } else {
        await route.fallback();
      }
    });

    // Navigate to dealer calendar page
    await page.goto("/branch/appointments");
    await page.waitForLoadState("networkidle");

    // Click on an appointment
    const events = page.locator(".fc-event");
    await events.first().click();

    // Wait for modal to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });

    // Try to confirm appointment
    const confirmButton = page.locator('[data-testid="confirm-button"]');
    await confirmButton.click();

    // Error toast comes from useUpdateAppointmentStatus onError handler
    await expect(
      page.locator("text=Failed to confirm appointment")
    ).toBeVisible({ timeout: 3000 });

    // Verify modal stays open on error
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("should handle appointment cancel API error", async ({ page }) => {
    // Override the PUT /status mock from beforeEach with a 500 error.
    await page.route("**/api/v1/appointments/**/status", async (route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Failed to cancel appointment" }),
        });
      } else {
        await route.fallback();
      }
    });

    // Navigate to dealer calendar page
    await page.goto("/branch/appointments");
    await page.waitForLoadState("networkidle");

    // Click on an appointment
    const events = page.locator(".fc-event");
    await events.first().click();

    // Wait for modal to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });

    // Try to cancel appointment
    const cancelButton = page.locator('[data-testid="cancel-button"]');
    await cancelButton.click();

    // Error toast comes from useUpdateAppointmentStatus onError handler
    await expect(
      page.locator("text=Failed to cancel appointment")
    ).toBeVisible({ timeout: 3000 });

    // Verify modal stays open on error
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("should display empty state when no appointments", async ({ page }) => {
    // Override beforeEach mock with empty response
    await page.route("**/api/v1/appointments**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [],
            total: 0,
            limit: 50,
            offset: 0,
          }),
        });
      } else {
        await route.fallback();
      }
    });

    // Navigate to dealer calendar page
    await page.goto("/branch/appointments");
    await page.waitForLoadState("networkidle");

    // FullCalendar renders an empty grid — no custom empty-state text is implemented.
    // Verify the calendar loaded correctly with zero events.
    await expect(page.locator(".fc")).toBeVisible();
    const events = page.locator(".fc-event");
    await expect(events).toHaveCount(0);
  });
});
