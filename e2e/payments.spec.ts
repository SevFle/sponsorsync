import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

test.describe("Payments Page - Unauthenticated", () => {
  test("redirects to login page when not authenticated", async ({ page }) => {
    await page.goto("/dashboard/payments");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Payments Page - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("renders the payments page with correct heading", async ({ page }) => {
    await page.goto("/dashboard/payments");
    await expect(page.locator("h1")).toContainText("Payments");
  });

  test("renders page description", async ({ page }) => {
    await page.goto("/dashboard/payments");
    await expect(page.getByText("Track payments and invoices")).toBeVisible();
  });

  test("sidebar shows payments nav link", async ({ page }) => {
    await page.goto("/dashboard/payments");
    const navLink = page.locator("nav").getByRole("link", { name: "Payments" });
    await expect(navLink).toBeVisible();
  });

  test("navigates to payments from dashboard sidebar", async ({ page }) => {
    await page.goto("/dashboard");
    await page.locator("nav").getByRole("link", { name: "Payments" }).click();
    await expect(page).toHaveURL(/\/dashboard\/payments/);
    await expect(page.locator("h1")).toContainText("Payments");
  });

  test("navigates away from payments to settings page", async ({ page }) => {
    await page.goto("/dashboard/payments");
    await page.locator("nav").getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings/);
    await expect(page.locator("h1")).toContainText("Settings");
  });

  test("can navigate back to dashboard from payments", async ({ page }) => {
    await page.goto("/dashboard/payments");
    await page.locator("nav").getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator("h1")).toContainText("Dashboard");
  });
});
