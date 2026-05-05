import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/integrations/route";
import { POST as Connect } from "@/app/api/integrations/connect/route";
import { GET as GetPlatform, DELETE as Disconnect } from "@/app/api/integrations/[platform]/route";

describe("GET /api/integrations", () => {
  it("returns empty integrations array", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ integrations: [] });
  });
});

describe("POST /api/integrations/connect", () => {
  it("connects an integration and returns with status 201", async () => {
    const connectData = { platform: "buzzsprout", apiKey: "test-key" };
    const request = new Request("http://localhost:3000/api/integrations/connect", {
      method: "POST",
      body: JSON.stringify(connectData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await Connect(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.connected).toBe(true);
    expect(body.platform).toBe("buzzsprout");
    expect(body.apiKey).toBe("test-key");
  });

  it("returns the body data merged with connected flag", async () => {
    const data = { platform: "mailchimp", apiKey: "key", serverPrefix: "us1" };
    const request = new Request("http://localhost:3000/api/integrations/connect", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });

    const response = await Connect(request);
    const body = await response.json();

    expect(body).toEqual({ connected: true, ...data });
  });
});

describe("GET /api/integrations/[platform]", () => {
  it("returns platform with disconnected status", async () => {
    const response = await GetPlatform(
      new Request("http://localhost:3000/api/integrations/buzzsprout"),
      { params: { platform: "buzzsprout" } }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ platform: "buzzsprout", status: "disconnected" });
  });

  it("handles different platform names", async () => {
    const platforms = ["transistor", "convertkit", "mailchimp"];

    for (const platform of platforms) {
      const response = await GetPlatform(
        new Request(`http://localhost:3000/api/integrations/${platform}`),
        { params: { platform } }
      );
      const body = await response.json();

      expect(body.platform).toBe(platform);
      expect(body.status).toBe("disconnected");
    }
  });
});

describe("DELETE /api/integrations/[platform]", () => {
  it("returns disconnected platform with status 200", async () => {
    const response = await Disconnect(
      new Request("http://localhost:3000/api/integrations/buzzsprout", { method: "DELETE" }),
      { params: { platform: "buzzsprout" } }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.disconnected).toBe("buzzsprout");
  });
});
