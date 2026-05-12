import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/settings/subscription/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
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

describe("GET /api/settings/subscription", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns subscription data for authenticated user", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.subscription).toBeDefined();
    expect(body.subscription.plan).toBe("free");
    expect(body.subscription.status).toBe("active");
    expect(body.subscription.currentPeriodEnd).toBeNull();
    expect(body.subscription.cancelAtPeriodEnd).toBe(false);
  });
});
