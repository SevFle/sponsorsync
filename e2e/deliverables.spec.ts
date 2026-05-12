import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

test.describe("Deliverables Page - Unauthenticated", () => {
  test("redirects to login page when not authenticated", async ({ page }) => {
    await page.goto("/dashboard/deliverables");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Deliverables Page - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("renders the deliverables page with correct heading", async ({ page }) => {
    await page.goto("/dashboard/deliverables");
    await expect(page.locator("h1")).toContainText("Deliverables");
  });

  test("renders page description", async ({ page }) => {
    await page.goto("/dashboard/deliverables");
    await expect(page.getByText("Calendar and kanban view of deliverables")).toBeVisible();
  });

  test("sidebar highlights deliverables nav link", async ({ page }) => {
    await page.goto("/dashboard/deliverables");
    const navLinks = page.locator("nav").getByRole("link");
    await expect(navLinks.filter({ hasText: "Deliverables" })).toBeVisible();
  });

  test("navigates to deliverables from dashboard sidebar", async ({ page }) => {
    await page.goto("/dashboard");
    await page.locator("nav").getByRole("link", { name: "Deliverables" }).click();
    await expect(page).toHaveURL(/\/dashboard\/deliverables/);
    await expect(page.locator("h1")).toContainText("Deliverables");
  });

  test("navigates away from deliverables to deals page", async ({ page }) => {
    await page.goto("/dashboard/deliverables");
    await page.locator("nav").getByRole("link", { name: "Deals" }).click();
    await expect(page).toHaveURL(/\/dashboard\/deals/);
    await expect(page.locator("h1")).toContainText("Deals");
  });
});
