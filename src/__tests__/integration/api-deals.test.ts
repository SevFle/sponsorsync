import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/deals/route";

describe("GET /api/deals", () => {
  it("returns empty deals array", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ deals: [] });
  });
});

describe("POST /api/deals", () => {
  it("creates a deal and returns it with status 201", async () => {
    const dealData = {
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
      title: "New Deal",
      totalValue: 5000,
    };
    const request = new Request("http://localhost:3000/api/deals", {
      method: "POST",
      body: JSON.stringify(dealData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.deal).toEqual(dealData);
  });

  it("handles empty body gracefully", async () => {
    const request = new Request("http://localhost:3000/api/deals", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.deal).toEqual({});
  });

  it("handles complex deal data", async () => {
    const dealData = {
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Complex Deal",
      description: "A complex sponsorship deal",
      totalValue: 10000,
      currency: "USD",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    };
    const request = new Request("http://localhost:3000/api/deals", {
      method: "POST",
      body: JSON.stringify(dealData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.deal).toEqual(dealData);
  });
});
