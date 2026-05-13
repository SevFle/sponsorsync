import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("stripe", () => {
  const mockStripe = {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
      update: vi.fn(),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  };
  return {
    default: vi.fn(() => mockStripe),
    __mockStripe: mockStripe,
  };
});

import Stripe from "stripe";
import {
  isValidPlan,
  mapStripeStatusToLocal,
  isActiveSubscriptionStatus,
} from "@/lib/stripe";

describe("Stripe utility functions", () => {
  describe("isValidPlan", () => {
    it("returns true for 'starter'", () => {
      expect(isValidPlan("starter")).toBe(true);
    });

    it("returns true for 'pro'", () => {
      expect(isValidPlan("pro")).toBe(true);
    });

    it("returns false for 'enterprise'", () => {
      expect(isValidPlan("enterprise")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidPlan("")).toBe(false);
    });
  });

  describe("mapStripeStatusToLocal", () => {
    it("maps 'active' to 'active'", () => {
      expect(mapStripeStatusToLocal("active")).toBe("active");
    });

    it("maps 'trialing' to 'trialing'", () => {
      expect(mapStripeStatusToLocal("trialing")).toBe("trialing");
    });

    it("maps 'past_due' to 'past_due'", () => {
      expect(mapStripeStatusToLocal("past_due")).toBe("past_due");
    });

    it("maps 'paused' to 'paused'", () => {
      expect(mapStripeStatusToLocal("paused")).toBe("paused");
    });

    it("maps 'canceled' to 'canceled'", () => {
      expect(mapStripeStatusToLocal("canceled")).toBe("canceled");
    });

    it("maps 'incomplete' to 'canceled'", () => {
      expect(mapStripeStatusToLocal("incomplete")).toBe("canceled");
    });

    it("maps 'incomplete_expired' to 'canceled'", () => {
      expect(mapStripeStatusToLocal("incomplete_expired")).toBe("canceled");
    });

    it("maps 'unpaid' to 'canceled'", () => {
      expect(mapStripeStatusToLocal("unpaid")).toBe("canceled");
    });

    it("maps unknown status to 'free'", () => {
      expect(mapStripeStatusToLocal("unknown_status" as Stripe.Subscription.Status)).toBe("free");
    });
  });

  describe("isActiveSubscriptionStatus", () => {
    it("returns true for 'active'", () => {
      expect(isActiveSubscriptionStatus("active")).toBe(true);
    });

    it("returns true for 'trialing'", () => {
      expect(isActiveSubscriptionStatus("trialing")).toBe(true);
    });

    it("returns false for 'past_due'", () => {
      expect(isActiveSubscriptionStatus("past_due")).toBe(false);
    });

    it("returns false for 'canceled'", () => {
      expect(isActiveSubscriptionStatus("canceled")).toBe(false);
    });

    it("returns false for 'paused'", () => {
      expect(isActiveSubscriptionStatus("paused")).toBe(false);
    });

    it("returns false for 'unpaid'", () => {
      expect(isActiveSubscriptionStatus("unpaid")).toBe(false);
    });
  });
});
