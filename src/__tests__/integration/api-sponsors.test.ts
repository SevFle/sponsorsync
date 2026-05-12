import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/sponsors/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/sponsors", () => ({
  getSponsorsByUserId: vi.fn(),
  createSponsor: vi.fn(),
}));

vi.mock("@/lib/db/queries/deals", () => ({
  getDealsByUserId: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getSponsorsByUserId, createSponsor } from "@/lib/db/queries/sponsors";
import { getDealsByUserId } from "@/lib/db/queries/deals";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

const sampleSponsor = {
  id: "sponsor-1",
  userId: "user-1",
  name: "Acme Corp",
  company: "Acme Inc",
  email: "contact@acme.com",
  phone: "+1234567890",
  notes: "Premium sponsor",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const sampleDeal = {
  id: "deal-1",
  userId: "user-1",
  sponsorId: "sponsor-1",
  title: "Q2 Package",
  description: null,
  status: "active" as const,
  totalValue: 12000,
  currency: "USD",
  startDate: null,
  endDate: null,
  contractUrl: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("GET /api/sponsors", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns sponsors with deal counts", async () => {
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([sampleSponsor]);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([sampleDeal]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sponsors).toHaveLength(1);
    expect(body.sponsors[0].name).toBe("Acme Corp");
    expect(body.sponsors[0].activeDealCount).toBe(1);
    expect(body.sponsors[0].totalDealCount).toBe(1);
  });

  it("returns sponsors with zero deal counts when no deals", async () => {
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([sampleSponsor]);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sponsors[0].activeDealCount).toBe(0);
    expect(body.sponsors[0].totalDealCount).toBe(0);
  });

  it("returns empty sponsors array when user has no sponsors", async () => {
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sponsors).toEqual([]);
  });

  it("counts only active deals for activeDealCount", async () => {
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([sampleSponsor]);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...sampleDeal, status: "active" },
      { ...sampleDeal, id: "deal-2", status: "draft" },
      { ...sampleDeal, id: "deal-3", status: "completed" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.sponsors[0].activeDealCount).toBe(1);
    expect(body.sponsors[0].totalDealCount).toBe(3);
  });

  it("returns 500 when database query fails", async () => {
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to fetch sponsors");
  });
});

describe("POST /api/sponsors", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request("http://localhost:3000/api/sponsors", {
      method: "POST",
      body: JSON.stringify({ name: "Test Sponsor" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("creates a sponsor and returns it with status 201", async () => {
    const sponsorData = { name: "Acme Corp", email: "sponsor@acme.com" };
    const createdSponsor = { id: "sponsor-1", userId: "user-1", ...sponsorData };
    (createSponsor as ReturnType<typeof vi.fn>).mockResolvedValue(createdSponsor);

    const request = new Request("http://localhost:3000/api/sponsors", {
      method: "POST",
      body: JSON.stringify(sponsorData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.sponsor).toEqual(createdSponsor);
    expect(createSponsor).toHaveBeenCalledWith({
      ...sponsorData,
      userId: "user-1",
    });
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new Request("http://localhost:3000/api/sponsors", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 422 for validation failure", async () => {
    const request = new Request("http://localhost:3000/api/sponsors", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("returns 422 for invalid email", async () => {
    const request = new Request("http://localhost:3000/api/sponsors", {
      method: "POST",
      body: JSON.stringify({ name: "Test", email: "not-an-email" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(422);
  });

  it("returns 500 when database insert fails", async () => {
    (createSponsor as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const request = new Request("http://localhost:3000/api/sponsors", {
      method: "POST",
      body: JSON.stringify({ name: "Test Sponsor" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to create sponsor");
  });
});
