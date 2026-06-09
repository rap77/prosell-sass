const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Set dealer role cookie
  await page.context().addCookies([
    {
      name: "user_data",
      value: encodeURIComponent(
        JSON.stringify({
          id: "dealer-1",
          email: "test@example.com",
          role: "branch",
          name: "Test Branch",
          tenant_id: "default-tenant-id",
        }),
      ),
      domain: "localhost",
      path: "/",
      sameSite: "Lax",
    },
  ]);

  // Mock auth state
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

  // Mock leads
  await page.route("**/api/v1/leads/lead-1", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
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
            attributes: {
              category: "vehicle",
              year: 2024,
              make: "Toyota",
              model: "Camry",
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          message: "Interested in this vehicle",
          status: "appointment_set",
          source: "marketplace",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Mock appointments
  await page.route("**/api/v1/appointments**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: "apt-1",
              tenant_id: "tenant-1",
              user_id: "dealer-1",
              lead_id: "lead-1",
              product_id: "prod-1",
              buyer_name: "John Doe",
              buyer_phone: "+1-555-0101",
              scheduled_at: new Date().toISOString(),
              status: "scheduled",
              notes: "Interested in this vehicle",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          total: 1,
          limit: 50,
          offset: 0,
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Log all console messages
  page.on("console", (msg) => {
    console.log("[BROWSER]", msg.text());
  });

  // Log all network requests
  page.on("request", (request) => {
    console.log("[REQUEST]", request.method(), request.url());
  });

  page.on("response", (response) => {
    console.log("[RESPONSE]", response.status(), response.url());
  });

  console.log("Navigating to /branch/appointments...");
  await page.goto("http://localhost:3000/branch/appointments");

  console.log("Waiting for events...");
  await page.waitForSelector(".fc-event", { timeout: 15000 });

  console.log("Clicking first event...");
  await page.click(".fc-event");

  console.log("Waiting for modal...");
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

  console.log("Getting modal content...");
  const modalText = await page.locator('[role="dialog"]').textContent();
  console.log("Modal content:", modalText?.substring(0, 500));

  console.log("Press any key to close...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  await browser.close();
})();
