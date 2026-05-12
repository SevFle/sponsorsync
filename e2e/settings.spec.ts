import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

test.describe("Settings Page - Unauthenticated", () => {
  test("redirects to login page when not authenticated", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Settings Page - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("renders the settings page with correct heading", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page.locator("h1")).toContainText("Settings");
  });

  test("renders page description", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page.getByText("Profile, billing, and notification preferences")).toBeVisible();
  });

  test("sidebar shows settings nav link", async ({ page }) => {
    await page.goto("/dashboard/settings");
    const navLink = page.locator("nav").getByRole("link", { name: "Settings" });
    await expect(navLink).toBeVisible();
  });

  test("navigates to settings from dashboard sidebar", async ({ page }) => {
    await page.goto("/dashboard");
    await page.locator("nav").getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings/);
    await expect(page.locator("h1")).toContainText("Settings");
  });

  test("navigates away from settings to deals page", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await page.locator("nav").getByRole("link", { name: "Deals" }).click();
    await expect(page).toHaveURL(/\/dashboard\/deals/);
    await expect(page.locator("h1")).toContainText("Deals");
  });

  test("can navigate back to dashboard from settings", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await page.locator("nav").getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator("h1")).toContainText("Dashboard");
  });
});
