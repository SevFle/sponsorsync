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
import { hasActiveSubscription, getSubscriptionStatus, requireSubscription } from "@/lib/auth/subscription";
import { getUserWithBilling } from "@/lib/db/queries/billing";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("hasActiveSubscription", () => {
  it("returns false when user not found", async () => {
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await hasActiveSubscription("user-1");
    expect(result).toBe(false);
  });

  it("returns true for active subscription", async () => {
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue({
      subscriptionStatus: "active",
    });
    const result = await hasActiveSubscription("user-1");
    expect(result).toBe(true);
  });

  it("returns true for trialing subscription", async () => {
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue({
      subscriptionStatus: "trialing",
    });
    const result = await hasActiveSubscription("user-1");
    expect(result).toBe(true);
  });

  it("returns false for free plan", async () => {
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue({
      subscriptionStatus: "free",
    });
    const result = await hasActiveSubscription("user-1");
    expect(result).toBe(false);
  });

  it("returns false for past_due subscription", async () => {
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue({
      subscriptionStatus: "past_due",
    });
    const result = await hasActiveSubscription("user-1");
    expect(result).toBe(false);
  });

  it("returns false for canceled subscription", async () => {
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue({
      subscriptionStatus: "canceled",
    });
    const result = await hasActiveSubscription("user-1");
    expect(result).toBe(false);
  });
});

describe("getSubscriptionStatus", () => {
  it("returns null when user not found", async () => {
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await getSubscriptionStatus("user-1");
    expect(result).toBeNull();
  });

  it("returns subscription status", async () => {
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue({
      subscriptionStatus: "active",
      stripePriceId: "price_pro",
      currentPeriodEnd: new Date("2025-12-31"),
    });
    const result = await getSubscriptionStatus("user-1");
    expect(result).toEqual({
      status: "active",
      planId: "price_pro",
      currentPeriodEnd: new Date("2025-12-31"),
    });
  });
});

describe("requireSubscription", () => {
  it("returns unauthenticated when no session", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await requireSubscription();
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.reason).toBe("unauthenticated");
    }
  });

  it("returns no_subscription when user has no active subscription", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue({
      subscriptionStatus: "free",
    });
    const result = await requireSubscription();
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.reason).toBe("no_subscription");
    }
  });

  it("returns authorized with userId when user has active subscription", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue({
      subscriptionStatus: "active",
    });
    const result = await requireSubscription();
    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.userId).toBe("user-1");
    }
  });
});
