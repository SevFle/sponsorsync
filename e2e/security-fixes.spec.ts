import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const SAFE_PATH_RE = /^\/[a-zA-Z0-9_][a-zA-Z0-9\-._~\/?=%&+ :@]*$|^\/$/;

function getCallbackUrl(pageUrl: string): string | null {
  return new URL(pageUrl).searchParams.get("callbackUrl");
}

test.describe("Open Redirect Protection", () => {
  test("middleware redirect to /login includes safe callbackUrl", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    const callbackUrl = getCallbackUrl(page.url());
    expect(callbackUrl).toMatch(SAFE_PATH_RE);
    expect(callbackUrl).toBe("/dashboard");
  });

  test("callbackUrl is stripped when it points to external origin", async ({
    page,
  }) => {
    await page.goto("/login?callbackUrl=https://evil.com/steal-session");
    await expect(page.locator("h1")).toContainText("Sign in to SponsorSync");
    const callbackUrl = getCallbackUrl(page.url());
    expect(callbackUrl === null || SAFE_PATH_RE.test(callbackUrl!)).toBe(true);
    expect(callbackUrl).toBeNull();
  });

  test("callbackUrl is stripped for protocol-relative URL", async ({
    page,
  }) => {
    await page.goto("/login?callbackUrl=//evil.com/phish");
    await expect(page.locator("h1")).toContainText("Sign in to SponsorSync");
    const callbackUrl = getCallbackUrl(page.url());
    expect(callbackUrl === null || SAFE_PATH_RE.test(callbackUrl!)).toBe(true);
    expect(callbackUrl).toBeNull();
  });

  test("callbackUrl is stripped for javascript: protocol", async ({
    page,
  }) => {
    await page.goto("/login?callbackUrl=javascript:alert(1)");
    await expect(page.locator("h1")).toContainText("Sign in to SponsorSync");
    const callbackUrl = getCallbackUrl(page.url());
    expect(callbackUrl === null || SAFE_PATH_RE.test(callbackUrl!)).toBe(true);
    expect(callbackUrl).toBeNull();
  });

  test("middleware uses pathname only for callbackUrl", async ({
    page,
  }) => {
    await page.goto("/dashboard/deals");
    await expect(page).toHaveURL(/\/login/);
    const callbackUrl = getCallbackUrl(page.url());
    expect(callbackUrl).toBe("/dashboard/deals");
    expect(callbackUrl).toMatch(SAFE_PATH_RE);
  });

  test("all protected page redirects produce a safe relative callbackUrl", async ({
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
      const callbackUrl = getCallbackUrl(page.url());
      expect(callbackUrl).toMatch(SAFE_PATH_RE);
    }
  });

  test("data: scheme callbackUrl is stripped", async ({ page }) => {
    await page.goto("/login?callbackUrl=data:text/html,<script>alert(1)</script>");
    await expect(page.locator("h1")).toContainText("Sign in to SponsorSync");
    const callbackUrl = getCallbackUrl(page.url());
    expect(callbackUrl === null || SAFE_PATH_RE.test(callbackUrl!)).toBe(true);
    expect(callbackUrl).toBeNull();
  });

  test("ftp: scheme callbackUrl is stripped", async ({ page }) => {
    await page.goto("/login?callbackUrl=ftp://evil.com/file");
    await expect(page.locator("h1")).toContainText("Sign in to SponsorSync");
    const callbackUrl = getCallbackUrl(page.url());
    expect(callbackUrl === null || SAFE_PATH_RE.test(callbackUrl!)).toBe(true);
    expect(callbackUrl).toBeNull();
  });

  test("triple-slash callbackUrl is stripped", async ({ page }) => {
    await page.goto("/login?callbackUrl=///evil.com");
    await expect(page.locator("h1")).toContainText("Sign in to SponsorSync");
    const callbackUrl = getCallbackUrl(page.url());
    expect(callbackUrl === null || SAFE_PATH_RE.test(callbackUrl!)).toBe(true);
    expect(callbackUrl).toBeNull();
  });

  test("uppercase HTTPS callbackUrl is stripped", async ({ page }) => {
    await page.goto("/login?callbackUrl=HTTPS://EVIL.COM");
    await expect(page.locator("h1")).toContainText("Sign in to SponsorSync");
    const callbackUrl = getCallbackUrl(page.url());
    expect(callbackUrl === null || SAFE_PATH_RE.test(callbackUrl!)).toBe(true);
    expect(callbackUrl).toBeNull();
  });
});

test.describe("CSRF Protection - Double Submit Cookie (real server)", () => {
  test("POST to protected API without CSRF token returns 403", async ({
    page,
  }) => {
    await signIn(page);
    const response = await page.request.post("/api/deals", {
      data: { sponsorName: "test", title: "test" },
    });
    expect(response.status()).toBe(403);
  });

  test("PUT to protected API without CSRF token returns 403", async ({
    page,
  }) => {
    await signIn(page);
    const response = await page.request.put("/api/notifications", {
      data: { notificationId: "test" },
    });
    expect(response.status()).toBe(403);
  });

  test("DELETE to protected API without CSRF token returns 403", async ({
    page,
  }) => {
    await signIn(page);
    const response = await page.request.delete(
      "/api/integrations/buzzsprout"
    );
    expect(response.status()).toBe(403);
  });

  test("GET requests are not blocked by CSRF check", async ({ page }) => {
    await signIn(page);
    const response = await page.request.get("/api/deals");
    expect(response.status()).toBe(200);
  });

  test("CSRF cookie is set on authenticated page load with safe attributes", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/dashboard");
    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find((c) => c.name === "csrfToken");
    expect(csrfCookie).toBeDefined();
    expect(csrfCookie!.value).toMatch(/^[0-9a-f]{64}$/);
    expect(csrfCookie!.sameSite).toBe("Lax");
    expect(csrfCookie!.path).toBe("/");
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

  test("POST with matching CSRF cookie and header passes", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/dashboard");

    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find((c) => c.name === "csrfToken");
    expect(csrfCookie).toBeDefined();

    const response = await page.request.post("/api/deals", {
      data: {
        sponsorId: "550e8400-e29b-41d4-a716-446655440000",
        title: "CSRF Test Deal",
      },
      headers: {
        "X-CSRF-Token": csrfCookie!.value,
      },
    });
    expect(response.status()).toBe(201);
  });

  test("unauthenticated POST returns 401 with Unauthorized error", async ({
    request,
  }) => {
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

  test("authenticated user accessing nonexistent deal gets 404 or 500", async ({
    page,
  }) => {
    await signIn(page);
    const response = await page.request.get(
      "/api/deals/00000000-0000-0000-0000-000000000000"
    );
    expect([404, 500]).toContain(response.status());
  });

  test("authenticated user accessing nonexistent sponsor gets 404 or 500", async ({
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

  test("deep link to deal detail redirects to /login with safe callbackUrl", async ({
    page,
  }) => {
    await page.goto(
      "/dashboard/deals/550e8400-e29b-41d4-a716-446655440000"
    );
    await expect(page).toHaveURL(/\/login/);
    const callbackUrl = getCallbackUrl(page.url());
    expect(callbackUrl).toMatch(SAFE_PATH_RE);
    expect(callbackUrl).toContain("/dashboard/deals/");
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
      const callbackUrl = getCallbackUrl(page.url());
      expect(callbackUrl).toMatch(SAFE_PATH_RE);
    }
  });

  test("login page is accessible after redirect", async ({ page }) => {
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

  test("sidebar navigation works for authenticated user", async ({
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

  test("API calls from authenticated pages return JSON", async ({
    page,
  }) => {
    await signIn(page);

    const response = await page.request.get("/api/dashboard");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
  });
});

test.describe("CSRF - Auth Endpoint Integration (real server)", () => {
  test("NextAuth CSRF endpoint provides a valid token", async ({
    request,
  }) => {
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
  test("public API routes return 200 with JSON content type", async ({
    request,
  }) => {
    const publicRoutes = ["/api/health", "/api/auth/csrf"];

    for (const path of publicRoutes) {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain(
        "application/json"
      );
    }
  });

  test("protected API routes return 401 with JSON content type", async ({
    request,
  }) => {
    const protectedRoutes = [
      "/api/deals",
      "/api/dashboard",
      "/api/notifications",
      "/api/integrations",
      "/api/sponsors",
      "/api/payments",
      "/api/deliverables",
      "/api/settings/profile",
    ];

    for (const path of protectedRoutes) {
      const response = await request.get(path);
      expect(response.status()).toBe(401);
      expect(response.headers()["content-type"]).toContain(
        "application/json"
      );
    }
  });

  test("health endpoint returns safe shape without sensitive keys", async ({
    request,
  }) => {
    const response = await request.get("/api/health");
    const body = await response.json();
    expect(body.status).toBe("ok");
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
    const keys = Object.keys(body);
    for (const key of keys) {
      for (const sensitive of sensitiveKeys) {
        expect(key.toLowerCase()).not.toBe(sensitive);
      }
    }
  });
});

test.describe("Error Responses - No Information Leakage", () => {
  test("401 response has minimal shape with only error field", async ({
    request,
  }) => {
    const response = await request.get("/api/deals");
    const body = await response.json();
    expect(Object.keys(body)).toHaveLength(1);
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Unauthorized");
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).toMatch(/^\{"error":"[^"]+"\}$/);
  });

  test("403 CSRF response has clear message and no stack traces", async ({
    page,
  }) => {
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
    expect(bodyStr).toMatch(/^\{"error":"[^"]+"\}$/);
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
    expect(response.status()).not.toBe(307);
  });

  test("auth CSRF endpoint is accessible without auth", async ({
    request,
  }) => {
    const response = await request.get("/api/auth/csrf");
    expect(response.ok()).toBeTruthy();
  });
});
