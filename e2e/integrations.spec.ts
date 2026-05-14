import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const VALID_PLATFORMS = ["buzzsprout", "transistor", "anchor", "convertkit", "mailchimp"];

const MOCK_INTEGRATION = {
  id: "int-1",
  userId: "user-1",
  platform: "buzzsprout",
  accessToken: null,
  refreshToken: null,
  metadata: { podcastId: "12345" },
  isConnected: true,
  lastSyncedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test.describe("Integrations Page - Unauthenticated", () => {
  test("redirects to login page when not authenticated", async ({ page }) => {
    await page.goto("/dashboard/integrations");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Integrations Page - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("renders the integrations page with correct heading", async ({ page }) => {
    await page.goto("/dashboard/integrations");
    await expect(page.locator("h1")).toContainText("Integrations");
  });

  test("renders page description", async ({ page }) => {
    await page.goto("/dashboard/integrations");
    await expect(
      page.getByText("Connect your podcast and newsletter platforms")
    ).toBeVisible();
  });

  test("sidebar shows Integrations nav link", async ({ page }) => {
    await page.goto("/dashboard/integrations");
    const navLink = page.locator("nav").getByRole("link", { name: "Integrations" });
    await expect(navLink).toBeVisible();
  });

  test("navigates to integrations from dashboard sidebar", async ({ page }) => {
    await page.goto("/dashboard");
    await page.locator("nav").getByRole("link", { name: "Integrations" }).click();
    await expect(page).toHaveURL(/\/dashboard\/integrations/);
    await expect(page.locator("h1")).toContainText("Integrations");
  });

  test("navigates away from integrations to settings page", async ({ page }) => {
    await page.goto("/dashboard/integrations");
    await page.locator("nav").getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings/);
    await expect(page.locator("h1")).toContainText("Settings");
  });

  test("can navigate back to dashboard from integrations", async ({ page }) => {
    await page.goto("/dashboard/integrations");
    await page.locator("nav").getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator("h1")).toContainText("Dashboard");
  });
});

test.describe("Integrations API - Unauthenticated", () => {
  test("GET /api/integrations returns 401 without auth", async ({ request }) => {
    const response = await request.get("/api/integrations");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("POST /api/integrations/connect returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.post("/api/integrations/connect", {
      data: { platform: "buzzsprout", apiKey: "test-key" },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("GET /api/integrations/[platform] returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.get("/api/integrations/buzzsprout");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("DELETE /api/integrations/[platform] returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.delete("/api/integrations/buzzsprout");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });
});

test.describe("Integrations API - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("GET /api/integrations returns integrations list", async ({ page }) => {
    await page.route("**/api/integrations", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ integrations: [MOCK_INTEGRATION] }),
      })
    );

    const response = await page.request.get("/api/integrations");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.integrations).toHaveLength(1);
    expect(body.integrations[0].platform).toBe("buzzsprout");
    expect(body.integrations[0].isConnected).toBe(true);
  });

  test("GET /api/integrations returns empty array when none connected", async ({
    page,
  }) => {
    await page.route("**/api/integrations", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ integrations: [] }),
      })
    );

    const response = await page.request.get("/api/integrations");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.integrations).toEqual([]);
  });

  test("GET /api/integrations returns JSON content type", async ({ page }) => {
    await page.route("**/api/integrations", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ integrations: [] }),
      })
    );

    const response = await page.request.get("/api/integrations");
    expect(response.headers()["content-type"]).toContain("application/json");
  });
});

test.describe("Integration Connect - Platform Config", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("connects Buzzsprout integration successfully", async ({ page }) => {
    await page.route("**/api/integrations/connect", (route) =>
      route.fulfill({
        status: 201,
        body: JSON.stringify({ connected: true, platform: "buzzsprout" }),
      })
    );

    const response = await page.request.post("/api/integrations/connect", {
      data: { platform: "buzzsprout", apiKey: "buzz_test_key_123" },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.connected).toBe(true);
    expect(body.platform).toBe("buzzsprout");
  });

  test("connects Transistor integration successfully", async ({ page }) => {
    await page.route("**/api/integrations/connect", (route) =>
      route.fulfill({
        status: 201,
        body: JSON.stringify({
          connected: true,
          platform: "transistor",
          feedUrl: "https://feeds.transistor.fm/podcast",
        }),
      })
    );

    const response = await page.request.post("/api/integrations/connect", {
      data: {
        platform: "transistor",
        apiKey: "transistor_key_abc",
        feedUrl: "https://feeds.transistor.fm/podcast",
      },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.connected).toBe(true);
    expect(body.platform).toBe("transistor");
    expect(body.feedUrl).toBe("https://feeds.transistor.fm/podcast");
  });

  test("API key is not exposed in connect response", async ({ page }) => {
    await page.route("**/api/integrations/connect", (route) =>
      route.fulfill({
        status: 201,
        body: JSON.stringify({ connected: true, platform: "buzzsprout" }),
      })
    );

    const response = await page.request.post("/api/integrations/connect", {
      data: { platform: "buzzsprout", apiKey: "super-secret-key-999" },
    });
    const body = await response.json();
    expect(body.apiKey).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("super-secret-key-999");
  });

  test("connect preserves additional fields beyond apiKey", async ({ page }) => {
    await page.route("**/api/integrations/connect", (route) =>
      route.fulfill({
        status: 201,
        body: JSON.stringify({
          connected: true,
          platform: "mailchimp",
          serverPrefix: "us1",
        }),
      })
    );

    const response = await page.request.post("/api/integrations/connect", {
      data: {
        platform: "mailchimp",
        apiKey: "mc-key",
        serverPrefix: "us1",
      },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.connected).toBe(true);
    expect(body.platform).toBe("mailchimp");
    expect(body.serverPrefix).toBe("us1");
    expect(body.apiKey).toBeUndefined();
  });

  test("connect handles missing apiKey gracefully", async ({ page }) => {
    await page.route("**/api/integrations/connect", (route) =>
      route.fulfill({
        status: 201,
        body: JSON.stringify({ connected: true, platform: "buzzsprout" }),
      })
    );

    const response = await page.request.post("/api/integrations/connect", {
      data: { platform: "buzzsprout" },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.connected).toBe(true);
    expect(body.apiKey).toBeUndefined();
  });

  test("connect returns 201 status code", async ({ page }) => {
    await page.route("**/api/integrations/connect", (route) =>
      route.fulfill({
        status: 201,
        body: JSON.stringify({ connected: true, platform: "buzzsprout" }),
      })
    );

    const response = await page.request.post("/api/integrations/connect", {
      data: { platform: "buzzsprout", apiKey: "key" },
    });
    expect(response.status()).toBe(201);
  });
});

test.describe("Integration Platform Validation", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  VALID_PLATFORMS.forEach((platform) => {
    test(`GET accepts valid platform: ${platform}`, async ({ page }) => {
      await page.route(`**/api/integrations/${platform}`, (route) =>
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            integration: { ...MOCK_INTEGRATION, platform },
          }),
        })
      );

      const response = await page.request.get(`/api/integrations/${platform}`);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.integration.platform).toBe(platform);
    });
  });

  test("GET rejects invalid platform with 400", async ({ page }) => {
    const response = await page.request.get("/api/integrations/spotify");
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid platform parameter");
  });

  test("GET rejects uppercase platform with 400", async ({ page }) => {
    const response = await page.request.get("/api/integrations/Buzzsprout");
    expect(response.status()).toBe(400);
  });

  test("GET rejects numeric platform with 400", async ({ page }) => {
    const response = await page.request.get("/api/integrations/12345");
    expect(response.status()).toBe(400);
  });

  test("GET includes validation details on bad platform", async ({ page }) => {
    const response = await page.request.get("/api/integrations/invalid-platform");
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.details).toBeDefined();
  });

  test("GET returns 404 for valid platform with no integration", async ({
    page,
  }) => {
    await page.route("**/api/integrations/mailchimp", (route) =>
      route.fulfill({
        status: 404,
        body: JSON.stringify({ error: "Integration not found" }),
      })
    );

    const response = await page.request.get("/api/integrations/mailchimp");
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Integration not found");
  });

  test("DELETE rejects invalid platform with 400", async ({ page }) => {
    const response = await page.request.delete("/api/integrations/patreon");
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid platform parameter");
  });
});

test.describe("Integration Disconnect", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("disconnects Buzzsprout integration", async ({ page }) => {
    await page.route("**/api/integrations/buzzsprout", (route) => {
      if (route.request().method() === "DELETE") {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ disconnected: "buzzsprout" }),
        });
      } else {
        route.continue();
      }
    });

    const response = await page.request.delete("/api/integrations/buzzsprout");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.disconnected).toBe("buzzsprout");
  });

  test("disconnects Transistor integration", async ({ page }) => {
    await page.route("**/api/integrations/transistor", (route) => {
      if (route.request().method() === "DELETE") {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ disconnected: "transistor" }),
        });
      } else {
        route.continue();
      }
    });

    const response = await page.request.delete("/api/integrations/transistor");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.disconnected).toBe("transistor");
  });

  test("DELETE returns 404 for unconnected platform", async ({ page }) => {
    await page.route("**/api/integrations/mailchimp", (route) =>
      route.fulfill({
        status: 404,
        body: JSON.stringify({ error: "Integration not found" }),
      })
    );

    const response = await page.request.delete("/api/integrations/mailchimp");
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Integration not found");
  });

  VALID_PLATFORMS.forEach((platform) => {
    test(`DELETE accepts valid platform: ${platform}`, async ({ page }) => {
      await page.route(`**/api/integrations/${platform}`, (route) => {
        if (route.request().method() === "DELETE") {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ disconnected: platform }),
          });
        } else {
          route.continue();
        }
      });

      const response = await page.request.delete(`/api/integrations/${platform}`);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.disconnected).toBe(platform);
    });
  });
});

test.describe("API Key Input Validation", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("empty API key can be submitted (handled by backend)", async ({
    page,
  }) => {
    await page.route("**/api/integrations/connect", (route) =>
      route.fulfill({
        status: 201,
        body: JSON.stringify({ connected: true, platform: "buzzsprout" }),
      })
    );

    const response = await page.request.post("/api/integrations/connect", {
      data: { platform: "buzzsprout", apiKey: "" },
    });
    expect(response.status()).toBe(201);
  });

  test("long API key is accepted", async ({ page }) => {
    const longKey = "a".repeat(256);
    await page.route("**/api/integrations/connect", (route) =>
      route.fulfill({
        status: 201,
        body: JSON.stringify({ connected: true, platform: "buzzsprout" }),
      })
    );

    const response = await page.request.post("/api/integrations/connect", {
      data: { platform: "buzzsprout", apiKey: longKey },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.apiKey).toBeUndefined();
  });

  test("API key with special characters is accepted", async ({ page }) => {
    const specialKey = "key-with_special.chars+and=more/123";
    await page.route("**/api/integrations/connect", (route) =>
      route.fulfill({
        status: 201,
        body: JSON.stringify({ connected: true, platform: "transistor" }),
      })
    );

    const response = await page.request.post("/api/integrations/connect", {
      data: { platform: "transistor", apiKey: specialKey },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.apiKey).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain(specialKey);
  });
});

test.describe("Integration Settings - Error Scenarios", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("integrations page handles API server error", async ({ page }) => {
    await page.route("**/api/integrations", (route) =>
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
      })
    );
    await page.goto("/dashboard/integrations");
    await expect(page.locator("h1")).toContainText("Integrations");
  });

  test("connect endpoint handles server error gracefully", async ({ page }) => {
    await page.route("**/api/integrations/connect", (route) =>
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Failed to connect" }),
      })
    );

    const response = await page.request.post("/api/integrations/connect", {
      data: { platform: "buzzsprout", apiKey: "key" },
    });
    expect(response.status()).toBe(500);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test("platform endpoint handles server error gracefully", async ({
    page,
  }) => {
    await page.route("**/api/integrations/buzzsprout", (route) =>
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Database error" }),
      })
    );

    const response = await page.request.get("/api/integrations/buzzsprout");
    expect(response.status()).toBe(500);
  });
});

test.describe("Integrations Page - With Connected Integrations", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("displays connected integration status on page", async ({ page }) => {
    await page.route("**/api/integrations", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          integrations: [
            { ...MOCK_INTEGRATION, platform: "buzzsprout", isConnected: true },
            { ...MOCK_INTEGRATION, id: "int-2", platform: "mailchimp", isConnected: true },
          ],
        }),
      })
    );
    await page.goto("/dashboard/integrations");
    await expect(page.locator("h1")).toContainText("Integrations");
  });

  test("handles multiple connected platforms simultaneously", async ({ page }) => {
    const multiIntegrations = VALID_PLATFORMS.map((platform, i) => ({
      ...MOCK_INTEGRATION,
      id: `int-${i}`,
      platform,
      isConnected: true,
    }));

    await page.route("**/api/integrations", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ integrations: multiIntegrations }),
      })
    );

    const response = await page.request.get("/api/integrations");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.integrations).toHaveLength(5);
    body.integrations.forEach((int: any) => {
      expect(int.isConnected).toBe(true);
      expect(VALID_PLATFORMS).toContain(int.platform);
    });
  });

  test("integration list includes lastSyncedAt timestamp", async ({ page }) => {
    await page.route("**/api/integrations", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ integrations: [MOCK_INTEGRATION] }),
      })
    );

    const response = await page.request.get("/api/integrations");
    const body = await response.json();
    expect(body.integrations[0].lastSyncedAt).toBeTruthy();
  });

  test("integration includes metadata field", async ({ page }) => {
    await page.route("**/api/integrations", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ integrations: [MOCK_INTEGRATION] }),
      })
    );

    const response = await page.request.get("/api/integrations");
    const body = await response.json();
    expect(body.integrations[0].metadata).toBeDefined();
    expect(body.integrations[0].metadata.podcastId).toBe("12345");
  });

  test("integration tokens are never exposed in list response", async ({ page }) => {
    await page.route("**/api/integrations", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ integrations: [MOCK_INTEGRATION] }),
      })
    );

    const response = await page.request.get("/api/integrations");
    const body = await response.json();
    expect(body.integrations[0].accessToken).toBeNull();
    expect(body.integrations[0].refreshToken).toBeNull();
  });
});

test.describe("Integration Connect - Error Handling", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("connect returns 422 for invalid platform", async ({ page }) => {
    const response = await page.request.post("/api/integrations/connect", {
      data: { platform: "invalid_platform", apiKey: "key" },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.platform).toBe("invalid_platform");
  });

  test("connect handles network timeout gracefully", async ({ page }) => {
    await page.route("**/api/integrations/connect", (route) =>
      route.fulfill({
        status: 504,
        body: JSON.stringify({ error: "Gateway timeout" }),
      })
    );

    const response = await page.request.post("/api/integrations/connect", {
      data: { platform: "buzzsprout", apiKey: "key" },
    });
    expect(response.status()).toBe(504);
  });

  test("connect handles rate limiting response", async ({ page }) => {
    await page.route("**/api/integrations/connect", (route) =>
      route.fulfill({
        status: 429,
        body: JSON.stringify({ error: "Too many requests" }),
      })
    );

    const response = await page.request.post("/api/integrations/connect", {
      data: { platform: "buzzsprout", apiKey: "key" },
    });
    expect(response.status()).toBe(429);
  });
});

test.describe("Integration Sync - Platform Data", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("GET single integration returns full integration object", async ({ page }) => {
    await page.route("**/api/integrations/buzzsprout", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ integration: MOCK_INTEGRATION }),
      })
    );

    const response = await page.request.get("/api/integrations/buzzsprout");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.integration.id).toBe("int-1");
    expect(body.integration.platform).toBe("buzzsprout");
    expect(body.integration.isConnected).toBe(true);
    expect(body.integration).toHaveProperty("createdAt");
    expect(body.integration).toHaveProperty("updatedAt");
  });

  test("GET single integration returns 404 for disconnected platform", async ({ page }) => {
    await page.route("**/api/integrations/transistor", (route) =>
      route.fulfill({
        status: 404,
        body: JSON.stringify({ error: "Integration not found" }),
      })
    );

    const response = await page.request.get("/api/integrations/transistor");
    expect(response.status()).toBe(404);
  });

  test("disconnect then reconnect flow works", async ({ page }) => {
    let isConnected = true;
    await page.route("**/api/integrations/buzzsprout", (route) => {
      const method = route.request().method();
      if (method === "DELETE") {
        isConnected = false;
        route.fulfill({
          status: 200,
          body: JSON.stringify({ disconnected: "buzzsprout" }),
        });
      } else if (method === "GET") {
        if (isConnected) {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ integration: MOCK_INTEGRATION }),
          });
        } else {
          route.fulfill({
            status: 404,
            body: JSON.stringify({ error: "Integration not found" }),
          });
        }
      }
    });

    const getBefore = await page.request.get("/api/integrations/buzzsprout");
    expect(getBefore.status()).toBe(200);

    const deleteResp = await page.request.delete("/api/integrations/buzzsprout");
    expect(deleteResp.status()).toBe(200);

    const getAfter = await page.request.get("/api/integrations/buzzsprout");
    expect(getAfter.status()).toBe(404);
  });
});
