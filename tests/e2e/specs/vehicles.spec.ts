import { expect, test } from "@playwright/test";

test.describe("Vehicles", () => {
  test("should populate Select fields after VIN decode - bug fix verification", async ({ page }) => {
    // This test verifies the fix for commit 3252454
    // Previously: Select fields remained empty after VIN decode
    // Fix: Removed ?? "" fallback from Select value props

    await page.goto("/catalog/create");

    // Wait for page to load
    await page.waitForLoadState("load");

    // Take screenshot BEFORE
    await page.screenshot({ path: "test-results/before-decode.png" });

    // Valid VIN for Chevrolet Equinox 2017
    const testVin = "2GNALCEK1H1615946";

    // Fill VIN and decode
    const vinInput = page.getByLabel(/vin/i);
    await expect(vinInput).toBeVisible();
    await vinInput.fill(testVin);

    const decodeButton = page.getByRole("button", { name: /decode|decodificar/i });
    await expect(decodeButton).toBeVisible();
    await decodeButton.click();

    // Wait for decode to complete
    await page.waitForLoadState("load");
    await page.waitForTimeout(3000); // Extra wait for state updates

    // Take screenshot AFTER
    await page.screenshot({ path: "test-results/after-decode.png" });

    // CRITICAL VERIFICATION: Check Select fields are populated
    // These fields use Radix UI Select with Controller
    // NOTE: Radix UI Select doesn't expose value like native selects
    // We need to check the SelectValue text content instead

    // Use Spanish labels as the UI is in Spanish
    const makeLabel = page.getByText(/marca/i);
    await expect(makeLabel).toBeVisible();

    // Find the SelectTrigger next to the label
    const makeSelect = page.locator('label:has-text("Marca") + div').or(
      page.locator('[id="make"]')
    );
    await expect(makeSelect).toBeVisible();

    // For Radix UI Select, check the visible text content
    // The SelectValue should show the selected option, not placeholder
    const makeContainer = page.locator('[id="make"]').locator('..');
    const makeText = await makeContainer.textContent();

    console.log("Make select container text:", makeText);

    // Check that it's NOT the placeholder and shows the decoded value
    expect(makeText).not.toContain("Select make");
    expect(makeText).not.toContain("Seleccionar");
    expect(makeText).toMatch(/chevrolet|chevy/i);

    // Also verify Input fields are populated (these work normally)
    const modelInput = page.getByLabel(/model/i);
    await expect(modelInput).toBeVisible();
    await expect(modelInput).toHaveValue(/equinox/i);

    const engineInput = page.getByLabel(/motor|engine/i);
    await expect(engineInput).toBeVisible();
    await expect(engineInput).toHaveValue(/LEA|SIDI|Direct Injection/i);

    const trimInput = page.getByLabel(/versión|trim/i);
    await expect(trimInput).toBeVisible();
    await expect(trimInput).toHaveValue(/LT/i);
  });
});
