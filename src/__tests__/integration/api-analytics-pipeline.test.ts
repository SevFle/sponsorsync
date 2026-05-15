import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/analytics/pipeline/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/deals", () => ({
  getDealsByUserId: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getDealsByUserId } from "@/lib/db/queries/deals";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
  (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});

describe("GET /api/analytics/pipeline - auth guards", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no user id", async () => {
    mockAuth({ user: {} } as any);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns 401 when session user is null", async () => {
    mockAuth({ user: null } as any);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("does not query database when unauthenticated", async () => {
    mockAuth(null);
    await GET();
    expect(getDealsByUserId).not.toHaveBeenCalled();
  });

  it("returns JSON content type for 401", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});

describe("GET /api/analytics/pipeline - successful responses", () => {
  it("returns empty pipeline when no deals exist", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalDeals).toBe(0);
    expect(body.totalPipelineValue).toBe(0);
    expect(body.weightedPipelineValue).toBe(0);
    expect(body.stages).toHaveLength(4);
  });

  it("computes pipeline stages from deals", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "draft", totalValue: 1000 },
      { status: "draft", totalValue: 2000 },
      { status: "active", totalValue: 5000 },
      { status: "completed", totalValue: 8000 },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalDeals).toBe(4);
    expect(body.totalPipelineValue).toBe(16000);
  });

  it("computes weighted pipeline value", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "draft", totalValue: 1000 },
      { status: "active", totalValue: 5000 },
      { status: "completed", totalValue: 8000 },
      { status: "cancelled", totalValue: 3000 },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.weightedPipelineValue).toBe(
      Math.round(1000 * 0.2 + 5000 * 0.6 + 8000 * 1.0 + 3000 * 0)
    );
  });

  it("includes all four stages in response", async () => {
    const response = await GET();
    const body = await response.json();

    const stageNames = body.stages.map((s: any) => s.stage);
    expect(stageNames).toEqual(["draft", "active", "completed", "cancelled"]);
  });

  it("computes stage percentages", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "draft", totalValue: 1000 },
      { status: "draft", totalValue: 1000 },
      { status: "active", totalValue: 5000 },
      { status: "active", totalValue: 5000 },
    ]);

    const response = await GET();
    const body = await response.json();

    const draftStage = body.stages.find((s: any) => s.stage === "draft");
    const activeStage = body.stages.find((s: any) => s.stage === "active");
    expect(draftStage.percentage).toBe(50);
    expect(activeStage.percentage).toBe(50);
  });

  it("handles deals with null totalValue as zero", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "draft", totalValue: null },
      { status: "active", totalValue: 5000 },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalPipelineValue).toBe(5000);
  });

  it("passes correct userId to database query", async () => {
    const customSession = { user: { id: "custom-user-42", email: "custom@test.com" } };
    mockAuth(customSession);

    await GET();

    expect(getDealsByUserId).toHaveBeenCalledWith("custom-user-42");
  });
});

describe("GET /api/analytics/pipeline - edge cases", () => {
  it("handles only cancelled deals", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "cancelled", totalValue: 5000 },
      { status: "cancelled", totalValue: 3000 },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.weightedPipelineValue).toBe(0);
    expect(body.totalPipelineValue).toBe(8000);
  });

  it("handles deals with zero value", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "active", totalValue: 0 },
      { status: "active", totalValue: 0 },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.totalPipelineValue).toBe(0);
    expect(body.weightedPipelineValue).toBe(0);
  });

  it("handles unknown deal statuses", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "unknown_status", totalValue: 1000 },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalDeals).toBe(1);
    expect(body.totalPipelineValue).toBe(1000);
    expect(body.weightedPipelineValue).toBe(0);
  });

  it("handles large number of deals", async () => {
    const deals = Array.from({ length: 1000 }, (_, i) => ({
      status: i % 4 === 0 ? "draft" : i % 4 === 1 ? "active" : i % 4 === 2 ? "completed" : "cancelled",
      totalValue: 1000,
    }));
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(deals);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalDeals).toBe(1000);
    expect(body.totalPipelineValue).toBe(1000000);
  });
});

describe("GET /api/analytics/pipeline - error propagation", () => {
  it("propagates database errors", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Database connection failed")
    );

    await expect(GET()).rejects.toThrow("Database connection failed");
  });
});

describe("GET /api/analytics/pipeline - response structure", () => {
  it("always includes all pipeline summary fields", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body).toHaveProperty("stages");
    expect(body).toHaveProperty("totalDeals");
    expect(body).toHaveProperty("totalPipelineValue");
    expect(body).toHaveProperty("weightedPipelineValue");
    expect(Array.isArray(body.stages)).toBe(true);
  });

  it("each stage has required fields", async () => {
    const response = await GET();
    const body = await response.json();

    for (const stage of body.stages) {
      expect(stage).toHaveProperty("stage");
      expect(stage).toHaveProperty("count");
      expect(stage).toHaveProperty("value");
      expect(stage).toHaveProperty("percentage");
    }
  });

  it("returns JSON content type for 200 response", async () => {
    const response = await GET();
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
