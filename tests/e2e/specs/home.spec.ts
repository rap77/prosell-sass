import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Home Page", () => {
  test("should display the main heading", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "ProSell SaaS" }),
    ).toBeVisible();
  });

  test("should pass accessibility checks", async ({ page }) => {
    await page.goto("/");
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
