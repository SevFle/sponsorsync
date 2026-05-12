import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/deliverables/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/deliverables", () => ({
  getDeliverablesByUserId: vi.fn(),
}));

vi.mock("@/lib/db/queries/deals", () => ({
  getDealsByUserId: vi.fn(),
}));

vi.mock("@/lib/db/queries/sponsors", () => ({
  getSponsorsByUserId: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";
import { getDealsByUserId } from "@/lib/db/queries/deals";
import { getSponsorsByUserId } from "@/lib/db/queries/sponsors";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

describe("GET /api/deliverables", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no user id", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: {},
    });
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns enriched deliverables with sponsor and deal info", async () => {
    const mockDeliverables = [
      {
        id: "dl-1",
        dealId: "deal-1",
        title: "Episode 42 Ad Read",
        description: "60-second mid-roll",
        status: "pending",
        dueDate: "2025-06-15",
        completedDate: null,
        verificationData: null,
        notes: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      },
    ];
    const mockDeals = [
      {
        id: "deal-1",
        userId: "user-1",
        sponsorId: "sponsor-1",
        title: "Q2 Podcast Package",
        description: null,
        status: "active",
        totalValue: 12000,
        currency: "USD",
        startDate: null,
        endDate: "2025-06-30",
        contractUrl: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      },
    ];
    const mockSponsors = [
      {
        id: "sponsor-1",
        userId: "user-1",
        name: "Acme Corp",
        company: "Acme Inc",
        email: "sponsor@acme.com",
        phone: null,
        notes: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      },
    ];

    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockDeliverables
    );
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(mockDeals);
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSponsors
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deliverables).toHaveLength(1);
    expect(body.deliverables[0]).toEqual({
      id: "dl-1",
      dealId: "deal-1",
      title: "Episode 42 Ad Read",
      description: "60-second mid-roll",
      status: "pending",
      dueDate: "2025-06-15",
      completedDate: null,
      notes: null,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
      sponsorName: "Acme Corp",
      sponsorId: "sponsor-1",
      dealTitle: "Q2 Podcast Package",
    });
  });

  it("returns Unknown sponsor when sponsor not found", async () => {
    const mockDeliverables = [
      {
        id: "dl-1",
        dealId: "deal-1",
        title: "Test",
        description: null,
        status: "pending",
        dueDate: null,
        completedDate: null,
        verificationData: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const mockDeals = [
      {
        id: "deal-1",
        userId: "user-1",
        sponsorId: "sponsor-missing",
        title: "Some Deal",
        description: null,
        status: "active",
        totalValue: null,
        currency: "USD",
        startDate: null,
        endDate: null,
        contractUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockDeliverables
    );
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(mockDeals);
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deliverables[0].sponsorName).toBe("Unknown");
    expect(body.deliverables[0].sponsorId).toBe("");
  });

  it("returns empty deliverables array when none exist", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ deliverables: [] });
  });

  it("returns 500 when database query fails", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB connection failed")
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch deliverables");
  });

  it("handles multiple deliverables from different deals", async () => {
    const mockDeliverables = [
      {
        id: "dl-1",
        dealId: "deal-1",
        title: "Deliverable 1",
        description: null,
        status: "pending",
        dueDate: null,
        completedDate: null,
        verificationData: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "dl-2",
        dealId: "deal-2",
        title: "Deliverable 2",
        description: null,
        status: "in_progress",
        dueDate: null,
        completedDate: null,
        verificationData: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const mockDeals = [
      {
        id: "deal-1",
        userId: "user-1",
        sponsorId: "sp-1",
        title: "Deal One",
        description: null,
        status: "active",
        totalValue: null,
        currency: "USD",
        startDate: null,
        endDate: null,
        contractUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "deal-2",
        userId: "user-1",
        sponsorId: "sp-2",
        title: "Deal Two",
        description: null,
        status: "active",
        totalValue: null,
        currency: "USD",
        startDate: null,
        endDate: null,
        contractUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const mockSponsors = [
      {
        id: "sp-1",
        userId: "user-1",
        name: "Sponsor A",
        company: null,
        email: null,
        phone: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "sp-2",
        userId: "user-1",
        name: "Sponsor B",
        company: null,
        email: null,
        phone: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockDeliverables
    );
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(mockDeals);
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSponsors
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deliverables).toHaveLength(2);
    expect(body.deliverables[0].sponsorName).toBe("Sponsor A");
    expect(body.deliverables[1].sponsorName).toBe("Sponsor B");
  });
});

describe("POST /api/deliverables", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request("http://localhost:3000/api/deliverables", {
      method: "POST",
      body: JSON.stringify({ title: "Test" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("creates a deliverable and returns it with status 201", async () => {
    const deliverableData = {
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Newsletter Mention",
      dueDate: "2025-04-01",
    };
    const request = new Request("http://localhost:3000/api/deliverables", {
      method: "POST",
      body: JSON.stringify(deliverableData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.deliverable).toEqual(deliverableData);
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new Request("http://localhost:3000/api/deliverables", {
      method: "POST",
      body: "invalid json",
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 422 for validation failure", async () => {
    const request = new Request("http://localhost:3000/api/deliverables", {
      method: "POST",
      body: JSON.stringify({ title: "" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("Validation failed");
  });
});
