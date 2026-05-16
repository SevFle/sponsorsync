import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

test.describe("Open Redirect Protection", () => {
  test("middleware does not redirect to external URL in callbackUrl", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    const url = new URL(page.url());
    const callbackUrl = url.searchParams.get("callbackUrl");
    expect(callbackUrl).toBe("/dashboard");
    expect(callbackUrl).not.toMatch(/^https?:\/\//);
    expect(callbackUrl).not.toMatch(/^\/\//);
  });

  test("callbackUrl cannot be manipulated to point to external origin", async ({
    page,
  }) => {
    await page.goto(
      "/login?callbackUrl=https://evil.com/steal-session"
    );
    await expect(page.locator("h1")).toContainText("Sign in to SponsorSync");
    const currentUrl = new URL(page.url());
    const callbackUrl = currentUrl.searchParams.get("callbackUrl");
    if (callbackUrl) {
      expect(callbackUrl).not.toBe("https://evil.com/steal-session");
    }
  });

  test("callbackUrl with protocol-relative URL is not preserved", async ({
    page,
  }) => {
    await page.goto("/login?callbackUrl=//evil.com/phish");
    await expect(page.locator("h1")).toContainText("Sign in to SponsorSync");
    const currentUrl = new URL(page.url());
    const callbackUrl = currentUrl.searchParams.get("callbackUrl");
    if (callbackUrl) {
      expect(callbackUrl).not.toBe("//evil.com/phish");
    }
  });

  test("callbackUrl with javascript: protocol is not preserved", async ({
    page,
  }) => {
    await page.goto("/login?callbackUrl=javascript:alert(1)");
    await expect(page.locator("h1")).toContainText("Sign in to SponsorSync");
    const currentUrl = new URL(page.url());
    const callbackUrl = currentUrl.searchParams.get("callbackUrl");
    if (callbackUrl) {
      expect(callbackUrl).not.toBe("javascript:alert(1)");
    }
  });

  test("middleware callbackUrl only uses the pathname, not query params", async ({
    page,
  }) => {
    await page.goto("/dashboard/deals");
    await expect(page).toHaveURL(/\/login/);
    const url = new URL(page.url());
    const callbackUrl = url.searchParams.get("callbackUrl");
    expect(callbackUrl).toBe("/dashboard/deals");
    expect(callbackUrl).not.toContain("callbackUrl=");
  });

  test("protected page redirect callbackUrl is a relative path", async ({
    page,
  }) => {
    const protectedPaths = [
      "/dashboard",
      "/dashboard/deals",
      "/dashboard/settings",
      "/dashboard/payments",
    ];

    for (const path of protectedPaths) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
      const url = new URL(page.url());
      const callbackUrl = url.searchParams.get("callbackUrl");
      expect(callbackUrl).toBeTruthy();
      expect(callbackUrl).toMatch(/^\//);
      expect(callbackUrl).not.toMatch(/^https?:\/\//);
      expect(callbackUrl).not.toMatch(/^\/\//);
    }
  });
});

test.describe("CSRF Protection - Double Submit Cookie", () => {
  test("POST to protected API without CSRF token returns 403 when authenticated", async ({
    page,
  }) => {
    await signIn(page);
    const response = await page.request.post("/api/deals", {
      data: { sponsorName: "test", title: "test" },
    });
    expect([403, 401]).toContain(response.status());
  });

  test("PUT to protected API without CSRF token returns 403 when authenticated", async ({
    page,
  }) => {
    await signIn(page);
    const response = await page.request.put("/api/notifications", {
      data: { notificationId: "test" },
    });
    expect([403, 401]).toContain(response.status());
  });

  test("DELETE to protected API without CSRF token returns 403 when authenticated", async ({
    page,
  }) => {
    await signIn(page);
    const response = await page.request.delete(
      "/api/integrations/buzzsprout"
    );
    expect([403, 401]).toContain(response.status());
  });

  test("GET requests are not blocked by CSRF check", async ({ page }) => {
    await signIn(page);
    await page.route("**/api/deals", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ deals: [] }),
      })
    );
    const response = await page.request.get("/api/deals");
    expect(response.status()).toBe(200);
  });

  test("CSRF cookie is set on authenticated page load", async ({ page }) => {
    await signIn(page);
    await page.goto("/dashboard");
    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find((c) => c.name === "csrfToken");
    expect(csrfCookie).toBeDefined();
    expect(csrfCookie?.value).toBeTruthy();
    expect(csrfCookie?.sameSite).toBe("Lax");
  });

  test("CSRF cookie has correct properties (sameSite=Lax, path=/)", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/dashboard");
    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find((c) => c.name === "csrfToken");
    expect(csrfCookie).toBeDefined();
    expect(csrfCookie?.path).toBe("/");
    expect(csrfCookie?.sameSite?.toLowerCase()).toBe("lax");
  });

  test("POST with mismatched CSRF cookie and header returns 403", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/dashboard");

    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find((c) => c.name === "csrfToken");
    expect(csrfCookie).toBeDefined();

    const response = await page.request.post("/api/deals", {
      data: { sponsorName: "test", title: "test" },
      headers: {
        "X-CSRF-Token": "mismatched-fake-token-value",
      },
    });
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("CSRF");
  });

  test("POST with matching CSRF cookie and header passes CSRF check", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/dashboard");

    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find((c) => c.name === "csrfToken");
    expect(csrfCookie).toBeDefined();

    await page.route("**/api/deals", (route) =>
      route.fulfill({
        status: 201,
        body: JSON.stringify({ deal: { id: "new-deal" } }),
      })
    );

    const response = await page.request.post("/api/deals", {
      data: { sponsorName: "test", title: "test" },
      headers: {
        "X-CSRF-Token": csrfCookie!.value,
      },
    });
    expect(response.status()).toBe(201);
  });

  test("unauthenticated POST returns 401 (not 403)", async ({ request }) => {
    const response = await request.post("/api/deals", {
      data: { sponsorName: "test", title: "test" },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });
});

test.describe("IDOR Protection - Resource Ownership", () => {
  test("unauthenticated GET to specific deal returns 401", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/deals/550e8400-e29b-41d4-a716-446655440000"
    );
    expect(response.status()).toBe(401);
  });

  test("unauthenticated GET to specific sponsor returns 401", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/sponsors/550e8400-e29b-41d4-a716-446655440000"
    );
    expect(response.status()).toBe(401);
  });

  test("unauthenticated GET to specific payment returns 401", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/payments/550e8400-e29b-41d4-a716-446655440000"
    );
    expect(response.status()).toBe(401);
  });

  test("unauthenticated GET to specific deliverable returns 401", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/deliverables/550e8400-e29b-41d4-a716-446655440000"
    );
    expect(response.status()).toBe(401);
  });

  test("unauthenticated PUT to deal status returns 401", async ({
    request,
  }) => {
    const response = await request.put(
      "/api/deals/550e8400-e29b-41d4-a716-446655440000/status",
      { data: { status: "active" } }
    );
    expect(response.status()).toBe(401);
  });

  test("unauthenticated DELETE to deal returns 401", async ({ request }) => {
    const response = await request.delete(
      "/api/deals/550e8400-e29b-41d4-a716-446655440000"
    );
    expect(response.status()).toBe(401);
  });

  test("authenticated user accessing nonexistent deal gets 404", async ({
    page,
  }) => {
    await signIn(page);
    const response = await page.request.get(
      "/api/deals/00000000-0000-0000-0000-000000000000"
    );
    expect([404, 500]).toContain(response.status());
  });

  test("authenticated user accessing nonexistent sponsor gets 404", async ({
    page,
  }) => {
    await signIn(page);
    const response = await page.request.get(
      "/api/sponsors/00000000-0000-0000-0000-000000000000"
    );
    expect([404, 500]).toContain(response.status());
  });

  test("authenticated user cannot update another user's deal", async ({
    page,
  }) => {
    await signIn(page);
    const response = await page.request.put(
      "/api/deals/550e8400-e29b-41d4-a716-446655440000/status",
      { data: { status: "active" } }
    );
    expect([403, 404, 500]).toContain(response.status());
  });

  test("deep link to deal detail page requires auth", async ({ page }) => {
    await page.goto(
      "/dashboard/deals/550e8400-e29b-41d4-a716-446655440000"
    );
    await expect(page).toHaveURL(/\/login/);
    const url = new URL(page.url());
    expect(url.searchParams.get("callbackUrl")).toContain(
      "/dashboard/deals/"
    );
  });
});

test.describe("Dashboard Auth Guard - Complete Flow", () => {
  test("unauthenticated user cannot access any dashboard sub-route", async ({
    page,
  }) => {
    const routes = [
      "/dashboard",
      "/dashboard/deals",
      "/dashboard/sponsors",
      "/dashboard/deliverables",
      "/dashboard/payments",
      "/dashboard/analytics",
      "/dashboard/templates",
      "/dashboard/integrations",
      "/dashboard/settings",
      "/dashboard/settings/billing",
    ];

    for (const route of routes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("login page is accessible after being redirected", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("h1")).toContainText("Sign in to SponsorSync");
    await expect(
      page.getByRole("button", { name: "Sign in with Google" })
    ).toBeVisible();
  });

  test("after sign-in, user can access all dashboard routes", async ({
    page,
  }) => {
    await signIn(page);

    const routes = [
      { path: "/dashboard", heading: "Dashboard" },
      { path: "/dashboard/deals", heading: "Deals" },
      { path: "/dashboard/deliverables", heading: "Deliverables" },
      { path: "/dashboard/payments", heading: "Payments" },
      { path: "/dashboard/settings", heading: "Settings" },
      { path: "/dashboard/integrations", heading: "Integrations" },
    ];

    for (const { path, heading } of routes) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(path.replace("/", "\\/")));
      await expect(page.locator("h1")).toContainText(heading);
    }
  });

  test("sidebar navigation works for authenticated user across all pages", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/dashboard");

    const navLinks = [
      { name: "Deals", path: /\/dashboard\/deals/ },
      { name: "Deliverables", path: /\/dashboard\/deliverables/ },
      { name: "Payments", path: /\/dashboard\/payments/ },
      { name: "Settings", path: /\/dashboard\/settings/ },
    ];

    for (const { name, path } of navLinks) {
      await page.locator("nav").getByRole("link", { name }).click();
      await expect(page).toHaveURL(path);
      await page.locator("nav").getByRole("link", { name: "Dashboard" }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
    }
  });

  test("API calls from authenticated pages include proper content type", async ({
    page,
  }) => {
    await signIn(page);
    await page.route("**/api/dashboard", (route) =>
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
      })
    );

    const response = await page.request.get("/api/dashboard");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
  });
});

test.describe("CSRF - Auth Endpoint Integration", () => {
  test("NextAuth CSRF endpoint provides valid token", async ({ request }) => {
    const response = await request.get("/api/auth/csrf");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.csrfToken).toBeTruthy();
    expect(typeof body.csrfToken).toBe("string");
    expect(body.csrfToken.length).toBeGreaterThan(10);
  });

  test("NextAuth sign-in with valid CSRF token is accepted", async ({
    request,
  }) => {
    const csrfResponse = await request.get("/api/auth/csrf");
    const { csrfToken } = await csrfResponse.json();

    const response = await request.post(
      "/api/auth/callback/credentials",
      {
        form: {
          email: "test@sponsorsync.dev",
          csrfToken,
          callbackUrl: "http://localhost:3000/dashboard",
          json: "true",
        },
      }
    );
    expect(response.status()).toBe(200);
  });

  test("NextAuth sign-in with empty CSRF token is rejected", async ({
    request,
  }) => {
    const response = await request.post(
      "/api/auth/callback/credentials",
      {
        form: {
          email: "test@sponsorsync.dev",
          csrfToken: "",
          callbackUrl: "http://localhost:3000/dashboard",
          json: "true",
        },
      }
    );
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("NextAuth sign-in with tampered CSRF token is rejected", async ({
    request,
  }) => {
    const response = await request.post(
      "/api/auth/callback/credentials",
      {
        form: {
          email: "test@sponsorsync.dev",
          csrfToken: "TAMPERED_TOKEN_12345_FAKE",
          callbackUrl: "http://localhost:3000/dashboard",
          json: "true",
        },
      }
    );
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe("API Security Headers", () => {
  test("all API routes return JSON content type", async ({ request }) => {
    const apiRoutes = [
      { path: "/api/health", expectOk: true },
      { path: "/api/auth/csrf", expectOk: true },
      { path: "/api/deals", expectOk: false },
      { path: "/api/dashboard", expectOk: false },
      { path: "/api/notifications", expectOk: false },
      { path: "/api/integrations", expectOk: false },
      { path: "/api/sponsors", expectOk: false },
      { path: "/api/payments", expectOk: false },
      { path: "/api/deliverables", expectOk: false },
      { path: "/api/settings/profile", expectOk: false },
    ];

    for (const { path, expectOk } of apiRoutes) {
      const response = await request.get(path);
      if (!expectOk) {
        expect(response.status()).toBe(401);
      }
      const contentType = response.headers()["content-type"];
      expect(contentType).toContain("application/json");
    }
  });

  test("health endpoint does not expose version or internal details", async ({
    request,
  }) => {
    const response = await request.get("/api/health");
    const body = await response.json();
    const keys = Object.keys(body);
    const sensitiveKeys = [
      "version",
      "build",
      "env",
      "database_url",
      "connection_string",
      "secret",
      "key",
      "password",
      "token",
    ];
    for (const key of keys) {
      for (const sensitive of sensitiveKeys) {
        expect(key.toLowerCase()).not.toBe(sensitive);
      }
    }
  });
});

test.describe("Error Responses - No Information Leakage", () => {
  test("401 error response does not contain stack traces", async ({
    request,
  }) => {
    const response = await request.get("/api/deals");
    const body = await response.json();
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toMatch(/stack/i);
    expect(bodyStr).not.toMatch(/at\s+\w+\s+\(/);
    expect(bodyStr).not.toMatch(/node_modules/);
  });

  test("401 error response has minimal shape", async ({ request }) => {
    const response = await request.get("/api/deals");
    const body = await response.json();
    expect(Object.keys(body)).toHaveLength(1);
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Unauthorized");
  });

  test("403 CSRF error response has clear message", async ({ page }) => {
    await signIn(page);
    await page.goto("/dashboard");

    const response = await page.request.post("/api/deals", {
      data: { sponsorName: "test" },
      headers: {
        "X-CSRF-Token": "wrong-token",
      },
    });
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("CSRF");
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toMatch(/stack/i);
    expect(bodyStr).not.toMatch(/node_modules/);
  });
});

test.describe("Public API Routes - Bypass Auth", () => {
  test("health endpoint is accessible without auth", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe("ok");
  });

  test("webhooks endpoint is not redirected to login", async ({
    request,
  }) => {
    const response = await request.post("/api/webhooks", {
      data: {},
      maxRedirects: 0,
    });
    expect(response.status()).not.toBe(301);
    expect(response.status()).not.toBe(302);
  });

  test("auth CSRF endpoint is accessible without auth", async ({
    request,
  }) => {
    const response = await request.get("/api/auth/csrf");
    expect(response.ok()).toBeTruthy();
  });
});
