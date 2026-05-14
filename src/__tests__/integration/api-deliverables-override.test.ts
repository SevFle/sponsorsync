import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/deliverables/[id]/override/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockCreateVerificationLog = vi.fn().mockResolvedValue({ id: "log-1" });

vi.mock("@/lib/db", () => ({
  db: {
    select: mockSelect,
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: mockUpdate,
      }),
    }),
  },
}));

vi.mock("@/lib/db/queries/verificationLogs", () => ({
  createVerificationLog: mockCreateVerificationLog,
}));

vi.mock("@/lib/db/schema", () => ({
  deliverables: {
    id: "id", dealId: "dealId", title: "title", status: "status",
    completedDate: "completedDate", updatedAt: "updatedAt",
  },
  deals: { id: "id", title: "title", userId: "userId", sponsorId: "sponsorId" },
  verificationLogs: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col, val) => val),
  and: vi.fn((...args) => args),
}));

import { getServerSession } from "next-auth";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

function makeChain(result: any) {
  const chain: Record<string, any> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockResolvedValue(result);
  chain.limit = vi.fn().mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

describe("POST /api/deliverables/[id]/override", () => {
  const validPayload = {
    deliverableId: "550e8400-e29b-41d4-a716-446655440000",
    verified: true,
    reason: "Manually verified after listening to episode",
  };

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request("http://localhost:3000/api/deliverables/del-1/override", {
      method: "POST",
      body: JSON.stringify(validPayload),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const request = new Request("http://localhost:3000/api/deliverables/del-1/override", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 for missing reason", async () => {
    const request = new Request("http://localhost:3000/api/deliverables/del-1/override", {
      method: "POST",
      body: JSON.stringify({
        deliverableId: "550e8400-e29b-41d4-a716-446655440000",
        verified: true,
        reason: "",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid deliverableId", async () => {
    const request = new Request("http://localhost:3000/api/deliverables/del-1/override", {
      method: "POST",
      body: JSON.stringify({
        deliverableId: "not-a-uuid",
        verified: true,
        reason: "Manual override",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 404 when deliverable not found", async () => {
    mockSelect.mockReturnValue(makeChain([]));
    const request = new Request("http://localhost:3000/api/deliverables/del-1/override", {
      method: "POST",
      body: JSON.stringify(validPayload),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  it("returns 403 when deliverable belongs to another user", async () => {
    mockSelect.mockReturnValue(makeChain([{
      id: "del-1",
      dealId: "deal-1",
      title: "Ad Read",
      status: "pending",
      userId: "other-user",
    }]));
    const request = new Request("http://localhost:3000/api/deliverables/del-1/override", {
      method: "POST",
      body: JSON.stringify(validPayload),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("successfully overrides to verified", async () => {
    mockSelect.mockReturnValue(makeChain([{
      id: "del-1",
      dealId: "deal-1",
      title: "Ad Read",
      status: "pending",
      userId: "user-1",
    }]));
    mockUpdate.mockResolvedValue([{ id: "del-1" }]);

    const request = new Request("http://localhost:3000/api/deliverables/del-1/override", {
      method: "POST",
      body: JSON.stringify(validPayload),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.verified).toBe(true);
    expect(body.previousStatus).toBe("pending");
    expect(body.newStatus).toBe("verified");

    expect(mockCreateVerificationLog).toHaveBeenCalledWith(
      expect.objectContaining({
        deliverableId: "550e8400-e29b-41d4-a716-446655440000",
        action: "verification_passed",
        confidence: 1,
        metadata: expect.objectContaining({ manualOverride: true }),
      })
    );
  });

  it("successfully overrides to unverified (pending)", async () => {
    mockSelect.mockReturnValue(makeChain([{
      id: "del-1",
      dealId: "deal-1",
      title: "Ad Read",
      status: "verified",
      userId: "user-1",
    }]));
    mockUpdate.mockResolvedValue([{ id: "del-1" }]);

    const request = new Request("http://localhost:3000/api/deliverables/del-1/override", {
      method: "POST",
      body: JSON.stringify({
        ...validPayload,
        verified: false,
        reason: "False positive, sponsor not actually mentioned",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.verified).toBe(false);
    expect(body.newStatus).toBe("pending");
  });

  it("rejects reason exceeding 500 characters", async () => {
    const request = new Request("http://localhost:3000/api/deliverables/del-1/override", {
      method: "POST",
      body: JSON.stringify({
        ...validPayload,
        reason: "x".repeat(501),
      }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
