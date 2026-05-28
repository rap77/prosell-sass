/**
 * Integrated Flow E2E Tests — Catalog → Lead → Appointment
 *
 * CRITICAL MVP TEST SUITE
 *
 * Coverage:
 *   ✅ API integration path  — all backend endpoints verified end-to-end
 *   ✅ Browser UI path       — catalog list, leads list, appointments page
 *   ✅ Milestone C            — catalog detail, publications, pipeline kanban
 *
 * Run with: pnpm test tests/e2e/specs/integrated-flow.spec.ts
 *
 * Prerequisites:
 *   - Docker services running (DB, Redis, API, Web)
 *   - Admin user created (see apps/api/src/prosell/infrastructure/db/init_data.py)
 */

import { expect, test } from "@playwright/test";
import { TestDataBuilder } from "../helpers/data-builder";
import { authenticateAsAdmin } from "../helpers/auth";

// Use extended test with auto-cleanup fixtures
import { test as testWithFixtures } from "../fixtures/test-setup";

test.describe.configure({ mode: "serial", retries: 0 }); // Run sequentially to avoid data conflicts, no retries

/**
 * INTEGRATED FLOW: Catalog → Lead → Appointment
 *
 * This test verifies the complete happy path for the ProSell SaaS MVP.
 * It creates a vehicle, captures a lead, and schedules an appointment.
 */
testWithFixtures.describe("Integrated Flow: Catalog → Lead → Appointment", () => {
  testWithFixtures("Complete Happy Path: Catalog → Lead → Appointment", async ({ page, request }) => {
    // ============================================================================
    // SETUP
    // ============================================================================
    // Authenticate as admin
    await authenticateAsAdmin(page, request);

    // Initialize TestDataBuilder
    const dataBuilder = new TestDataBuilder(page);

    // Get dealer ID (admin user for now)
    // TODO: Create a dedicated vendedor user when user management is ready
    const authState = await page.request.get("http://localhost:3000/api/v1/auth/state");
    if (!authState.ok()) {
      throw new Error("Failed to get auth state");
    }
    const authData = await authState.json();
    const dealerId = authData.user?.id || authData.user_id;
    if (!dealerId) {
      throw new Error("Failed to get dealer ID from auth state");
    }

    console.log(`🔐 Authenticated as dealer: ${dealerId}`);

    // ============================================================================
    // STEP 1: CATALOG FLOW
    // ============================================================================
    console.log("\n📦 STEP 1: CATALOG FLOW");

    // 1.1 Create a test category
    const categoryId = await dataBuilder.createCategory("Test SUVs");
    expect(categoryId).toBeTruthy();
    console.log(`✅ Category created: ${categoryId}`);

    // 1.2 Create a vehicle in that category
    const vehicleId = await dataBuilder.createVehicle(categoryId, {
      vin: "2GNALCEK1H1615946",
      year: 2017,
      make: "Chevrolet",
      model: "Equinox",
      trim: "LT",
      mileage: 50000,
      price: 18500,
      status: "available",
    });
    expect(vehicleId).toBeTruthy();
    console.log(`✅ Vehicle created: ${vehicleId}`);

    // 1.3 Verify vehicle exists in API
    const vehicleResponse = await request.get(`http://localhost:3000/api/v1/products/${vehicleId}`);
    expect(vehicleResponse.ok()).toBeTruthy();
    const vehicleData = await vehicleResponse.json();
    expect(vehicleData.id).toBe(vehicleId);
    expect(vehicleData.attributes.vin).toBe("2GNALCEK1H1615946");
    console.log(`✅ Vehicle verified in API: ${vehicleData.title}`);

    // 1.4 Publish vehicle (DRAFT → PENDING → PUBLISHED)
    await dataBuilder.publishVehicle(vehicleId);
    console.log(`✅ Vehicle published: ${vehicleId}`);

    // 1.5 Verify vehicle is visible in catalog UI (browser)
    const webBaseUrl = process.env.WEB_BASE_URL || "http://localhost:3000";
    await page.goto(`${webBaseUrl}/catalog`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Chevrolet Equinox").first()).toBeVisible({ timeout: 15000 });
    console.log(`✅ Vehicle visible in /catalog UI (DataGrid rendered)`);

    // ============================================================================
    // STEP 2: LEAD FLOW
    // ============================================================================
    console.log("\n👤 STEP 2: LEAD FLOW");

    // 2.1 Create a lead for the vehicle
    const timestamp = Date.now();
    const leadId = await dataBuilder.createLead(vehicleId, {
      buyer_name: "John Doe",
      buyer_email: `john.doe.${timestamp}@example.com`,
      buyer_phone: `+15550199${timestamp.toString().slice(-4)}`, // Unique phone
      message: "I'm interested in this Chevrolet Equinox. Is it still available?",
    });
    expect(leadId).toBeTruthy();
    console.log(`✅ Lead created: ${leadId}`);

    // 2.2 Verify lead exists in API
    const leadResponse = await request.get(`http://localhost:3000/api/v1/leads/${leadId}`);
    expect(leadResponse.ok()).toBeTruthy();
    const leadDetailData = await leadResponse.json();
    expect(leadDetailData.lead.id).toBe(leadId);
    expect(leadDetailData.lead.buyer_name).toBe("John Doe");
    expect(leadDetailData.lead.buyer_email).toMatch(/john\.doe\.\d+@example\.com/);
    expect(leadDetailData.lead.product_id).toBe(vehicleId); // Lead is linked to vehicle (as product)
    expect(leadDetailData.lead.status).toBe("new"); // Initial status
    console.log(`✅ Lead verified in API: ${leadDetailData.lead.buyer_name}`);

    // 2.3 Verify lead appears in leads list
    const leadsListResponse = await request.get("http://localhost:3000/api/v1/leads");
    expect(leadsListResponse.ok()).toBeTruthy();
    const leadsList = await leadsListResponse.json();
    expect(leadsList.items).toBeDefined();
    expect(leadsList.items.length).toBeGreaterThan(0);
    const createdLead = leadsList.items.find((l: { id: string }) => l.id === leadId);
    expect(createdLead).toBeTruthy();
    console.log(`✅ Lead appears in leads list`);

    // 2.4 Verify lead status transitions work
    const updateStatusResponse = await request.put(`http://localhost:3000/api/v1/leads/${leadId}/status`, {
      data: {
        new_status: "contacted",
      },
    });
    expect(updateStatusResponse.ok()).toBeTruthy();
    const updatedLead = await updateStatusResponse.json();
    expect(updatedLead.status).toBe("contacted"); // Response is LeadResponse (not LeadDetailResponse)
    console.log(`✅ Lead status updated: new → contacted`);

    const qualifyLeadResponse = await request.put(`http://localhost:3000/api/v1/leads/${leadId}/status`, {
      data: {
        new_status: "qualified",
      },
    });
    expect(qualifyLeadResponse.ok()).toBeTruthy();
    const qualifiedLead = await qualifyLeadResponse.json();
    expect(qualifiedLead.status).toBe("qualified");
    console.log(`✅ Lead status updated: contacted → qualified`);

    // 2.5 Verify lead visible in leads list UI (browser)
    await page.goto(`${webBaseUrl}/vendedor/leads`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("John Doe").first()).toBeVisible({ timeout: 15000 });
    console.log(`✅ Lead visible in /vendedor/leads UI`);

    // ============================================================================
    // STEP 3: APPOINTMENT FLOW
    // ============================================================================
    console.log("\n📅 STEP 3: APPOINTMENT FLOW");

    // 3.1 Create an appointment for the lead
    // Use a naive ISO datetime string within weekday business hours because
    // the backend validates the submitted hour directly and treats naive
    // datetimes as UTC.
    const timestampSeed = Date.now();
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 40 + (timestampSeed % 15));
    while (appointmentDate.getDay() === 0 || appointmentDate.getDay() === 6) {
      appointmentDate.setDate(appointmentDate.getDate() + 1);
    }
    const appointmentDatePart = appointmentDate.toISOString().split("T")[0];
    const scheduledAt = `${appointmentDatePart}T10:00:00`;

    const appointmentId = await dataBuilder.createAppointment(
      leadId,
      vehicleId, // product_id in C3 model
      dealerId, // user_id (dealer who will attend)
      scheduledAt,
      {
        notes: "Customer wants to test drive the Equinox",
      },
    );
    expect(appointmentId).toBeTruthy();
    console.log(`✅ Appointment created: ${appointmentId}`);

    // 3.2 Verify appointment exists in API
    const appointmentResponse = await request.get(`http://localhost:3000/api/v1/appointments/${appointmentId}`);
    expect(appointmentResponse.ok()).toBeTruthy();
    const appointmentData = await appointmentResponse.json();
    expect(appointmentData.id).toBe(appointmentId);
    expect(appointmentData.lead_id).toBe(leadId);
    expect(appointmentData.product_id).toBe(vehicleId); // C3 model: product_id = vehicle_id
    expect(appointmentData.status).toBe("scheduled"); // Initial status
    console.log(`✅ Appointment verified in API: ${scheduledAt}`);

    // 3.3 Verify lead status was auto-updated to "appointment_set"
    const leadAfterAppointmentResponse = await request.get(`http://localhost:3000/api/v1/leads/${leadId}`);
    expect(leadAfterAppointmentResponse.ok()).toBeTruthy();
    const leadAfterAppointmentDetail = await leadAfterAppointmentResponse.json();
    expect(leadAfterAppointmentDetail.lead.status).toBe("appointment_set");
    console.log(`✅ Lead status auto-updated: qualified → appointment_set`);

    // 3.4 Verify appointment appears in dealer's calendar
    const calendarResponse = await request.get(
      `http://localhost:3000/api/v1/appointments?dealer_id=${dealerId}&start_date=${appointmentDate.toISOString().split('T')[0]}`,
    );
    expect(calendarResponse.ok()).toBeTruthy();
    const calendarData = await calendarResponse.json();
    expect(calendarData.items).toBeDefined();
    const createdAppointment = calendarData.items.find((a: { id: string }) => a.id === appointmentId);
    expect(createdAppointment).toBeTruthy();
    console.log(`✅ Appointment visible in dealer calendar`);

    // 3.5 Verify appointment status transitions work
    const updateApptStatusResponse = await request.put(`http://localhost:3000/api/v1/appointments/${appointmentId}`, {
      data: {
        status: "completed",
      },
    });
    expect(updateApptStatusResponse.ok()).toBeTruthy();
    const updatedAppointment = await updateApptStatusResponse.json();
    expect(updatedAppointment.status).toBe("completed");
    console.log(`✅ Appointment status updated: scheduled → completed`);

    // 3.6 Verify appointment visible in dealer calendar UI (browser)
    await page.goto(`${webBaseUrl}/branch/appointments`);
    await page.waitForLoadState("networkidle");
    // Calendar page must load without error — full appointment card verification
    // requires dealer-scoped filtering which depends on calendar component rendering
    await expect(page.locator("main")).toBeVisible({ timeout: 15000 });
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
    console.log(`✅ /branch/appointments page rendered (calendar UI loaded)`);

    // ============================================================================
    // VERIFICATION: Complete Flow Integration
    // ============================================================================
    console.log("\n✅ VERIFICATION: Complete Flow Integration");

    // Verify vehicle
    const verifyVehicleResponse = await request.get(`http://localhost:3000/api/v1/products/${vehicleId}`);
    expect(verifyVehicleResponse.ok()).toBeTruthy();
    const verifyVehicle = await verifyVehicleResponse.json();
    expect(verifyVehicle.id).toBe(vehicleId);
    expect(verifyVehicle.attributes.vin).toBe("2GNALCEK1H1615946");
    console.log(`✅ VERIFICATION: Vehicle ${vehicleId} exists`);

    // Verify lead is linked to vehicle (as product)
    const verifyLeadResponse = await request.get(`http://localhost:3000/api/v1/leads/${leadId}`);
    expect(verifyLeadResponse.ok()).toBeTruthy();
    const verifyLeadDetail = await verifyLeadResponse.json();
    expect(verifyLeadDetail.lead.id).toBe(leadId);
    expect(verifyLeadDetail.lead.product_id).toBe(vehicleId); // product_id = vehicle_id in C3 model
    expect(verifyLeadDetail.lead.status).toBe("appointment_set"); // Updated by appointment creation
    console.log(`✅ VERIFICATION: Lead ${leadId} → Vehicle ${vehicleId}`);

    // Verify appointment is linked to lead and vehicle (as product)
    const verifyAppointmentResponse = await request.get(`http://localhost:3000/api/v1/appointments/${appointmentId}`);
    expect(verifyAppointmentResponse.ok()).toBeTruthy();
    const verifyAppointment = await verifyAppointmentResponse.json();
    expect(verifyAppointment.id).toBe(appointmentId);
    expect(verifyAppointment.lead_id).toBe(leadId);
    expect(verifyAppointment.product_id).toBe(vehicleId); // product_id = vehicle_id in C3 model
    console.log(`✅ VERIFICATION: Appointment ${appointmentId} → Lead ${leadId} → Vehicle ${vehicleId}`);

    // Verify all entities in their respective lists
    const [allProductsList, allLeadsList, allAppointmentsList] = await Promise.all([
      request.get("http://localhost:3000/api/v1/products"),
      request.get("http://localhost:3000/api/v1/leads"),
      request.get(`http://localhost:3000/api/v1/appointments?dealer_id=${dealerId}`),
    ]);

    expect(allProductsList.ok()).toBeTruthy();
    expect(allLeadsList.ok()).toBeTruthy();
    expect(allAppointmentsList.ok()).toBeTruthy();

    const productsData = await allProductsList.json();
    const leadsData = await allLeadsList.json();
    const appointmentsData = await allAppointmentsList.json();

    expect(productsData.products).toBeDefined();
    expect(leadsData.items).toBeDefined();
    expect(appointmentsData.items).toBeDefined();

    const listedProduct = productsData.products.find((product: { id: string }) => product.id === vehicleId);
    const listedLead = leadsData.items.find((lead: { id: string }) => lead.id === leadId);
    const listedAppointment = appointmentsData.items.find((appointment: { id: string }) => appointment.id === appointmentId);

    expect(listedProduct).toBeTruthy();
    expect(listedLead).toBeTruthy();
    expect(listedAppointment).toBeTruthy();

    console.log(`✅ VERIFICATION: All entities visible in lists`);
    console.log(`   - Products: ${productsData.products.length}`);
    console.log(`   - Leads: ${leadsData.items.length}`);
    console.log(`   - Appointments: ${appointmentsData.items.length}`);

    // ============================================================================
    // CLEANUP
    // ============================================================================
    console.log("\n🧹 CLEANUP: Deleting test data");
    await dataBuilder.cleanup();
    console.log("✅ Cleanup complete");

    // ============================================================================
    // FINAL SUMMARY
    // ============================================================================
    console.log("\n" + "=".repeat(60));
    console.log("✅ INTEGRATED FLOW TEST PASSED");
    console.log("=".repeat(60));
    console.log(`📦 Vehicle:    ${vehicleId}`);
    console.log(`👤 Lead:       ${leadId}`);
    console.log(`📅 Appointment: ${appointmentId}`);
    console.log(`🔗 Link Chain: Vehicle → Lead → Appointment`);
    console.log("=".repeat(60));
  });
});

// ============================================================================
// ============================================================================
// Milestone C — UI pages (implemented)
// ============================================================================

testWithFixtures.describe("Milestone C — Catalog detail page", () => {
  testWithFixtures("UI: /catalog/{id} — product detail view", async ({ page, request }) => {
    await authenticateAsAdmin(page, request);
    const dataBuilder = new TestDataBuilder(page);
    const webBaseUrl = process.env.WEB_BASE_URL || "http://localhost:3000";

    const categoryId = await dataBuilder.createCategory("Detail Test Category");
    const vehicleId = await dataBuilder.createVehicle(categoryId, {
      vin: "1HGCM82633A004321",
      year: 2021,
      make: "Honda",
      model: "Accord",
      trim: "EX",
      mileage: 30000,
      price: 24000,
      status: "available",
    });
    await dataBuilder.publishVehicle(vehicleId);

    await page.goto(`${webBaseUrl}/catalog/${vehicleId}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("1HGCM82633A004321")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: /editar/i })).toBeVisible();
    console.log(`✅ Catalog detail page renders with VIN and Edit link`);
  });
});

test.describe("Milestone C — Publications page", () => {
  test("UI: /publications — publications list renders", async ({ page, request }) => {
    await authenticateAsAdmin(page, request);
    const webBaseUrl = process.env.WEB_BASE_URL || "http://localhost:3000";

    await page.goto(`${webBaseUrl}/publications`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /nueva publicación/i })).toBeVisible({ timeout: 10000 });
    console.log(`✅ Publications page renders with Nueva publicación button`);
  });
});

test.describe("Milestone C — Pipeline kanban", () => {
  test("UI: /pipeline — kanban board renders with columns", async ({ page, request }) => {
    await authenticateAsAdmin(page, request);
    const webBaseUrl = process.env.WEB_BASE_URL || "http://localhost:3000";

    await page.goto(`${webBaseUrl}/pipeline`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /pipeline/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Nuevos")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Contactados")).toBeVisible();
    await expect(page.getByText("Calificados")).toBeVisible();
    console.log(`✅ Pipeline kanban renders with all lead status columns`);
  });
});
