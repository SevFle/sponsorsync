import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

test.describe("Dashboard Overview - Unauthenticated", () => {
  test("redirects to login page when not authenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Dashboard Overview - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/dashboard");
  });

  test("renders the dashboard page with correct heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Dashboard");
  });

  test("renders page description", async ({ page }) => {
    await expect(page.getByText("Overview of your sponsorship activity")).toBeVisible();
  });

  test("displays metric cards", async ({ page }) => {
    await expect(page.getByText("Active Deals")).toBeVisible();
    await expect(page.getByText("Revenue (MTD)")).toBeVisible();
    await expect(page.getByText("Pending Deliverables")).toBeVisible();
    await expect(page.getByText("Overdue Payments")).toBeVisible();
  });

  test("renders upcoming deadlines section", async ({ page }) => {
    await expect(page.getByText("Upcoming Deadlines")).toBeVisible();
  });

  test("renders recent activity section", async ({ page }) => {
    await expect(page.getByText("Recent Activity")).toBeVisible();
  });

  test("renders deal pipeline section", async ({ page }) => {
    await expect(page.getByText("Deal Pipeline")).toBeVisible();
  });

  test("displays New Deal and New Sponsor links", async ({ page }) => {
    await expect(page.getByRole("link", { name: "New Deal" })).toBeVisible();
    await expect(page.getByRole("link", { name: "New Sponsor" })).toBeVisible();
  });

  test("deal pipeline shows status badges", async ({ page }) => {
    await expect(page.getByText("Draft", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Active", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Completed", { exact: false }).first()).toBeVisible();
  });

  test("sidebar navigation is present", async ({ page }) => {
    const nav = page.locator("nav");
    await expect(nav.getByText("SponsorSync")).toBeVisible();
    await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Deals" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Deliverables" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Payments" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Settings" })).toBeVisible();
  });

  test("navigates to deals page via sidebar", async ({ page }) => {
    await page.locator("nav").getByRole("link", { name: "Deals" }).click();
    await expect(page).toHaveURL(/\/dashboard\/deals/);
    await expect(page.locator("h1")).toContainText("Deals");
  });

  test("shows empty state or data for deadlines", async ({ page }) => {
    const deadlinesSection = page.getByText("Upcoming Deadlines").locator("..");
    const hasData = await page.getByText(/d left|Overdue|Today/).first().isVisible().catch(() => false);
    const hasEmpty = await page.getByText("No upcoming deadlines").isVisible().catch(() => false);
    expect(hasData || hasEmpty).toBeTruthy();
  });

  test("shows error state when API fails", async ({ page }) => {
    await page.route("**/api/dashboard", (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: "Internal Server Error" }) })
    );
    await page.reload();
    await expect(page.getByText(/something went wrong|error/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
  });

  test("retry button refetches data after error", async ({ page }) => {
    let callCount = 0;
    await page.route("**/api/dashboard", (route) => {
      callCount++;
      if (callCount === 1) {
        route.fulfill({ status: 500, body: JSON.stringify({ error: "fail" }) });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            deals: [],
            deliverables: [],
            payments: [],
            metrics: {
              activeDeals: 0,
              draftDeals: 0,
              completedDeals: 0,
              revenueMtd: 0,
              pendingDeliverables: 0,
              overduePayments: 0,
            },
          }),
        });
      }
    });
    await page.reload();
    await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
    await page.getByRole("button", { name: /try again/i }).click();
    await expect(page.getByText("Active Deals")).toBeVisible();
  });
});
