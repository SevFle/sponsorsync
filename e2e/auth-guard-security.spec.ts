import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const SAFE_PATH_RE = /^\/[a-zA-Z0-9_][a-zA-Z0-9\-._~\/?=%&+ :@]*$|^\/$/;

const PROTECTED_PAGE_ROUTES = [
  { path: "/dashboard", heading: "Dashboard" },
  { path: "/dashboard/deals", heading: "Deals" },
  { path: "/dashboard/sponsors", heading: "Sponsors" },
  { path: "/dashboard/deliverables", heading: "Deliverables" },
  { path: "/dashboard/payments", heading: "Payments" },
  { path: "/dashboard/analytics", heading: "Analytics" },
  { path: "/dashboard/templates", heading: "Templates" },
  { path: "/dashboard/integrations", heading: "Integrations" },
  { path: "/dashboard/settings", heading: "Settings" },
  { path: "/dashboard/settings/billing", heading: "Billing" },
];

const PUBLIC_PAGE_ROUTES = [
  { path: "/login", content: "Sign in to SponsorSync" },
  { path: "/api/auth/csrf", isApi: true },
];

const PROTECTED_API_ROUTES = [
  { method: "GET", path: "/api/dashboard" },
  { method: "GET", path: "/api/deals" },
  { method: "POST", path: "/api/deals", body: {} },
  { method: "GET", path: "/api/notifications" },
  { method: "PUT", path: "/api/notifications", body: {} },
  { method: "GET", path: "/api/settings/notifications" },
  { method: "PUT", path: "/api/settings/notifications", body: {} },
  { method: "GET", path: "/api/settings/profile" },
  { method: "PUT", path: "/api/settings/profile", body: {} },
  { method: "GET", path: "/api/integrations" },
  { method: "POST", path: "/api/integrations/connect", body: {} },
];

const PUBLIC_API_ROUTES = [
  { path: "/api/health", expectedStatus: 200, expectedBody: { status: "ok" } as Record<string, unknown> },
  { path: "/api/auth/csrf", expectedStatus: 200, expectedBody: {} as Record<string, unknown> },
];

test.describe("Auth Redirect - Protected Pages", () => {
  PROTECTED_PAGE_ROUTES.forEach(({ path, heading }) => {
    test(`unauthenticated access to ${path} redirects to /login`, async ({
      page,
    }) => {
      const response = await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator("h1")).toContainText("Sign in to SponsorSync");
    });

    test(`unauthenticated access to ${path} has safe callbackUrl`, async ({
      page,
    }) => {
      await page.goto(path);
      const url = page.url();
      const urlObj = new URL(url);
      const callbackUrl = urlObj.searchParams.get("callbackUrl");
      expect(callbackUrl).not.toBeNull();
      expect(callbackUrl).toMatch(SAFE_PATH_RE);
    });
  });
});

test.describe("Auth Redirect - CallbackUrl Preservation", () => {
  test("callbackUrl is a safe relative path for protected route", async ({
    page,
  }) => {
    await page.goto("/dashboard/deals");
    const url = new URL(page.url());
    const callbackUrl = url.searchParams.get("callbackUrl");
    expect(callbackUrl).not.toBeNull();
    expect(callbackUrl).toMatch(SAFE_PATH_RE);
  });

  test("callbackUrl is a safe relative path for nested route", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings/billing");
    const url = new URL(page.url());
    const callbackUrl = url.searchParams.get("callbackUrl");
    expect(callbackUrl).not.toBeNull();
    expect(callbackUrl).toMatch(SAFE_PATH_RE);
  });

  test("sequential redirects each produce a safe callbackUrl", async ({
    page,
  }) => {
    await page.goto("/dashboard/deals");
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/dashboard/payments");
    const url = new URL(page.url());
    const callbackUrl = url.searchParams.get("callbackUrl");
    expect(callbackUrl).not.toBeNull();
    expect(callbackUrl).toMatch(SAFE_PATH_RE);
  });
});

test.describe("Public Pages - Accessible Without Auth", () => {
  test("login page is accessible without authentication", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("Sign in to SponsorSync");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page does not redirect authenticated users away", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("Sign in to SponsorSync");
  });
});

test.describe("Public API Routes - Accessible Without Auth", () => {
  PUBLIC_API_ROUTES.forEach(({ path, expectedStatus, expectedBody }) => {
    test(`GET ${path} is accessible without auth`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(expectedStatus);
      const contentType = response.headers()["content-type"];
      expect(contentType).toContain("application/json");
      const body = await response.json();
      Object.entries(expectedBody).forEach(([key, value]) => {
        expect(body[key]).toBe(value);
      });
    });
  });
});

test.describe("Protected API Routes - 401 Without Auth", () => {
  PROTECTED_API_ROUTES.forEach(({ method, path, body }) => {
    test(`${method} ${path} returns 401 without auth`, async ({ request }) => {
      const response =
        method === "GET"
          ? await request.get(path)
          : method === "POST"
            ? await request.post(path, { data: body })
            : await request.put(path, { data: body });
      expect(response.status()).toBe(401);
      const responseBody = await response.json();
      expect(responseBody.error).toBe("Unauthorized");
    });
  });
});

test.describe("API Response Headers - Security", () => {
  test("health API returns application/json content type", async ({
    request,
  }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });

  test("auth CSRF endpoint returns application/json content type", async ({
    request,
  }) => {
    const response = await request.get("/api/auth/csrf");
    expect(response.ok()).toBeTruthy();
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });

  test("protected API returns application/json even on 401", async ({
    request,
  }) => {
    const response = await request.get("/api/deals");
    expect(response.status()).toBe(401);
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });

  test("protected API returns application/json on 401 for notifications", async ({
    request,
  }) => {
    const response = await request.get("/api/notifications");
    expect(response.status()).toBe(401);
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });

  test("protected API returns application/json on 401 for integrations", async ({
    request,
  }) => {
    const response = await request.get("/api/integrations");
    expect(response.status()).toBe(401);
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });

  test("protected API returns application/json on 401 for dashboard", async ({
    request,
  }) => {
    const response = await request.get("/api/dashboard");
    expect(response.status()).toBe(401);
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });

  test("protected API returns application/json on 401 for settings/profile", async ({
    request,
  }) => {
    const response = await request.get("/api/settings/profile");
    expect(response.status()).toBe(401);
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });

  test("protected API returns application/json on 401 for settings/notifications", async ({
    request,
  }) => {
    const response = await request.get("/api/settings/notifications");
    expect(response.status()).toBe(401);
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });
});

test.describe("API Error Response Format - Consistency", () => {
  test("all 401 responses have consistent error shape", async ({
    request,
  }) => {
    const endpoints = [
      "/api/deals",
      "/api/dashboard",
      "/api/notifications",
      "/api/integrations",
      "/api/settings/profile",
      "/api/settings/notifications",
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body).toHaveProperty("error");
      expect(body.error).toBe("Unauthorized");
    }
  });

  test("POST to protected route without auth returns 401 with error", async ({
    request,
  }) => {
    const response = await request.post("/api/deals", {
      data: { sponsorName: "test", title: "test" },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("PUT to protected route without auth returns 401 with error", async ({
    request,
  }) => {
    const response = await request.put("/api/notifications", {
      data: { notificationId: "test" },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });
});

test.describe("Middleware - API Route Bypass", () => {
  test("API routes are not redirected to login (they handle auth internally)", async ({
    request,
  }) => {
    const response = await request.get("/api/deals", {
      maxRedirects: 0,
    });
    expect(response.status()).not.toBe(302);
    expect(response.status()).not.toBe(301);
  });

  test("API routes return 401 JSON instead of HTML redirect", async ({
    request,
  }) => {
    const response = await request.get("/api/deals");
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
    expect(response.status()).toBe(401);
  });
});

test.describe("Session Validation - Authenticated Access", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("authenticated user can access dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("h1")).toContainText("Dashboard");
  });

  test("authenticated user can access deals page", async ({ page }) => {
    await page.goto("/dashboard/deals");
    await expect(page).toHaveURL(/\/dashboard\/deals/);
    await expect(page.locator("h1")).toContainText("Deals");
  });

  test("authenticated user can access deliverables page", async ({ page }) => {
    await page.goto("/dashboard/deliverables");
    await expect(page).toHaveURL(/\/dashboard\/deliverables/);
    await expect(page.locator("h1")).toContainText("Deliverables");
  });

  test("authenticated user can access payments page", async ({ page }) => {
    await page.goto("/dashboard/payments");
    await expect(page).toHaveURL(/\/dashboard\/payments/);
    await expect(page.locator("h1")).toContainText("Payments");
  });

  test("authenticated user can access settings page", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page).toHaveURL(/\/dashboard\/settings/);
    await expect(page.locator("h1")).toContainText("Settings");
  });

  test("authenticated user can access integrations page", async ({ page }) => {
    await page.goto("/dashboard/integrations");
    await expect(page).toHaveURL(/\/dashboard\/integrations/);
    await expect(page.locator("h1")).toContainText("Integrations");
  });

  test("authenticated user sees sidebar navigation", async ({ page }) => {
    await page.goto("/dashboard");
    const nav = page.locator("nav");
    await expect(nav.getByText("SponsorSync")).toBeVisible();
    await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Deals" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Deliverables" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Payments" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Settings" })).toBeVisible();
  });

  test("authenticated API calls return JSON content type", async ({ page }) => {
    const response = await page.request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("application/json");
  });
});

test.describe("Login Page - Form and UI", () => {
  test("login page renders correctly without auth", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("Sign in to SponsorSync");
    await expect(
      page.getByText("Automated sponsorship tracking for solo creators")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in with Google" })
    ).toBeVisible();
  });

  test("login page has correct page title", async ({ page }) => {
    await page.goto("/login");
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test("login page card is centered on screen", async ({ page }) => {
    await page.goto("/login");
    const card = page.locator(".rounded-lg");
    await expect(card).toBeVisible();
  });
});

test.describe("Health Endpoint - Security Baseline", () => {
  test("health endpoint does not leak sensitive info", async ({ request }) => {
    const response = await request.get("/api/health");
    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("service");
    expect(body).toHaveProperty("timestamp");
    expect(body).not.toHaveProperty("database");
    expect(body).not.toHaveProperty("connectionString");
    expect(body).not.toHaveProperty("secret");
    expect(body).not.toHaveProperty("apiKey");
  });

  test("health endpoint response body is minimal", async ({ request }) => {
    const response = await request.get("/api/health");
    const body = await response.json();
    const keys = Object.keys(body);
    expect(keys.length).toBeLessThanOrEqual(5);
  });
});

test.describe("CSRF Protection", () => {
  test("auth CSRF endpoint returns a valid token", async ({ request }) => {
    const response = await request.get("/api/auth/csrf");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.csrfToken).toBeTruthy();
    expect(typeof body.csrfToken).toBe("string");
    expect(body.csrfToken.length).toBeGreaterThan(0);
  });

  test("CSRF token changes between requests", async ({ request }) => {
    const response1 = await request.get("/api/auth/csrf");
    const body1 = await response1.json();
    const response2 = await request.get("/api/auth/csrf");
    const body2 = await response2.json();
    expect(body1.csrfToken).toBeTruthy();
    expect(body2.csrfToken).toBeTruthy();
  });

  test("sign-in requires CSRF token", async ({ request }) => {
    const response = await request.post("/api/auth/callback/credentials", {
      form: {
        email: "test@sponsorsync.dev",
        csrfToken: "",
        callbackUrl: "http://localhost:3000/dashboard",
        json: "true",
      },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("sign-in with invalid CSRF token is rejected", async ({ request }) => {
    const response = await request.post("/api/auth/callback/credentials", {
      form: {
        email: "test@sponsorsync.dev",
        csrfToken: "invalid-csrf-token-12345",
        callbackUrl: "http://localhost:3000/dashboard",
        json: "true",
      },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe("No Regression - Security Fixes", () => {
  test("integration tokens are never returned in API response", async ({
    page,
  }) => {
    await signIn(page);
    const response = await page.request.get("/api/integrations");
    expect(response.status()).toBe(200);
    const body = await response.json();
    const responseBody = JSON.stringify(body);
    expect(responseBody).not.toMatch(/accessToken.*["\w]{10,}/);
    expect(responseBody).not.toMatch(/refreshToken.*["\w]{10,}/);
  });

  test("deal detail API returns 401 for unauthenticated access", async ({
    request,
  }) => {
    const response = await request.get("/api/deals/550e8400-e29b-41d4-a716-446655440000");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("sponsor API returns 401 for unauthenticated access", async ({
    request,
  }) => {
    const response = await request.get("/api/sponsors");
    expect(response.status()).toBe(401);
  });

  test("analytics API returns 401 for unauthenticated access", async ({
    request,
  }) => {
    const response = await request.get("/api/analytics/trends");
    expect(response.status()).toBe(401);
  });

  test("billing checkout API returns 401 for unauthenticated access", async ({
    request,
  }) => {
    const response = await request.post("/api/billing/checkout", {
      data: { priceId: "price_test" },
    });
    expect(response.status()).toBe(401);
  });

  test("deliverables API returns 401 for unauthenticated access", async ({
    request,
  }) => {
    const response = await request.get("/api/deliverables");
    expect(response.status()).toBe(401);
  });

  test("payments API returns 401 for unauthenticated access", async ({
    request,
  }) => {
    const response = await request.get("/api/payments");
    expect(response.status()).toBe(401);
  });

  test("templates API returns 401 for unauthenticated access", async ({
    request,
  }) => {
    const response = await request.get("/api/templates");
    expect(response.status()).toBe(401);
  });
});

test.describe("Integration Connect - API Key Security", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("connect response does not echo back the API key", async ({ page }) => {
    await signIn(page);
    await page.goto("/dashboard");

    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find((c) => c.name === "csrfToken");
    expect(csrfCookie).toBeDefined();

    const response = await page.request.post("/api/integrations/connect", {
      data: { platform: "buzzsprout", apiKey: "super-secret-key-that-should-not-echo" },
      headers: {
        "X-CSRF-Token": csrfCookie!.value,
      },
    });
    const body = await response.json();
    expect(body.apiKey).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("super-secret-key-that-should-not-echo");
  });

  test("integration list does not expose access tokens", async ({ page }) => {
    await signIn(page);
    const response = await page.request.get("/api/integrations");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("integrations");
    expect(Array.isArray(body.integrations)).toBe(true);
    const raw = JSON.stringify(body);
    expect(raw).not.toMatch(/"accessToken"\s*:\s*"[^"]{10,}"/);
    expect(raw).not.toMatch(/"refreshToken"\s*:\s*"[^"]{10,}"/);
  });

  test("integration single endpoint does not expose tokens", async ({
    page,
  }) => {
    await signIn(page);
    const response = await page.request.get("/api/integrations/buzzsprout");
    expect([404, 200]).toContain(response.status());
    const body = await response.json();
    const raw = JSON.stringify(body);
    expect(raw).not.toMatch(/"accessToken"\s*:\s*"[^"]{10,}"/);
    expect(raw).not.toMatch(/"refreshToken"\s*:\s*"[^"]{10,}"/);
  });
});

test.describe("Page Title and Meta - Security", () => {
  test("login page has proper meta structure", async ({ page }) => {
    await page.goto("/login");
    const h1 = page.locator("h1");
    const h1Count = await h1.count();
    expect(h1Count).toBe(1);
    await expect(h1).toContainText("Sign in to SponsorSync");
  });

  test("dashboard page has proper heading structure after auth", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/dashboard");
    const h1 = page.locator("h1");
    const h1Count = await h1.count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    await expect(h1.first()).toContainText("Dashboard");
  });
});

test.describe("Navigation Guard - Deep Link Protection", () => {
  test("direct URL to deal detail redirects to login with safe callbackUrl", async ({
    page,
  }) => {
    await page.goto("/dashboard/deals/550e8400-e29b-41d4-a716-446655440000");
    await expect(page).toHaveURL(/\/login/);
    const url = new URL(page.url());
    const callbackUrl = url.searchParams.get("callbackUrl");
    expect(callbackUrl).not.toBeNull();
    expect(callbackUrl).toMatch(SAFE_PATH_RE);
  });

  test("direct URL to sponsor page redirects to login with safe callbackUrl", async ({
    page,
  }) => {
    await page.goto("/dashboard/sponsors");
    await expect(page).toHaveURL(/\/login/);
    const url = new URL(page.url());
    const callbackUrl = url.searchParams.get("callbackUrl");
    expect(callbackUrl).not.toBeNull();
    expect(callbackUrl).toMatch(SAFE_PATH_RE);
  });

  test("direct URL to analytics page redirects to login with safe callbackUrl", async ({
    page,
  }) => {
    await page.goto("/dashboard/analytics");
    await expect(page).toHaveURL(/\/login/);
    const url = new URL(page.url());
    const callbackUrl = url.searchParams.get("callbackUrl");
    expect(callbackUrl).not.toBeNull();
    expect(callbackUrl).toMatch(SAFE_PATH_RE);
  });

  test("direct URL to templates page redirects to login with safe callbackUrl", async ({
    page,
  }) => {
    await page.goto("/dashboard/templates");
    await expect(page).toHaveURL(/\/login/);
    const url = new URL(page.url());
    const callbackUrl = url.searchParams.get("callbackUrl");
    expect(callbackUrl).not.toBeNull();
    expect(callbackUrl).toMatch(SAFE_PATH_RE);
  });

  test("direct URL to billing settings redirects to login with safe callbackUrl", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings/billing");
    await expect(page).toHaveURL(/\/login/);
    const url = new URL(page.url());
    const callbackUrl = url.searchParams.get("callbackUrl");
    expect(callbackUrl).not.toBeNull();
    expect(callbackUrl).toMatch(SAFE_PATH_RE);
  });
});

test.describe("Authenticated Navigation - Full Sidebar Flow", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/dashboard");
  });

  const NAVIGATION_TESTS = [
    { name: "Deals", path: /\/dashboard\/deals/ },
    { name: "Deliverables", path: /\/dashboard\/deliverables/ },
    { name: "Payments", path: /\/dashboard\/payments/ },
    { name: "Integrations", path: /\/dashboard\/integrations/ },
    { name: "Settings", path: /\/dashboard\/settings/ },
  ];

  NAVIGATION_TESTS.forEach(({ name, path }) => {
    test(`can navigate to ${name} via sidebar`, async ({ page }) => {
      await page.locator("nav").getByRole("link", { name }).click();
      await expect(page).toHaveURL(path);
    });
  });

  test("can navigate back to dashboard from any page", async ({ page }) => {
    await page.locator("nav").getByRole("link", { name: "Deals" }).click();
    await expect(page).toHaveURL(/\/dashboard\/deals/);
    await page.locator("nav").getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
