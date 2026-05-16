import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(async ({ req }: { req: any }) => {
    const sessionToken =
      req.cookies.get("next-auth.session-token")?.value ??
      req.cookies.get("__Secure-next-auth.session-token")?.value;
    if (!sessionToken) return null;
    return { id: "user-1" };
  }),
}));

import { middleware } from "@/middleware";

function createMockRequest(
  pathname: string,
  options?: {
    cookies?: Record<string, string>;
    method?: string;
    headers?: Record<string, string>;
  }
) {
  const cookies = new Map<string, { name: string; value: string }>();
  if (options?.cookies) {
    for (const [name, value] of Object.entries(options.cookies)) {
      cookies.set(name, { name, value });
    }
  }

  const headers = new Map<string, string>();
  if (options?.headers) {
    for (const [name, value] of Object.entries(options.headers)) {
      headers.set(name, value);
    }
  }

  return {
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
    method: options?.method ?? "GET",
    cookies: {
      get: (name: string) => cookies.get(name) ?? undefined,
    },
    headers: {
      get: (name: string) => headers.get(name) ?? null,
    },
  } as any;
}

const CSRF = "test-csrf-token-1234567890";

function authenticated(
  options: { method: string; path: string; csrfMismatch?: boolean }
) {
  const cookies: Record<string, string> = {
    "next-auth.session-token": "valid-session",
    csrfToken: CSRF,
  };
  const headers: Record<string, string> = {
    "X-CSRF-Token": options.csrfMismatch ? "wrong-token" : CSRF,
  };
  return createMockRequest(options.path, { method: options.method, cookies, headers });
}

function noSession(options: { method: string; path: string }) {
  return createMockRequest(options.path, { method: options.method });
}

function sessionOnly(options: { method: string; path: string }) {
  return createMockRequest(options.path, {
    method: options.method,
    cookies: { "next-auth.session-token": "valid-session" },
  });
}

function csrfCookieOnly(options: { method: string; path: string }) {
  return createMockRequest(options.path, {
    method: options.method,
    cookies: {
      "next-auth.session-token": "valid-session",
      csrfToken: CSRF,
    },
  });
}

function csrfHeaderOnly(options: { method: string; path: string }) {
  return createMockRequest(options.path, {
    method: options.method,
    cookies: { "next-auth.session-token": "valid-session" },
    headers: { "X-CSRF-Token": CSRF },
  });
}

const mutatingRoutes = [
  { method: "POST", path: "/api/deals" },
  { method: "POST", path: "/api/sponsors" },
  { method: "POST", path: "/api/templates" },
  { method: "POST", path: "/api/emails" },
  { method: "POST", path: "/api/notifications" },
  { method: "POST", path: "/api/payments" },
  { method: "POST", path: "/api/deliverables" },
  { method: "POST", path: "/api/communications" },
  { method: "PUT", path: "/api/settings" },
  { method: "PUT", path: "/api/settings/profile" },
  { method: "PUT", path: "/api/settings/notifications" },
  { method: "PUT", path: "/api/deals/deal-1" },
  { method: "PUT", path: "/api/sponsors/sponsor-1" },
  { method: "PUT", path: "/api/templates/template-1" },
  { method: "PUT", path: "/api/payments/payment-1" },
  { method: "PUT", path: "/api/deliverables/deliverable-1" },
  { method: "PATCH", path: "/api/settings" },
  { method: "PATCH", path: "/api/deals/deal-1" },
  { method: "DELETE", path: "/api/deals/deal-1" },
  { method: "DELETE", path: "/api/sponsors/sponsor-1" },
  { method: "DELETE", path: "/api/templates/template-1" },
  { method: "DELETE", path: "/api/payments/payment-1" },
  { method: "DELETE", path: "/api/deliverables/deliverable-1" },
];

const safeRoutes = [
  { method: "GET", path: "/api/deals" },
  { method: "GET", path: "/api/sponsors" },
  { method: "GET", path: "/api/settings" },
  { method: "GET", path: "/api/templates" },
  { method: "GET", path: "/api/payments" },
  { method: "GET", path: "/api/deliverables" },
  { method: "GET", path: "/api/notifications" },
  { method: "GET", path: "/api/dashboard" },
  { method: "GET", path: "/api/analytics" },
];

const publicMutatingRoutes = [
  { method: "POST", path: "/api/webhooks/stripe" },
  { method: "POST", path: "/api/webhooks/inngest" },
  { method: "POST", path: "/api/webhooks/podcast" },
  { method: "POST", path: "/api/auth/signin" },
  { method: "POST", path: "/api/auth/callback/github" },
];

describe("CSRF enforcement - all mutating API routes require CSRF token", () => {
  it.each(mutatingRoutes)(
    "blocks $method $path without session (401)",
    async ({ method, path }) => {
      const response = await middleware(noSession({ method, path }));
      expect(response.status).toBe(401);
    }
  );

  it.each(mutatingRoutes)(
    "blocks $method $path with session but no CSRF (403)",
    async ({ method, path }) => {
      const response = await middleware(sessionOnly({ method, path }));
      expect(response.status).toBe(403);
    }
  );

  it.each(mutatingRoutes)(
    "blocks $method $path with cookie token only (403)",
    async ({ method, path }) => {
      const response = await middleware(csrfCookieOnly({ method, path }));
      expect(response.status).toBe(403);
    }
  );

  it.each(mutatingRoutes)(
    "blocks $method $path with header token only (403)",
    async ({ method, path }) => {
      const response = await middleware(csrfHeaderOnly({ method, path }));
      expect(response.status).toBe(403);
    }
  );

  it.each(mutatingRoutes)(
    "blocks $method $path when tokens mismatch (403)",
    async ({ method, path }) => {
      const response = await middleware(
        authenticated({ method, path, csrfMismatch: true })
      );
      expect(response.status).toBe(403);
    }
  );

  it.each(mutatingRoutes)(
    "allows $method $path with matching CSRF tokens (200)",
    async ({ method, path }) => {
      const response = await middleware(authenticated({ method, path }));
      expect(response.status).toBe(200);
    }
  );
});

describe("CSRF enforcement - safe (GET) routes skip CSRF check", () => {
  it.each(safeRoutes)(
    "$method $path does not require CSRF token",
    async ({ method, path }) => {
      const response = await middleware(sessionOnly({ method, path }));
      expect(response.status).toBe(200);
    }
  );

  it.each(safeRoutes)(
    "$method $path requires authentication",
    async ({ method, path }) => {
      const response = await middleware(noSession({ method, path }));
      expect(response.status).toBe(401);
    }
  );
});

describe("CSRF enforcement - public mutating routes skip CSRF and auth", () => {
  it.each(publicMutatingRoutes)(
    "$method $path is public (no auth or CSRF required)",
    async ({ method, path }) => {
      const response = await middleware(createMockRequest(path, { method }));
      expect(response.status).toBe(200);
    }
  );
});

describe("CSRF enforcement - error response body", () => {
  it("returns JSON error on CSRF validation failure", async () => {
    const response = await middleware(sessionOnly({ method: "POST", path: "/api/deals" }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("CSRF token validation failed");
  });

  it("returns JSON error on auth failure", async () => {
    const response = await middleware(noSession({ method: "POST", path: "/api/deals" }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("response has JSON content type on CSRF failure", async () => {
    const response = await middleware(sessionOnly({ method: "POST", path: "/api/deals" }));
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});

describe("CSRF enforcement - nested API routes", () => {
  it("blocks POST to nested sponsor contacts route", async () => {
    const response = await middleware(
      sessionOnly({ method: "POST", path: "/api/sponsors/s1/contacts" })
    );
    expect(response.status).toBe(403);
  });

  it("blocks DELETE to nested contact route", async () => {
    const response = await middleware(
      sessionOnly({ method: "DELETE", path: "/api/sponsors/s1/contacts/c1" })
    );
    expect(response.status).toBe(403);
  });

  it("blocks POST to deliverable verification route", async () => {
    const response = await middleware(
      sessionOnly({ method: "POST", path: "/api/deliverables/verify" })
    );
    expect(response.status).toBe(403);
  });

  it("blocks POST to bulk verification route", async () => {
    const response = await middleware(
      sessionOnly({ method: "POST", path: "/api/deliverables/verify-bulk" })
    );
    expect(response.status).toBe(403);
  });

  it("blocks PATCH to deal status route", async () => {
    const response = await middleware(
      sessionOnly({ method: "PATCH", path: "/api/deals/d1/status" })
    );
    expect(response.status).toBe(403);
  });

  it("blocks POST to sponsor send route", async () => {
    const response = await middleware(
      sessionOnly({ method: "POST", path: "/api/sponsors/s1/send" })
    );
    expect(response.status).toBe(403);
  });

  it("blocks POST to template send route", async () => {
    const response = await middleware(
      sessionOnly({ method: "POST", path: "/api/templates/t1/send" })
    );
    expect(response.status).toBe(403);
  });

  it("allows POST to sponsor send with CSRF", async () => {
    const response = await middleware(
      authenticated({ method: "POST", path: "/api/sponsors/s1/send" })
    );
    expect(response.status).toBe(200);
  });

  it("allows GET to nested sponsor communications without CSRF", async () => {
    const response = await middleware(
      sessionOnly({ method: "GET", path: "/api/sponsors/s1/communications" })
    );
    expect(response.status).toBe(200);
  });
});

describe("CSRF enforcement - billing routes", () => {
  it("blocks POST to billing checkout without CSRF", async () => {
    const response = await middleware(
      sessionOnly({ method: "POST", path: "/api/billing/checkout" })
    );
    expect(response.status).toBe(403);
  });

  it("blocks POST to billing portal without CSRF", async () => {
    const response = await middleware(
      sessionOnly({ method: "POST", path: "/api/billing/portal" })
    );
    expect(response.status).toBe(403);
  });

  it("blocks POST to billing subscription without CSRF", async () => {
    const response = await middleware(
      sessionOnly({ method: "POST", path: "/api/billing/subscription" })
    );
    expect(response.status).toBe(403);
  });

  it("allows POST to billing checkout with CSRF", async () => {
    const response = await middleware(
      authenticated({ method: "POST", path: "/api/billing/checkout" })
    );
    expect(response.status).toBe(200);
  });
});

describe("CSRF enforcement - integrations routes", () => {
  it("blocks POST to integrations without CSRF", async () => {
    const response = await middleware(
      sessionOnly({ method: "POST", path: "/api/integrations" })
    );
    expect(response.status).toBe(403);
  });

  it("blocks POST to integrations connect without CSRF", async () => {
    const response = await middleware(
      sessionOnly({ method: "POST", path: "/api/integrations/connect" })
    );
    expect(response.status).toBe(403);
  });

  it("blocks DELETE to platform integration without CSRF", async () => {
    const response = await middleware(
      sessionOnly({ method: "DELETE", path: "/api/integrations/podcast" })
    );
    expect(response.status).toBe(403);
  });

  it("allows GET to integrations without CSRF", async () => {
    const response = await middleware(
      sessionOnly({ method: "GET", path: "/api/integrations" })
    );
    expect(response.status).toBe(200);
  });
});

describe("CSRF enforcement - ical public route", () => {
  it("allows GET to ical token route without auth", async () => {
    const response = await middleware(
      createMockRequest("/api/ical/some-token", { method: "GET" })
    );
    expect(response.status).toBe(200);
  });
});
