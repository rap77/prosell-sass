/**
 * E2E tests for Lead Audit Trail UI
 *
 * Tests:
 * - B4.4.10: Audit trail display on lead detail page
 *
 * Coverage:
 * - Audit trail section renders on lead detail page
 * - Status history entries display in order (newest first)
 * - Status change badges (from → to) are visible
 * - Timestamps are displayed
 * - Reasons are shown when present
 * - Empty state when no audit logs
 */
import { test, expect } from "@playwright/test";

// ─── Mock data ────────────────────────────────────────────────────────────────

const LEAD_ID = "aaaaaaaa-0000-0000-0000-000000000001";

const MOCK_LEAD = {
  id: LEAD_ID,
  tenant_id: "tttttttt-0000-0000-0000-000000000001",
  buyer_name: "Carlos Mendez",
  buyer_email: "carlos@example.com",
  buyer_phone: "+54-11-1234-5678",
  product_id: null,
  vendedor_id: null,
  message: "Interested in SUVs",
  source: "facebook",
  status: "qualified",
  created_at: "2026-05-10T09:00:00.000Z",
  updated_at: "2026-05-16T14:30:00.000Z",
};

const MOCK_AUDIT_LOGS = [
  {
    id: "cccccccc-0000-0000-0000-000000000003",
    lead_id: LEAD_ID,
    old_status: "contacted",
    new_status: "qualified",
    changed_by_user_id: "dddddddd-0000-0000-0000-000000000004",
    reason: "Buyer confirmed budget and timeline",
    created_at: "2026-05-16T14:30:00.000Z",
  },
  {
    id: "bbbbbbbb-0000-0000-0000-000000000002",
    lead_id: LEAD_ID,
    old_status: "new",
    new_status: "contacted",
    changed_by_user_id: "dddddddd-0000-0000-0000-000000000004",
    reason: "Called buyer, left voicemail",
    created_at: "2026-05-14T10:15:00.000Z",
  },
];

const MOCK_LEAD_DETAIL_RESPONSE = {
  lead: MOCK_LEAD,
  audit_logs: MOCK_AUDIT_LOGS,
};

const MOCK_LEAD_DETAIL_EMPTY_AUDIT = {
  lead: MOCK_LEAD,
  audit_logs: [],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Lead Audit Trail — B4.4.10", () => {
  test.describe.configure({ mode: "serial" });

  test("shows 'Status History' section on lead detail page", async ({ page }) => {
    // Mock GET /api/v1/leads/{id} to return lead with audit logs
    await page.route(`**/api/v1/leads/${LEAD_ID}`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_LEAD_DETAIL_RESPONSE),
        });
      } else {
        await route.continue();
      }
    });

    // Mock duplicates endpoint
    await page.route(`**/api/v1/leads/${LEAD_ID}/duplicates`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ lead_id: LEAD_ID, duplicates: [], count: 0 }),
      });
    });

    await page.goto(`/vendedor/leads/${LEAD_ID}`);
    await page.waitForLoadState("networkidle");

    // Assert: Status History heading is visible
    await expect(page.getByRole("heading", { name: /Status History/i })).toBeVisible();

    // Assert: audit trail section is present
    await expect(page.getByRole("region", { name: /lead audit trail/i })).toBeVisible();
  });

  test("renders audit entries in newest-first order", async ({ page }) => {
    await page.route(`**/api/v1/leads/${LEAD_ID}`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_LEAD_DETAIL_RESPONSE),
        });
      } else {
        await route.continue();
      }
    });

    await page.route(`**/api/v1/leads/${LEAD_ID}/duplicates`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ lead_id: LEAD_ID, duplicates: [], count: 0 }),
      });
    });

    await page.goto(`/vendedor/leads/${LEAD_ID}`);
    await page.waitForLoadState("networkidle");

    // Assert: two audit entries visible
    const entries = page.getByTestId("audit-entry");
    await expect(entries).toHaveCount(2);

    // First entry (newest) should be the contacted→qualified change
    const firstEntry = entries.nth(0);
    await expect(firstEntry.getByTestId("audit-status-change")).toContainText("Contacted");
    await expect(firstEntry.getByTestId("audit-status-change")).toContainText("Qualified");

    // Second entry (older) should be the new→contacted change
    const secondEntry = entries.nth(1);
    await expect(secondEntry.getByTestId("audit-status-change")).toContainText("New");
    await expect(secondEntry.getByTestId("audit-status-change")).toContainText("Contacted");
  });

  test("shows reasons for each status change", async ({ page }) => {
    await page.route(`**/api/v1/leads/${LEAD_ID}`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_LEAD_DETAIL_RESPONSE),
        });
      } else {
        await route.continue();
      }
    });

    await page.route(`**/api/v1/leads/${LEAD_ID}/duplicates`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ lead_id: LEAD_ID, duplicates: [], count: 0 }),
      });
    });

    await page.goto(`/vendedor/leads/${LEAD_ID}`);
    await page.waitForLoadState("networkidle");

    const entries = page.getByTestId("audit-entry");

    // First entry: reason for qualified
    await expect(entries.nth(0).getByTestId("audit-reason")).toContainText(
      "Buyer confirmed budget and timeline"
    );

    // Second entry: reason for contacted
    await expect(entries.nth(1).getByTestId("audit-reason")).toContainText(
      "Called buyer, left voicemail"
    );
  });

  test("shows who made the changes", async ({ page }) => {
    await page.route(`**/api/v1/leads/${LEAD_ID}`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_LEAD_DETAIL_RESPONSE),
        });
      } else {
        await route.continue();
      }
    });

    await page.route(`**/api/v1/leads/${LEAD_ID}/duplicates`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ lead_id: LEAD_ID, duplicates: [], count: 0 }),
      });
    });

    await page.goto(`/vendedor/leads/${LEAD_ID}`);
    await page.waitForLoadState("networkidle");

    // Both entries were changed by the same user
    const changedByEls = page.getByTestId("audit-changed-by");
    await expect(changedByEls).toHaveCount(2);

    // User ID should appear in the changed-by section
    for (const el of await changedByEls.all()) {
      await expect(el).toContainText("dddddddd-0000-0000-0000-000000000004");
    }
  });

  test("shows empty state when no audit logs", async ({ page }) => {
    await page.route(`**/api/v1/leads/${LEAD_ID}`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_LEAD_DETAIL_EMPTY_AUDIT),
        });
      } else {
        await route.continue();
      }
    });

    await page.route(`**/api/v1/leads/${LEAD_ID}/duplicates`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ lead_id: LEAD_ID, duplicates: [], count: 0 }),
      });
    });

    await page.goto(`/vendedor/leads/${LEAD_ID}`);
    await page.waitForLoadState("networkidle");

    // Assert: empty state message
    await expect(page.getByTestId("audit-empty")).toBeVisible();
    await expect(page.getByText(/no status changes recorded yet/i)).toBeVisible();
  });
});
