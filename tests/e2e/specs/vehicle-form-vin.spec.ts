/**
 * Vehicle Form VIN Decode Tests
 * 
 * Tests for VIN decode integration with Select components in the vehicle form.
 * Validates that Input fields (model, engine, trim) and Select fields 
 * (make, body_type, drivetrain, transmission, fuel_type) update correctly 
 * after VIN decode.
 * 
 * Key test scenarios:
 * - Input field updates (model, engine, trim)
 * - Select field updates (make, body_type, drivetrain, transmission, fuel_type)
 * - Select field displays correct selected values
 * - Select field placeholders appear when no value is selected
 * - No console warnings about controlled/uncontrolled components
 */

import { expect, test } from "@playwright/test";
import { VehiclesPage } from "../pages/vehicles-page";

test.describe("Vehicle Form - VIN Decode with Select Components", () => {
  let vehiclesPage: VehiclesPage;

  test.beforeEach(async ({ page }) => {
    vehiclesPage = new VehiclesPage(page);
    await page.goto("/catalog/create");
    await page.waitForLoadState("networkidle");
  });

  // ============================================
  // GROUP 1: Input Field Updates (model, engine, trim)
  // ============================================

  test.describe("Input Fields Update After VIN Decode", () => {
    test("should update model field after VIN decode", async ({ page }) => {
      // Fill VIN
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838"); // Chevrolet Equinox 2022

      // Decode VIN
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Verify model field is populated
      const modelInput = page.getByLabel(/model/i);
      await expect(modelInput).toHaveValue(/equinox/i);
    });

    test("should update engine field after VIN decode", async ({ page }) => {
      // Fill VIN
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");

      // Decode VIN
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Verify engine field is populated
      const engineInput = page.getByLabel(/motor|engine/i);
      await expect(engineInput).toHaveValue(/L|v/i); // Contains cylinder size or V indicator
    });

    test("should update trim field after VIN decode", async ({ page }) => {
      // Fill VIN
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");

      // Decode VIN
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Verify trim field is populated
      const trimInput = page.getByLabel(/versión|trim/i);
      const trimValue = await trimInput.inputValue();
      expect(trimValue.length).toBeGreaterThan(0);
    });

    test("should preserve input field values across multiple page interactions", async ({ page }) => {
      // Fill VIN and decode
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Get the initial values
      const modelInput = page.getByLabel(/model/i);
      const initialModel = await modelInput.inputValue();

      // Interact with another field
      const stockInput = page.getByLabel(/stock number/i);
      await stockInput.fill("TEST123");

      // Verify model field still has the decoded value
      const afterModel = await modelInput.inputValue();
      expect(afterModel).toBe(initialModel);
      expect(afterModel).toMatch(/equinox/i);
    });
  });

  // ============================================
  // GROUP 2: Select Field Updates
  // ============================================

  test.describe("Select Fields Update After VIN Decode", () => {
    test("should update make select field after VIN decode", async ({ page }) => {
      // Fill VIN
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");

      // Decode VIN
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Click the make select to open it
      const makeSelect = page.locator('[id="make"]');
      await expect(makeSelect).toBeVisible();
      await makeSelect.click();

      // Find the selected item in the dropdown
      const selectedItem = page.locator('[role="option"][data-state="checked"]');
      const selectedText = await selectedItem.textContent();

      // Chevrolet should be selected
      expect(selectedText).toMatch(/chevrolet|chevy/i);
    });

    test("should update body_type select field after VIN decode", async ({ page }) => {
      // Fill VIN
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");

      // Decode VIN
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Click the body_type select to open it
      const bodyTypeSelect = page.locator('[id="body_type"]');
      await expect(bodyTypeSelect).toBeVisible();
      await bodyTypeSelect.click();

      // Find the selected item
      const selectedItem = page.locator('[role="option"][data-state="checked"]');
      const selectedText = await selectedItem.textContent();

      // Should have a body type value (SUV for Equinox)
      expect(selectedText).toBeTruthy();
      expect(selectedText?.length).toBeGreaterThan(0);
    });

    test("should update drivetrain select field after VIN decode", async ({ page }) => {
      // Fill VIN
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");

      // Decode VIN
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Click the drivetrain select to open it
      const drivetrainSelect = page.locator('[id="drivetrain"]');
      await expect(drivetrainSelect).toBeVisible();
      await drivetrainSelect.click();

      // Find the selected item
      const selectedItem = page.locator('[role="option"][data-state="checked"]');
      const selectedText = await selectedItem.textContent();

      // Should be one of the drivetrain options
      expect(selectedText).toMatch(/FWD|RWD|AWD|4WD/);
    });

    test("should update transmission select field after VIN decode", async ({ page }) => {
      // Fill VIN
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");

      // Decode VIN
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Click the transmission select to open it
      const transmissionSelect = page.locator('[id="transmission"]');
      await expect(transmissionSelect).toBeVisible();
      await transmissionSelect.click();

      // Find the selected item
      const selectedItem = page.locator('[role="option"][data-state="checked"]');
      const selectedText = await selectedItem.textContent();

      // Should have transmission value
      expect(selectedText).toBeTruthy();
      expect(selectedText?.length).toBeGreaterThan(0);
    });

    test("should update fuel_type select field after VIN decode", async ({ page }) => {
      // Fill VIN
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");

      // Decode VIN
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Click the fuel_type select to open it
      const fuelTypeSelect = page.locator('[id="fuel_type"]');
      await expect(fuelTypeSelect).toBeVisible();
      await fuelTypeSelect.click();

      // Find the selected item
      const selectedItem = page.locator('[role="option"][data-state="checked"]');
      const selectedText = await selectedItem.textContent();

      // Should be a fuel type (Gasoline, Diesel, etc.)
      expect(selectedText).toBeTruthy();
      expect(selectedText?.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // GROUP 3: Select Field - Correct Value Display
  // ============================================

  test.describe("Select Fields Display Correct Selected Values", () => {
    test("should display selected make value in trigger without placeholder", async ({ page }) => {
      // Fill VIN
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");

      // Decode VIN
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Get the make select trigger text
      const makeTrigger = page.locator('[id="make"] button, [id="make"] > div[role="button"]').first();
      const triggerText = await makeTrigger.textContent();

      // Should NOT show placeholder, should show actual value
      expect(triggerText).not.toContain("Select make");
      expect(triggerText).not.toContain("Seleccionar");
      expect(triggerText).toMatch(/chevrolet|chevy/i);
    });

    test("should display selected body_type value in trigger without placeholder", async ({ page }) => {
      // Fill VIN
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");

      // Decode VIN
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Get the body_type select trigger text
      const bodyTypeTrigger = page.locator('[id="body_type"] button, [id="body_type"] > div[role="button"]').first();
      const triggerText = await bodyTypeTrigger.textContent();

      // Should have a value, not a placeholder
      expect(triggerText).toBeTruthy();
      expect(triggerText).not.toContain("Select");
    });

    test("should display selected drivetrain value in trigger without placeholder", async ({ page }) => {
      // Fill VIN
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");

      // Decode VIN
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Get the drivetrain select trigger text
      const drivetrainTrigger = page.locator('[id="drivetrain"] button, [id="drivetrain"] > div[role="button"]').first();
      const triggerText = await drivetrainTrigger.textContent();

      // Should have a value
      expect(triggerText).toMatch(/FWD|RWD|AWD|4WD/);
    });

    test("should display selected transmission value in trigger without placeholder", async ({ page }) => {
      // Fill VIN
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");

      // Decode VIN
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Get the transmission select trigger text
      const transmissionTrigger = page.locator('[id="transmission"] button, [id="transmission"] > div[role="button"]').first();
      const triggerText = await transmissionTrigger.textContent();

      // Should have a value
      expect(triggerText).toBeTruthy();
      expect(triggerText).not.toContain("Select transmission");
    });

    test("should display selected fuel_type value in trigger without placeholder", async ({ page }) => {
      // Fill VIN
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");

      // Decode VIN
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Get the fuel_type select trigger text
      const fuelTypeTrigger = page.locator('[id="fuel_type"] button, [id="fuel_type"] > div[role="button"]').first();
      const triggerText = await fuelTypeTrigger.textContent();

      // Should have a value
      expect(triggerText).toBeTruthy();
      expect(triggerText).not.toContain("Select fuel type");
    });
  });

  // ============================================
  // GROUP 4: Select Field Placeholders
  // ============================================

  test.describe("Select Fields Show Placeholders When Empty", () => {
    test("make select should show placeholder when no value is set", async ({ page }) => {
      // Don't decode VIN, just check empty state
      const makeTrigger = page.locator('[id="make"]');
      await expect(makeTrigger).toBeVisible();

      // Look for SelectValue with placeholder
      const selectValue = makeTrigger.locator('[class*="SelectValue"]');
      const triggerText = await makeTrigger.textContent();

      expect(triggerText).toContain("Select make");
    });

    test("body_type select should show placeholder when no value is set", async ({ page }) => {
      // Don't decode VIN, just check empty state
      const bodyTypeTrigger = page.locator('[id="body_type"]');
      await expect(bodyTypeTrigger).toBeVisible();

      const triggerText = await bodyTypeTrigger.textContent();
      expect(triggerText).toContain("Select type");
    });

    test("drivetrain select should show placeholder when no value is set", async ({ page }) => {
      // Don't decode VIN, just check empty state
      const drivetrainTrigger = page.locator('[id="drivetrain"]');
      await expect(drivetrainTrigger).toBeVisible();

      const triggerText = await drivetrainTrigger.textContent();
      expect(triggerText).toContain("Select drivetrain");
    });

    test("transmission select should show placeholder when no value is set", async ({ page }) => {
      // Don't decode VIN, just check empty state
      const transmissionTrigger = page.locator('[id="transmission"]');
      await expect(transmissionTrigger).toBeVisible();

      const triggerText = await transmissionTrigger.textContent();
      expect(triggerText).toContain("Select transmission");
    });

    test("fuel_type select should show placeholder when no value is set", async ({ page }) => {
      // Don't decode VIN, just check empty state
      const fuelTypeTrigger = page.locator('[id="fuel_type"]');
      await expect(fuelTypeTrigger).toBeVisible();

      const triggerText = await fuelTypeTrigger.textContent();
      expect(triggerText).toContain("Select fuel type");
    });
  });

  // ============================================
  // GROUP 5: Console Warnings & Errors
  // ============================================

  test.describe("Console Warnings & Errors", () => {
    test("should not show controlled/uncontrolled component warnings", async ({ page }) => {
      const consoleMessages: string[] = [];

      // Collect console messages
      page.on("console", (msg) => {
        if (msg.type() === "warning" || msg.type() === "error") {
          consoleMessages.push(msg.text());
        }
      });

      // Fill VIN
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");

      // Decode VIN
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Check for controlled/uncontrolled warnings
      const controlledWarnings = consoleMessages.filter((msg) =>
        msg.includes("controlled") || msg.includes("uncontrolled")
      );

      expect(controlledWarnings).toHaveLength(0);
    });

    test("should not show React form state errors after VIN decode", async ({ page }) => {
      const consoleMessages: string[] = [];

      // Collect error messages
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleMessages.push(msg.text());
        }
      });

      // Fill VIN
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");

      // Decode VIN
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Filter for React-specific form errors
      const formErrors = consoleMessages.filter((msg) =>
        msg.includes("onChange") || msg.includes("register")
      );

      expect(formErrors).toHaveLength(0);
    });

    test("should not show value type mismatch warnings", async ({ page }) => {
      const consoleMessages: string[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "warning") {
          consoleMessages.push(msg.text());
        }
      });

      // Fill VIN
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");

      // Decode VIN
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Check for value type warnings
      const typeWarnings = consoleMessages.filter((msg) =>
        msg.includes("String") || msg.includes("type") || msg.includes("value")
      );

      // Should not have warnings about type mismatches
      expect(typeWarnings.length).toBeLessThan(1);
    });
  });

  // ============================================
  // GROUP 6: Integration Tests
  // ============================================

  test.describe("Integration Tests", () => {
    test("should decode all fields simultaneously and maintain consistency", async ({ page }) => {
      // Fill VIN
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");

      // Decode VIN
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Verify all fields are populated
      const modelInput = page.getByLabel(/model/i);
      const engineInput = page.getByLabel(/motor|engine/i);
      const trimInput = page.getByLabel(/versión|trim/i);

      const modelValue = await modelInput.inputValue();
      const engineValue = await engineInput.inputValue();
      const trimValue = await trimInput.inputValue();

      expect(modelValue).toMatch(/equinox/i);
      expect(engineValue.length).toBeGreaterThan(0);
      expect(trimValue.length).toBeGreaterThan(0);

      // Now check select fields
      const makeSelect = page.locator('[id="make"]');
      const makeTrigger = makeSelect.locator('button, > div[role="button"]').first();
      const makeText = await makeTrigger.textContent();

      expect(makeText).toMatch(/chevrolet|chevy/i);
    });

    test("should allow manual override of auto-populated fields", async ({ page }) => {
      // Fill VIN and decode
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Verify initial value
      const modelInput = page.getByLabel(/model/i);
      const initialModel = await modelInput.inputValue();
      expect(initialModel).toMatch(/equinox/i);

      // Override with new value
      await modelInput.clear();
      await modelInput.fill("Custom Model");

      // Verify override
      const newModel = await modelInput.inputValue();
      expect(newModel).toBe("Custom Model");
    });

    test("should populate select field with proper values that match SelectItem values", async ({ page }) => {
      // Fill VIN
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");

      // Decode VIN
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Open drivetrain select and verify the selected value exists in options
      const drivetrainSelect = page.locator('[id="drivetrain"]');
      await drivetrainSelect.click();

      // Get the selected item
      const selectedOption = page.locator('[role="option"][data-state="checked"]');
      await expect(selectedOption).toBeVisible();

      // Get the selected value
      const selectedValue = await selectedOption.getAttribute("value");
      expect(selectedValue).toMatch(/FWD|RWD|AWD|4WD/);
    });

    test("should handle rapid VIN decode operations without losing field values", async ({ page }) => {
      // First VIN
      await vehiclesPage.vinInput.fill("1G1BE5SM42J117838");
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      // Get first decoded values
      const firstModel = await page.getByLabel(/model/i).inputValue();

      // Clear and decode different VIN
      await vehiclesPage.vinInput.clear();
      await vehiclesPage.vinInput.fill("1HGCM82633A123456"); // Different VIN (Honda)
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      // Get second decoded values
      const secondModel = await page.getByLabel(/model/i).inputValue();

      // Values should be different
      expect(secondModel).not.toBe(firstModel);
    });
  });
});
