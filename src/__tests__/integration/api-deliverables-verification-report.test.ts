import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/deliverables/verification-report/route";

const { mockSelect, mockFrom, mockInnerJoin, mockWhere } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockFrom = vi.fn();
  const mockInnerJoin = vi.fn();
  const mockWhere = vi.fn();
  return { mockSelect, mockFrom, mockInnerJoin, mockWhere };
});

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db", () => ({
  db: { select: mockSelect },
}));

vi.mock("@/lib/db/schema", () => ({
  deliverables: {
    id: "id",
    dealId: "dealId",
    title: "title",
    description: "description",
    status: "status",
    dueDate: "dueDate",
    completedDate: "completedDate",
    verificationData: "verificationData",
    notes: "notes",
  },
  deals: {
    id: "id",
    title: "title",
    userId: "userId",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col, val) => val),
}));

import { getServerSession } from "next-auth";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);

  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ innerJoin: mockInnerJoin });
  mockInnerJoin.mockReturnValue({ where: mockWhere });
});

describe("GET /api/deliverables/verification-report", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns verification result for authenticated user with deliverables", async () => {
    mockWhere.mockResolvedValue([
      {
        id: "d-1",
        dealId: "deal-1",
        dealTitle: "Test Deal",
        title: "Podcast Ad Read",
        description: null,
        status: "pending",
        dueDate: null,
        completedDate: null,
        verificationData: null,
        notes: null,
      },
    ]);

    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.totalChecked).toBe(1);
    expect(body.reports).toHaveLength(1);
    expect(body.reports[0].deliverableId).toBe("d-1");
    expect(body.reports[0].dealTitle).toBe("Test Deal");
  });

  it("returns zero counts for user with no deliverables", async () => {
    mockWhere.mockResolvedValue([]);

    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.totalChecked).toBe(0);
    expect(body.passed).toBe(0);
    expect(body.failed).toBe(0);
    expect(body.pending).toBe(0);
    expect(body.overdueAlerts).toBe(0);
    expect(body.reports).toHaveLength(0);
    expect(body.errors).toHaveLength(0);
  });

  it("returns multiple deliverable types in reports", async () => {
    mockWhere.mockResolvedValue([
      {
        id: "d-1",
        dealId: "deal-1",
        dealTitle: "Deal A",
        title: "Podcast Ad Read",
        description: null,
        status: "verified",
        dueDate: "2099-01-01",
        completedDate: null,
        verificationData: null,
        notes: null,
      },
      {
        id: "d-2",
        dealId: "deal-2",
        dealTitle: "Deal B",
        title: "Link Placement",
        description: null,
        status: "pending",
        dueDate: null,
        completedDate: null,
        verificationData: null,
        notes: null,
      },
      {
        id: "d-3",
        dealId: "deal-3",
        dealTitle: "Deal C",
        title: "Social Mention Post",
        description: null,
        status: "in_progress",
        dueDate: null,
        completedDate: null,
        verificationData: null,
        notes: null,
      },
    ]);

    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.totalChecked).toBe(3);
    expect(body.reports).toHaveLength(3);

    const types = body.reports.map((r: any) => r.deliverableType);
    expect(types).toContain("ad_read");
    expect(types).toContain("link_placement");
    expect(types).toContain("social_mention");
  });

  it("handles null verificationData gracefully", async () => {
    mockWhere.mockResolvedValue([
      {
        id: "d-1",
        dealId: "deal-1",
        dealTitle: "Deal",
        title: "Ad Read",
        description: null,
        status: "pending",
        dueDate: null,
        completedDate: null,
        verificationData: null,
        notes: null,
      },
    ]);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.reports[0].overallStatus).toBeDefined();
  });

  it("handles verificationData as object", async () => {
    mockWhere.mockResolvedValue([
      {
        id: "d-1",
        dealId: "deal-1",
        dealTitle: "Deal",
        title: "Ad Read",
        description: null,
        status: "verified",
        dueDate: "2099-01-01",
        completedDate: null,
        verificationData: { episodePublished: true, episodeUrl: "https://pod.com/ep1" },
        notes: null,
      },
    ]);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.reports[0].overallStatus).toBe("pass");
  });

  it("handles mixed passed/failed/pending deliverables", async () => {
    mockWhere.mockResolvedValue([
      {
        id: "d-1",
        dealId: "deal-1",
        dealTitle: "Good Deal",
        title: "Ad Read",
        description: null,
        status: "verified",
        dueDate: "2099-01-01",
        completedDate: null,
        verificationData: null,
        notes: null,
      },
      {
        id: "d-2",
        dealId: "deal-2",
        dealTitle: "Bad Deal",
        title: "Ad Read",
        description: null,
        status: "in_progress",
        dueDate: null,
        completedDate: null,
        verificationData: { adDurationSeconds: 10, requiredDurationSeconds: 30, sponsorMentioned: false },
        notes: null,
      },
    ]);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalChecked).toBe(2);
    expect(body.passed).toBe(1);
    expect(body.failed).toBe(1);
  });
});
