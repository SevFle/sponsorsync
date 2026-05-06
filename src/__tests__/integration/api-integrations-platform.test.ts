import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GET as GetPlatform,
  DELETE as Disconnect,
} from "@/app/api/integrations/[platform]/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/integrations", () => ({
  getIntegrationByPlatform: vi.fn(),
  deleteIntegration: vi.fn(),
}));

import { getServerSession } from "next-auth";
import {
  getIntegrationByPlatform,
  deleteIntegration,
} from "@/lib/db/queries/integrations";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

const validPlatforms = ["buzzsprout", "transistor", "anchor", "convertkit", "mailchimp"];

describe("GET /api/integrations/[platform]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GetPlatform(
      new Request("http://localhost:3000/api/integrations/buzzsprout"),
      { params: Promise.resolve({ platform: "buzzsprout" }) }
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid platform", async () => {
    const response = await GetPlatform(
      new Request("http://localhost:3000/api/integrations/invalid-platform"),
      { params: Promise.resolve({ platform: "invalid-platform" }) }
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid platform parameter");
  });

  it("returns 400 for empty platform", async () => {
    const response = await GetPlatform(
      new Request("http://localhost:3000/api/integrations/"),
      { params: Promise.resolve({ platform: "" }) }
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for uppercase platform", async () => {
    const response = await GetPlatform(
      new Request("http://localhost:3000/api/integrations/Buzzsprout"),
      { params: Promise.resolve({ platform: "Buzzsprout" }) }
    );
    expect(response.status).toBe(400);
  });

  it("includes validation details on bad platform", async () => {
    const response = await GetPlatform(
      new Request("http://localhost:3000/api/integrations/spotify"),
      { params: Promise.resolve({ platform: "spotify" }) }
    );
    const body = await response.json();
    expect(body.details).toBeDefined();
  });

  it("returns integration for valid platform scoped to user", async () => {
    (getIntegrationByPlatform as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "int-1",
      platform: "buzzsprout",
      isConnected: true,
      userId: "user-1",
    });
    const response = await GetPlatform(
      new Request("http://localhost:3000/api/integrations/buzzsprout"),
      { params: Promise.resolve({ platform: "buzzsprout" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.integration.platform).toBe("buzzsprout");
    expect(getIntegrationByPlatform).toHaveBeenCalledWith("buzzsprout", "user-1");
  });

  it("returns 404 when integration not found", async () => {
    (getIntegrationByPlatform as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined
    );
    const response = await GetPlatform(
      new Request("http://localhost:3000/api/integrations/mailchimp"),
      { params: Promise.resolve({ platform: "mailchimp" }) }
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Integration not found");
  });

  it("accepts all valid platform values", async () => {
    for (const platform of validPlatforms) {
      (getIntegrationByPlatform as ReturnType<typeof vi.fn>).mockResolvedValue({
        platform,
        isConnected: false,
      });
      const response = await GetPlatform(
        new Request(`http://localhost:3000/api/integrations/${platform}`),
        { params: Promise.resolve({ platform }) }
      );
      expect(response.status).toBe(200);
      expect(getIntegrationByPlatform).toHaveBeenCalledWith(platform, "user-1");
    }
  });
});

describe("DELETE /api/integrations/[platform]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await Disconnect(
      new Request("http://localhost:3000/api/integrations/buzzsprout", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ platform: "buzzsprout" }) }
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid platform", async () => {
    const response = await Disconnect(
      new Request("http://localhost:3000/api/integrations/invalid", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ platform: "invalid" }) }
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid platform parameter");
  });

  it("returns disconnected platform scoped to user", async () => {
    (deleteIntegration as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "int-1",
      platform: "buzzsprout",
    });
    const response = await Disconnect(
      new Request("http://localhost:3000/api/integrations/buzzsprout", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ platform: "buzzsprout" }) }
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.disconnected).toBe("buzzsprout");
    expect(deleteIntegration).toHaveBeenCalledWith("buzzsprout", "user-1");
  });

  it("returns 404 when integration not found", async () => {
    (deleteIntegration as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const response = await Disconnect(
      new Request("http://localhost:3000/api/integrations/mailchimp", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ platform: "mailchimp" }) }
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Integration not found");
  });

  it("accepts all valid platform values for disconnect", async () => {
    for (const platform of validPlatforms) {
      (deleteIntegration as ReturnType<typeof vi.fn>).mockResolvedValue({
        platform,
      });
      const response = await Disconnect(
        new Request(`http://localhost:3000/api/integrations/${platform}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ platform }) }
      );
      expect(response.status).toBe(200);
      expect(deleteIntegration).toHaveBeenCalledWith(platform, "user-1");
    }
  });

  it("returns 400 for numeric platform", async () => {
    const response = await Disconnect(
      new Request("http://localhost:3000/api/integrations/12345", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ platform: "12345" }) }
    );
    expect(response.status).toBe(400);
  });

  it("includes validation details on bad platform", async () => {
    const response = await Disconnect(
      new Request("http://localhost:3000/api/integrations/patreon", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ platform: "patreon" }) }
    );
    const body = await response.json();
    expect(body.details).toBeDefined();
  });
});
