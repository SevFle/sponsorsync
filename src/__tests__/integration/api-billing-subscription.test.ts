import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/billing", () => ({
  getUserWithBilling: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { GET } from "@/app/api/billing/subscription/route";
import { getUserWithBilling } from "@/lib/db/queries/billing";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

beforeEach(() => {
  vi.clearAllMocks();
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
});

describe("GET /api/billing/subscription", () => {
  it("returns 401 when not authenticated", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns 404 when user not found", async () => {
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(404);
  });

  it("returns subscription data for user", async () => {
    const periodEnd = new Date("2025-12-31");
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      subscriptionStatus: "active",
      stripePriceId: "price_pro",
      currentPeriodStart: new Date("2025-01-01"),
      currentPeriodEnd: periodEnd,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.subscription.status).toBe("active");
    expect(body.subscription.planId).toBe("price_pro");
    expect(body.subscription.currentPeriodEnd).toEqual(periodEnd.toISOString());
  });

  it("returns free status for unsubscribed user", async () => {
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      subscriptionStatus: "free",
      stripePriceId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.subscription.status).toBe("free");
    expect(body.subscription.planId).toBeNull();
  });

  it("returns 500 when database query fails", async () => {
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error")
    );
    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to fetch subscription");
  });
});
