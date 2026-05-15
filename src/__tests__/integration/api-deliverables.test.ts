import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/deliverables/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/deliverables", () => ({
  getDeliverablesByUserId: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/db/queries/deals", () => ({
  getDealsByUserId: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/db/queries/sponsors", () => ({
  getSponsorsByUserId: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/deliverables/engine", () => ({
  computeDeadlineStatus: vi.fn().mockReturnValue("no_deadline"),
}));

vi.mock("@/lib/analytics", () => ({
  computeDeliverableMetrics: vi.fn().mockReturnValue({
    total: 0,
    completionRate: 0,
    onTimeRate: 0,
    overdueCount: 0,
    verifiedCount: 0,
    statusCounts: { pending: 0, in_progress: 0, submitted: 0, verified: 0, missed: 0 },
  }),
  computeStatusCounts: vi.fn().mockReturnValue({
    pending: 0, in_progress: 0, submitted: 0, verified: 0, missed: 0,
  }),
}));

import { getServerSession } from "next-auth";

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

  it("returns empty deliverables array with metrics", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deliverables).toEqual([]);
    expect(body).toHaveProperty("metrics");
    expect(body.metrics.total).toBe(0);
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

  it("handles deliverable with description", async () => {
    const deliverableData = {
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Podcast Ad Read",
      description: "60-second mid-roll ad",
    };
    const request = new Request("http://localhost:3000/api/deliverables", {
      method: "POST",
      body: JSON.stringify(deliverableData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.deliverable.description).toBe("60-second mid-roll ad");
  });
});
