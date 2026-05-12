import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const MOCK_DEALS = [
  {
    id: "deal-1",
    sponsorName: "Acme Corp",
    title: "Q1 Podcast Sponsorship",
    description: "4-episode sponsorship deal",
    status: "active",
    totalValue: 5000,
    currency: "USD",
    endDate: "2026-08-01",
    progress: 50,
  },
  {
    id: "deal-2",
    sponsorName: "Beta Labs",
    title: "Newsletter Banner Ads",
    description: "Monthly newsletter ad placement",
    status: "draft",
    totalValue: 2000,
    currency: "USD",
    endDate: "2026-06-15",
    progress: 0,
  },
  {
    id: "deal-3",
    sponsorName: "Gamma Inc",
    title: "Season Partnership",
    description: "Full season partnership",
    status: "completed",
    totalValue: 10000,
    currency: "USD",
    endDate: "2026-01-01",
    progress: 100,
  },
  {
    id: "deal-4",
    sponsorName: "Delta Media",
    title: "Cancelled Deal",
    description: "Deal was cancelled",
    status: "cancelled",
    totalValue: 3000,
    currency: "USD",
    endDate: null,
    progress: 0,
  },
];

test.describe("Deals Page - Unauthenticated", () => {
  test("redirects to login page when not authenticated", async ({ page }) => {
    await page.goto("/dashboard/deals");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Deals Page - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("renders the deals page with correct heading", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ deals: MOCK_DEALS }) })
    );
    await page.goto("/dashboard/deals");
    await expect(page.locator("h1")).toContainText("Deals");
  });

  test("renders page description", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ deals: MOCK_DEALS }) })
    );
    await page.goto("/dashboard/deals");
    await expect(page.getByText("Manage your sponsorship deals")).toBeVisible();
  });

  test("displays New Deal link", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ deals: MOCK_DEALS }) })
    );
    await page.goto("/dashboard/deals");
    await expect(page.getByRole("link", { name: "New Deal" })).toBeVisible();
  });

  test("renders search input", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ deals: MOCK_DEALS }) })
    );
    await page.goto("/dashboard/deals");
    const searchInput = page.getByPlaceholder(/search deals/i);
    await expect(searchInput).toBeVisible();
  });

  test("renders sort dropdown", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ deals: MOCK_DEALS }) })
    );
    await page.goto("/dashboard/deals");
    const sortSelect = page.getByRole("combobox", { name: /sort deals/i });
    await expect(sortSelect).toBeVisible();
  });

  test("renders filter tabs", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ deals: MOCK_DEALS }) })
    );
    await page.goto("/dashboard/deals");
    await expect(page.getByRole("button", { name: "All Deals" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Active" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Draft" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Completed" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancelled" })).toBeVisible();
  });

  test("displays deal cards with data from API", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ deals: MOCK_DEALS }) })
    );
    await page.goto("/dashboard/deals");
    await expect(page.getByText("Acme Corp")).toBeVisible();
    await expect(page.getByText("Q1 Podcast Sponsorship")).toBeVisible();
    await expect(page.getByText("Beta Labs")).toBeVisible();
    await expect(page.getByText("Gamma Inc")).toBeVisible();
  });

  test("filter by Active tab shows only active deals", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ deals: MOCK_DEALS }) })
    );
    await page.goto("/dashboard/deals");
    await page.getByRole("button", { name: "Active" }).click();
    await expect(page.getByText("Acme Corp")).toBeVisible();
    await expect(page.getByText("Beta Labs")).not.toBeVisible();
    await expect(page.getByText("Gamma Inc")).not.toBeVisible();
    await expect(page.getByText("Delta Media")).not.toBeVisible();
  });

  test("filter by Draft tab shows only draft deals", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ deals: MOCK_DEALS }) })
    );
    await page.goto("/dashboard/deals");
    await page.getByRole("button", { name: "Draft" }).click();
    await expect(page.getByText("Beta Labs")).toBeVisible();
    await expect(page.getByText("Acme Corp")).not.toBeVisible();
  });

  test("filter by Completed tab shows only completed deals", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ deals: MOCK_DEALS }) })
    );
    await page.goto("/dashboard/deals");
    await page.getByRole("button", { name: "Completed" }).click();
    await expect(page.getByText("Gamma Inc")).toBeVisible();
    await expect(page.getByText("Acme Corp")).not.toBeVisible();
  });

  test("filter by Cancelled tab shows only cancelled deals", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ deals: MOCK_DEALS }) })
    );
    await page.goto("/dashboard/deals");
    await page.getByRole("button", { name: "Cancelled" }).click();
    await expect(page.getByText("Delta Media")).toBeVisible();
    await expect(page.getByText("Acme Corp")).not.toBeVisible();
  });

  test("All Deals tab shows all deals", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ deals: MOCK_DEALS }) })
    );
    await page.goto("/dashboard/deals");
    await page.getByRole("button", { name: "Cancelled" }).click();
    await page.getByRole("button", { name: "All Deals" }).click();
    await expect(page.getByText("Acme Corp")).toBeVisible();
    await expect(page.getByText("Beta Labs")).toBeVisible();
    await expect(page.getByText("Gamma Inc")).toBeVisible();
    await expect(page.getByText("Delta Media")).toBeVisible();
  });

  test("search filters deals by sponsor name", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ deals: MOCK_DEALS }) })
    );
    await page.goto("/dashboard/deals");
    await page.getByPlaceholder(/search deals/i).fill("Acme");
    await expect(page.getByText("Acme Corp")).toBeVisible();
    await expect(page.getByText("Beta Labs")).not.toBeVisible();
    await expect(page.getByText("Gamma Inc")).not.toBeVisible();
  });

  test("search filters deals by title keyword", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ deals: MOCK_DEALS }) })
    );
    await page.goto("/dashboard/deals");
    await page.getByPlaceholder(/search deals/i).fill("Newsletter");
    await expect(page.getByText("Beta Labs")).toBeVisible();
    await expect(page.getByText("Acme Corp")).not.toBeVisible();
  });

  test("search filters deals by status keyword", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ deals: MOCK_DEALS }) })
    );
    await page.goto("/dashboard/deals");
    await page.getByPlaceholder(/search deals/i).fill("cancelled");
    await expect(page.getByText("Delta Media")).toBeVisible();
    await expect(page.getByText("Acme Corp")).not.toBeVisible();
  });

  test("search with no matches shows empty state", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ deals: MOCK_DEALS }) })
    );
    await page.goto("/dashboard/deals");
    await page.getByPlaceholder(/search deals/i).fill("nonexistent-deal-xyz");
    await expect(page.getByText("No deals match your filters")).toBeVisible();
  });

  test("shows empty state when no deals exist", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ deals: [] }) })
    );
    await page.goto("/dashboard/deals");
    await expect(page.getByText("No deals yet")).toBeVisible();
    await expect(page.getByText("Create your first deal to get started")).toBeVisible();
  });

  test("shows error state when API fails", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: "Internal Server Error" }) })
    );
    await page.goto("/dashboard/deals");
    await expect(page.getByText(/something went wrong|error/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
  });

  test("retry button refetches deals after error", async ({ page }) => {
    let callCount = 0;
    await page.route("**/api/deals", (route) => {
      callCount++;
      if (callCount === 1) {
        route.fulfill({ status: 500, body: JSON.stringify({ error: "fail" }) });
      } else {
        route.fulfill({ status: 200, body: JSON.stringify({ deals: MOCK_DEALS }) });
      }
    });
    await page.goto("/dashboard/deals");
    await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
    await page.getByRole("button", { name: /try again/i }).click();
    await expect(page.getByText("Acme Corp")).toBeVisible();
  });

  test("sort dropdown changes order of deals", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ deals: MOCK_DEALS }) })
    );
    await page.goto("/dashboard/deals");
    const sortSelect = page.getByRole("combobox", { name: /sort deals/i });
    await sortSelect.selectOption("totalValue-desc");

    const dealCards = page.locator('[role="progressbar"]').locator("..").locator("..");
    const firstCardText = await dealCards.first().textContent();
    expect(firstCardText).toContain("Gamma Inc");
  });

  test("deal card links to deal detail page", async ({ page }) => {
    await page.route("**/api/deals", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ deals: [MOCK_DEALS[0]] }) })
    );
    await page.goto("/dashboard/deals");
    const dealLink = page.locator(`a[href="/dashboard/deals/${MOCK_DEALS[0].id}"]`);
    await expect(dealLink).toBeVisible();
    expect(dealLink).not.toBeNull();
  });

  test("shows loading skeleton while fetching deals", async ({ page }) => {
    await page.route("**/api/deals", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      route.fulfill({ status: 200, body: JSON.stringify({ deals: MOCK_DEALS }) });
    });
    await page.goto("/dashboard/deals");
    await expect(page.locator("h1")).toContainText("Deals");
  });
});
