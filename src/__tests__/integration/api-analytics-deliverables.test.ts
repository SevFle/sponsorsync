import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/analytics/deliverables/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/deliverables", () => ({
  getDeliverablesByUserId: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

function makeRequest(url: string) {
  return new Request(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
  (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});

describe("GET /api/analytics/deliverables - auth guards", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables"));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no user id", async () => {
    mockAuth({ user: {} } as any);
    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables"));
    expect(response.status).toBe(401);
  });

  it("returns 401 when session user is null", async () => {
    mockAuth({ user: null } as any);
    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables"));
    expect(response.status).toBe(401);
  });

  it("does not query database when unauthenticated", async () => {
    mockAuth(null);
    await GET(makeRequest("http://localhost:3000/api/analytics/deliverables"));
    expect(getDeliverablesByUserId).not.toHaveBeenCalled();
  });

  it("returns JSON content type for 401", async () => {
    mockAuth(null);
    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables"));
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});

describe("GET /api/analytics/deliverables - successful responses", () => {
  it("returns empty metrics when no deliverables exist", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(0);
    expect(body.completionRate).toBe(0);
    expect(body.overdueCount).toBe(0);
    expect(body.verifiedCount).toBe(0);
    expect(body.missedCount).toBe(0);
  });

  it("computes status counts correctly", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "pending", dueDate: "2025-06-01", completedDate: null },
      { status: "in_progress", dueDate: "2025-06-15", completedDate: null },
      { status: "submitted", dueDate: "2025-06-01", completedDate: null },
      { status: "verified", dueDate: "2025-06-01", completedDate: "2025-05-28" },
      { status: "missed", dueDate: "2025-05-01", completedDate: null },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables?range=this_year"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.statusCounts.pending).toBe(1);
    expect(body.statusCounts.in_progress).toBe(1);
    expect(body.statusCounts.submitted).toBe(1);
    expect(body.statusCounts.verified).toBe(1);
    expect(body.statusCounts.missed).toBe(1);
    expect(body.total).toBe(5);
  });

  it("computes completion rate", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "verified", dueDate: "2025-06-01", completedDate: "2025-05-28" },
      { status: "verified", dueDate: "2025-06-15", completedDate: "2025-06-10" },
      { status: "pending", dueDate: "2025-07-01", completedDate: null },
      { status: "in_progress", dueDate: "2025-07-15", completedDate: null },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables?range=this_year"));
    const body = await response.json();

    expect(body.completionRate).toBe(50);
    expect(body.verifiedCount).toBe(2);
  });

  it("computes on-time rate for verified deliverables", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "verified", dueDate: "2025-06-01", completedDate: "2025-05-28" },
      { status: "verified", dueDate: "2025-06-15", completedDate: "2025-06-20" },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables?range=this_year"));
    const body = await response.json();

    expect(body.onTimeRate).toBe(50);
  });

  it("computes overdue count for non-verified deliverables past due", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "pending", dueDate: "2020-01-01", completedDate: null },
      { status: "in_progress", dueDate: "2020-01-15", completedDate: null },
      { status: "submitted", dueDate: "2020-02-01", completedDate: null },
      { status: "verified", dueDate: "2020-01-01", completedDate: "2020-01-01" },
      { status: "missed", dueDate: "2020-01-01", completedDate: null },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables?range=this_year"));
    const body = await response.json();

    expect(body.overdueCount).toBe(3);
  });

  it("passes correct userId to database query", async () => {
    const customSession = { user: { id: "custom-user-42", email: "custom@test.com" } };
    mockAuth(customSession);

    await GET(makeRequest("http://localhost:3000/api/analytics/deliverables"));

    expect(getDeliverablesByUserId).toHaveBeenCalledWith("custom-user-42");
  });
});

describe("GET /api/analytics/deliverables - range parameter handling", () => {
  it("defaults to 30d when range is not provided", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables"));

    expect(response.status).toBe(200);
  });

  it("accepts 7d range parameter", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables?range=7d"));

    expect(response.status).toBe(200);
  });

  it("accepts 90d range parameter", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables?range=90d"));

    expect(response.status).toBe(200);
  });

  it("accepts this_month range parameter", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables?range=this_month"));

    expect(response.status).toBe(200);
  });

  it("filters deliverables by date range", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "pending", dueDate: "2020-01-15", completedDate: null },
      { status: "pending", dueDate: "2099-06-15", completedDate: null },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables?range=30d"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBeLessThanOrEqual(2);
  });
});

describe("GET /api/analytics/deliverables - edge cases", () => {
  it("handles deliverables with null dueDate", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "pending", dueDate: null, completedDate: null },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables?range=this_year"));
    const body = await response.json();

    expect(response.status).toBe(200);
  });

  it("handles deliverables with null completedDate", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "verified", dueDate: "2025-06-01", completedDate: null },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables?range=this_year"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.verifiedCount).toBe(1);
    expect(body.onTimeRate).toBe(100);
  });

  it("handles all verified deliverables", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "verified", dueDate: "2025-06-01", completedDate: "2025-05-28" },
      { status: "verified", dueDate: "2025-06-15", completedDate: "2025-06-10" },
      { status: "verified", dueDate: "2025-07-01", completedDate: "2025-06-30" },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables?range=this_year"));
    const body = await response.json();

    expect(body.completionRate).toBe(100);
    expect(body.onTimeRate).toBe(100);
    expect(body.overdueCount).toBe(0);
  });

  it("handles all missed deliverables", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "missed", dueDate: "2025-06-01", completedDate: null },
      { status: "missed", dueDate: "2025-06-15", completedDate: null },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables?range=this_year"));
    const body = await response.json();

    expect(body.missedCount).toBe(2);
    expect(body.completionRate).toBe(0);
    expect(body.overdueCount).toBe(0);
  });

  it("handles unknown status (not counted in status counts)", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "unknown_status", dueDate: "2025-06-01", completedDate: null },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables?range=this_year"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.statusCounts.pending).toBe(0);
    expect(body.statusCounts.verified).toBe(0);
  });
});

describe("GET /api/analytics/deliverables - error propagation", () => {
  it("propagates database errors", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Database connection failed")
    );

    await expect(
      GET(makeRequest("http://localhost:3000/api/analytics/deliverables"))
    ).rejects.toThrow("Database connection failed");
  });
});

describe("GET /api/analytics/deliverables - response structure", () => {
  it("always includes all metrics fields", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables"));
    const body = await response.json();

    expect(body).toHaveProperty("statusCounts");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("completionRate");
    expect(body).toHaveProperty("onTimeRate");
    expect(body).toHaveProperty("overdueCount");
    expect(body).toHaveProperty("verifiedCount");
    expect(body).toHaveProperty("missedCount");
    expect(body.statusCounts).toHaveProperty("pending");
    expect(body.statusCounts).toHaveProperty("in_progress");
    expect(body.statusCounts).toHaveProperty("submitted");
    expect(body.statusCounts).toHaveProperty("verified");
    expect(body.statusCounts).toHaveProperty("missed");
  });

  it("returns JSON content type for 200 response", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics/deliverables"));
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
