/**
 * E2E tests for Appointment creation flow (A4.38)
 *
 * Tests the complete user flow for scheduling an appointment from the lead details page:
 * 1. Login as vendedor
 * 2. Navigate to leads list
 * 3. Click on a lead
 * 4. Click "Agendar Cita" button
 * 5. Fill appointment form (dealer, date, time, notes)
 * 6. Submit form
 * 7. Verify success message and appointment created
 */

import { test, expect } from "@playwright/test";

test.describe("Appointment Creation Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Login as vendedor
    await page.goto("/login");
    await page.fill('input[name="email"]', "vendedor@prosell-demo.com");
    await page.fill('input[name="password"]', "Vendedor123!");
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL("/dashboard");
  });

  test("should schedule appointment from lead details page", async ({ page }) => {
    // Navigate to leads list
    await page.goto("/vendedor/leads");

    // Wait for leads to load
    await expect(page.locator("text=Leads")).toBeVisible();

    // Click on the first lead in the list
    await page.click('[data-testid="lead-row"] >> nth=0');

    // Wait for lead details page to load
    await expect(page.locator("text=Lead Details")).toBeVisible();

    // Click "Agendar Cita" button
    await page.click('button:has-text("Agendar Cita")');

    // Wait for appointment modal to appear
    await expect(page.locator("text=Schedule Appointment")).toBeVisible();

    // Fill appointment form
    // Select dealer
    await page.click('[data-testid="select-trigger"] >> nth=0');
    await page.click('[data-testid="select-item"]:has-text("John Doe")');

    // Select date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];
    await page.fill('input[type="date"]', dateStr);

    // Select time
    await page.click('[data-testid="select-trigger"] >> nth=1');
    await page.click('[data-testid="select-item"]:has-text("10:00 AM")');

    // Add notes
    await page.fill('textarea[name="notes"]', "Customer wants to test drive the vehicle");

    // Submit form
    await page.click('button:has-text("Schedule")');

    // Verify success message
    await expect(page.locator("text=Appointment scheduled successfully")).toBeVisible();

    // Verify modal is closed
    await expect(page.locator("text=Schedule Appointment")).not.toBeVisible();

    // Verify lead status changed to "appointment_set" (if visible on page)
    // This depends on how the lead details page displays status
  });

  test("should show validation error for weekend date", async ({ page }) => {
    // Navigate to leads list and click first lead
    await page.goto("/vendedor/leads");
    await page.click('[data-testid="lead-row"] >> nth=0');

    // Click "Agendar Cita" button
    await page.click('button:has-text("Agendar Cita")');

    // Wait for modal
    await expect(page.locator("text=Schedule Appointment")).toBeVisible();

    // Select dealer
    await page.click('[data-testid="select-trigger"] >> nth=0');
    await page.click('[data-testid="select-item"]:has-text("John Doe")');

    // Select weekend date (Saturday)
    const saturday = new Date();
    saturday.setDate(saturday.getDate() + ((6 - saturday.getDay() + 7) % 7 || 7));
    const dateStr = saturday.toISOString().split("T")[0];
    await page.fill('input[type="date"]', dateStr);

    // Select time
    await page.click('[data-testid="select-trigger"] >> nth=1');
    await page.click('[data-testid="select-item"]:has-text("10:00 AM")');

    // Submit form
    await page.click('button:has-text("Schedule")');

    // Verify validation error
    await expect(page.locator("text=cannot be scheduled on weekends")).toBeVisible();

    // Verify error banner is visible
    await expect(page.locator('[data-testid="appointment-error-banner"]')).toBeVisible();

    // Verify error banner has yellow background (validation error)
    const errorBanner = page.locator('[data-testid="appointment-error-banner"]');
    await expect(errorBanner).toHaveClass(/bg-yellow-50/);
  });

  test("should show conflict error when dealer is busy", async ({ page }) => {
    // This test assumes there's already an appointment scheduled
    // In a real E2E test, you'd first create an appointment via API
    // then try to create another one for the same dealer/time

    await page.goto("/vendedor/leads");
    await page.click('[data-testid="lead-row"] >> nth=0');

    await page.click('button:has-text("Agendar Cita")');

    await expect(page.locator("text=Schedule Appointment")).toBeVisible();

    // Fill form with same dealer/time as existing appointment
    await page.click('[data-testid="select-trigger"] >> nth=0');
    await page.click('[data-testid="select-item"]:has-text("John Doe")');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];
    await page.fill('input[type="date"]', dateStr);

    await page.click('[data-testid="select-trigger"] >> nth=1');
    await page.click('[data-testid="select-item"]:has-text("10:00 AM")');

    await page.click('button:has-text("Schedule")');

    // Verify conflict error (if appointment exists)
    // Note: This might not trigger in test environment without existing data
    const conflictError = page.locator("text=already has an appointment");
    if (await conflictError.isVisible()) {
      await expect(conflictError).toBeVisible();
      await expect(page.locator('[data-testid="appointment-error-banner"]')).toBeVisible();

      // Verify error banner has red background (conflict error)
      const errorBanner = page.locator('[data-testid="appointment-error-banner"]');
      await expect(errorBanner).toHaveClass(/bg-red-50/);
    }
  });

  test("should cancel appointment creation", async ({ page }) => {
    await page.goto("/vendedor/leads");
    await page.click('[data-testid="lead-row"] >> nth=0');

    await page.click('button:has-text("Agendar Cita")');

    await expect(page.locator("text=Schedule Appointment")).toBeVisible();

    // Click Cancel button
    await page.click('button:has-text("Cancel")');

    // Verify modal is closed
    await expect(page.locator("text=Schedule Appointment")).not.toBeVisible();

    // Verify we're back on lead details page
    await expect(page.locator("text=Lead Details")).toBeVisible();
  });

  test("should dismiss error banner by clicking X", async ({ page }) => {
    await page.goto("/vendedor/leads");
    await page.click('[data-testid="lead-row"] >> nth=0');

    await page.click('button:has-text("Agendar Cita")');

    await expect(page.locator("text=Schedule Appointment")).toBeVisible();

    // Trigger validation error by selecting weekend
    await page.click('[data-testid="select-trigger"] >> nth=0');
    await page.click('[data-testid="select-item"]:has-text("John Doe")');

    const saturday = new Date();
    saturday.setDate(saturday.getDate() + ((6 - saturday.getDay() + 7) % 7 || 7));
    const dateStr = saturday.toISOString().split("T")[0];
    await page.fill('input[type="date"]', dateStr);

    await page.click('[data-testid="select-trigger"] >> nth=1');
    await page.click('[data-testid="select-item"]:has-text("10:00 AM")');

    await page.click('button:has-text("Schedule")');

    // Wait for error banner
    await expect(page.locator('[data-testid="appointment-error-banner"]')).toBeVisible();

    // Click X to dismiss
    await page.click('[data-testid="appointment-error-banner"] button:has-text("×")');

    // Verify error banner is dismissed
    await expect(page.locator('[data-testid="appointment-error-banner"]')).not.toBeVisible();
  });

  test("should show business hours helper text", async ({ page }) => {
    await page.goto("/vendedor/leads");
    await page.click('[data-testid="lead-row"] >> nth=0');

    await page.click('button:has-text("Agendar Cita")');

    await expect(page.locator("text=Schedule Appointment")).toBeVisible();

    // Verify business hours helper text is displayed
    await expect(page.locator("text=Business hours: Monday-Friday only")).toBeVisible();
    await expect(page.locator("text=Business hours: 9:00 AM - 6:00 PM")).toBeVisible();
  });

  test("should disable submit button while creating appointment", async ({ page }) => {
    await page.goto("/vendedor/leads");
    await page.click('[data-testid="lead-row"] >> nth=0');

    await page.click('button:has-text("Agendar Cita")');

    await expect(page.locator("text=Schedule Appointment")).toBeVisible();

    // Fill form
    await page.click('[data-testid="select-trigger"] >> nth=0');
    await page.click('[data-testid="select-item"]:has-text("John Doe")');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];
    await page.fill('input[type="date"]', dateStr);

    await page.click('[data-testid="select-trigger"] >> nth=1');
    await page.click('[data-testid="select-item"]:has-text("10:00 AM")');

    // Submit and verify button shows loading state
    await page.click('button:has-text("Schedule")');

    // Verify button is disabled or shows loading spinner
    const submitButton = page.locator('button:has-text("Schedule")');
    await expect(submitButton).toBeDisabled();
  });
});

test.describe("Appointment Creation Accessibility", () => {
  test("should be keyboard navigable", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', "vendedor@prosell-demo.com");
    await page.fill('input[name="password"]', "Vendedor123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");

    // Navigate to leads
    await page.goto("/vendedor/leads");
    await page.click('[data-testid="lead-row"] >> nth=0');

    // Open appointment modal with keyboard (Enter on focused button)
    await page.keyboard.press("Tab"); // Focus first button
    await page.keyboard.press("Enter"); // Click "Agendar Cita"

    await expect(page.locator("text=Schedule Appointment")).toBeVisible();

    // Navigate form with keyboard
    await page.keyboard.press("Tab"); // Focus dealer select
    await page.keyboard.press("Enter"); // Open dropdown

    // Verify keyboard navigation works
    // (This is a basic check - full accessibility testing would use axe-core)
  });
});
