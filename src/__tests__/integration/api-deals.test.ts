import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/deals/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/deals", () => ({
  getDealsByUserId: vi.fn(),
}));

vi.mock("@/lib/db/queries/sponsors", () => ({
  getSponsorsByUserId: vi.fn(),
}));

vi.mock("@/lib/db/queries/deliverables", () => ({
  getDeliverablesByUserId: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getDealsByUserId } from "@/lib/db/queries/deals";
import { getSponsorsByUserId } from "@/lib/db/queries/sponsors";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
  (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});

describe("GET /api/deals", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no user", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns 401 when session user has no id", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { email: "test@test.com" },
    });
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns empty deals array for authenticated user with no deals", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deals).toEqual([]);
    expect(getDealsByUserId).toHaveBeenCalledWith("user-1");
    expect(getSponsorsByUserId).toHaveBeenCalledWith("user-1");
    expect(getDeliverablesByUserId).toHaveBeenCalledWith("user-1");
  });

  it("returns deals with sponsor names and progress", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "deal-1",
        userId: "user-1",
        sponsorId: "sponsor-1",
        title: "Q2 Podcast Package",
        description: "Big sponsorship",
        status: "active",
        totalValue: 12000,
        currency: "USD",
        startDate: null,
        endDate: "2099-06-15",
        contractUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "sponsor-1", name: "Acme Corp" },
    ]);

    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "del-1", dealId: "deal-1", status: "verified" },
      { id: "del-2", dealId: "deal-1", status: "pending" },
      { id: "del-3", dealId: "deal-1", status: "submitted" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deals).toHaveLength(1);
    expect(body.deals[0]).toEqual({
      id: "deal-1",
      sponsorName: "Acme Corp",
      title: "Q2 Podcast Package",
      description: "Big sponsorship",
      status: "active",
      totalValue: 12000,
      currency: "USD",
      endDate: "2099-06-15",
      progress: 67,
    });
  });

  it("shows Unknown sponsor when sponsor not found", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "deal-1",
        userId: "user-1",
        sponsorId: "sponsor-missing",
        title: "Orphan Deal",
        description: null,
        status: "draft",
        totalValue: null,
        currency: null,
        startDate: null,
        endDate: null,
        contractUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(body.deals[0].sponsorName).toBe("Unknown");
    expect(body.deals[0].currency).toBe("USD");
    expect(body.deals[0].progress).toBe(0);
  });

  it("calculates progress as 0 when no deliverables exist", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "deal-1",
        userId: "user-1",
        sponsorId: "sponsor-1",
        title: "No Deliverables",
        description: null,
        status: "draft",
        totalValue: 5000,
        currency: "USD",
        startDate: null,
        endDate: null,
        contractUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "sponsor-1", name: "Test Sponsor" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.deals[0].progress).toBe(0);
  });

  it("only counts verified and submitted deliverables as completed", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "deal-1",
        userId: "user-1",
        sponsorId: "sponsor-1",
        title: "Mixed Deliverables",
        description: null,
        status: "active",
        totalValue: 10000,
        currency: "USD",
        startDate: null,
        endDate: null,
        contractUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "sponsor-1", name: "Test Sponsor" },
    ]);

    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "del-1", dealId: "deal-1", status: "verified" },
      { id: "del-2", dealId: "deal-1", status: "submitted" },
      { id: "del-3", dealId: "deal-1", status: "pending" },
      { id: "del-4", dealId: "deal-1", status: "in_progress" },
      { id: "del-5", dealId: "deal-1", status: "missed" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.deals[0].progress).toBe(40);
  });

  it("isolates deliverables per deal in multi-deal response", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "deal-a",
        userId: "user-1",
        sponsorId: "sponsor-1",
        title: "Deal A",
        description: null,
        status: "active",
        totalValue: 5000,
        currency: "USD",
        startDate: null,
        endDate: null,
        contractUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "deal-b",
        userId: "user-1",
        sponsorId: "sponsor-1",
        title: "Deal B",
        description: null,
        status: "active",
        totalValue: 8000,
        currency: "USD",
        startDate: null,
        endDate: null,
        contractUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "sponsor-1", name: "Sponsor One" },
    ]);

    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "del-1", dealId: "deal-a", status: "verified" },
      { id: "del-2", dealId: "deal-a", status: "verified" },
      { id: "del-3", dealId: "deal-b", status: "pending" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.deals).toHaveLength(2);
    const dealA = body.deals.find((d: { id: string }) => d.id === "deal-a");
    const dealB = body.deals.find((d: { id: string }) => d.id === "deal-b");
    expect(dealA.progress).toBe(100);
    expect(dealB.progress).toBe(0);
  });

  it("returns 500 when database query fails", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB connection lost")
    );

    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to fetch deals");
  });

  it("returns 500 when sponsors query fails", async () => {
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB connection lost")
    );

    const response = await GET();
    expect(response.status).toBe(500);
  });

  it("returns 500 when deliverables query fails", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB connection lost")
    );

    const response = await GET();
    expect(response.status).toBe(500);
  });
});

describe("POST /api/deals", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request("http://localhost:3000/api/deals", {
      method: "POST",
      body: JSON.stringify({ title: "Test" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session user has no id", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { email: "test@test.com" },
    });
    const request = new Request("http://localhost:3000/api/deals", {
      method: "POST",
      body: JSON.stringify({ title: "Test" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 when request body is not valid JSON", async () => {
    const request = new Request("http://localhost:3000/api/deals", {
      method: "POST",
      body: "not-json{",
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 422 when body fails schema validation", async () => {
    const request = new Request("http://localhost:3000/api/deals", {
      method: "POST",
      body: JSON.stringify({ title: "Missing sponsorId" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("returns 422 when sponsorId is not a UUID", async () => {
    const request = new Request("http://localhost:3000/api/deals", {
      method: "POST",
      body: JSON.stringify({ sponsorId: "not-a-uuid", title: "Test Deal" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 422 when title is empty", async () => {
    const request = new Request("http://localhost:3000/api/deals", {
      method: "POST",
      body: JSON.stringify({
        sponsorId: "550e8400-e29b-41d4-a716-446655440000",
        title: "",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(422);
  });

  it("returns 422 when totalValue is negative", async () => {
    const request = new Request("http://localhost:3000/api/deals", {
      method: "POST",
      body: JSON.stringify({
        sponsorId: "550e8400-e29b-41d4-a716-446655440000",
        title: "Deal",
        totalValue: -500,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(422);
  });

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

  it("creates a deal with all optional fields", async () => {
    const dealData = {
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Full Deal",
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

  it("creates a deal with only required fields", async () => {
    const dealData = {
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Minimal Deal",
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
