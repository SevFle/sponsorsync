import { test, expect } from "@playwright/test";

test.describe("Health endpoint", () => {
  test("GET /api/health returns ok status", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("SponsorSync");
    expect(body.timestamp).toBeDefined();
  });
});

test.describe("Navigation", () => {
  test("login page loads correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("Sign in to SponsorSync");
  });
});
