import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/sponsors/route";

describe("GET /api/sponsors", () => {
  it("returns empty sponsors array", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ sponsors: [] });
  });
});

describe("POST /api/sponsors", () => {
  it("creates a sponsor and returns it with status 201", async () => {
    const sponsorData = { name: "Acme Corp", email: "sponsor@acme.com" };
    const request = new Request("http://localhost:3000/api/sponsors", {
      method: "POST",
      body: JSON.stringify(sponsorData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.sponsor).toEqual(sponsorData);
  });
});
