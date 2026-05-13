import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/stripe", () => ({
  constructWebhookEvent: vi.fn(),
  mapStripeStatusToLocal: vi.fn((status: string) => {
    const map: Record<string, string> = {
      active: "active",
      trialing: "trialing",
      past_due: "past_due",
      paused: "paused",
      canceled: "canceled",
    };
    return map[status] ?? "free";
  }),
}));

vi.mock("@/lib/db/queries/billing", () => ({
  getUserByStripeCustomerId: vi.fn(),
  updateSubscriptionStatus: vi.fn(),
  getUserByStripeSubscriptionId: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Map([["stripe-signature", "sig_123"]])),
}));

import { POST } from "@/app/api/webhooks/stripe/route";
import { constructWebhookEvent, mapStripeStatusToLocal } from "@/lib/stripe";
import {
  getUserByStripeCustomerId,
  updateSubscriptionStatus,
  getUserByStripeSubscriptionId,
} from "@/lib/db/queries/billing";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/webhooks/stripe", () => {
  function createRequest(body: string) {
    return new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body,
      headers: { "stripe-signature": "sig_123" },
    });
  }

  it("returns 400 when stripe-signature header is missing", async () => {
    const { headers: headersFn } = await import("next/headers");
    vi.mocked(headersFn).mockResolvedValueOnce(
      new Map() as unknown as Awaited<ReturnType<typeof headersFn>>
    );

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toBe("Missing stripe-signature header");
  });

  it("returns 401 when webhook signature is invalid", async () => {
    (constructWebhookEvent as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const response = await POST(createRequest("{}"));
    expect(response.status).toBe(401);
    const result = await response.json();
    expect(result.error).toBe("Invalid signature");
  });

  it("handles checkout.session.completed event", async () => {
    (constructWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { userId: "user-1" },
          subscription: "sub_123",
          customer: "cus_123",
        },
      },
    });
    (getUserByStripeCustomerId as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
    });

    const response = await POST(createRequest("{}"));
    expect(response.status).toBe(200);
    expect(updateSubscriptionStatus).toHaveBeenCalledWith("user-1", {
      stripeSubscriptionId: "sub_123",
      subscriptionStatus: "active",
    });
  });

  it("handles customer.subscription.created event", async () => {
    (constructWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue({
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_123",
          metadata: { userId: "user-1" },
          status: "active",
          current_period_start: 1700000000,
          current_period_end: 1702678400,
          items: { data: [{ price: { id: "price_starter" } }] },
        },
      },
    });
    (mapStripeStatusToLocal as ReturnType<typeof vi.fn>).mockReturnValue("active");

    const response = await POST(createRequest("{}"));
    expect(response.status).toBe(200);
    expect(updateSubscriptionStatus).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        stripeSubscriptionId: "sub_123",
        stripePriceId: "price_starter",
        subscriptionStatus: "active",
      })
    );
  });

  it("handles customer.subscription.updated event", async () => {
    (constructWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          metadata: { userId: "user-1" },
          status: "past_due",
          current_period_start: 1700000000,
          current_period_end: 1702678400,
          items: { data: [{ price: { id: "price_pro" } }] },
        },
      },
    });
    (mapStripeStatusToLocal as ReturnType<typeof vi.fn>).mockReturnValue("past_due");

    const response = await POST(createRequest("{}"));
    expect(response.status).toBe(200);
    expect(updateSubscriptionStatus).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        subscriptionStatus: "past_due",
        stripePriceId: "price_pro",
      })
    );
  });

  it("handles customer.subscription.deleted event with metadata", async () => {
    (constructWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_123",
          metadata: { userId: "user-1" },
        },
      },
    });

    const response = await POST(createRequest("{}"));
    expect(response.status).toBe(200);
    expect(updateSubscriptionStatus).toHaveBeenCalledWith("user-1", {
      stripeSubscriptionId: undefined,
      stripePriceId: undefined,
      subscriptionStatus: "free",
      currentPeriodStart: undefined,
      currentPeriodEnd: undefined,
    });
  });

  it("handles customer.subscription.deleted event without metadata by looking up subscription", async () => {
    (constructWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_123",
          metadata: {},
        },
      },
    });
    (getUserByStripeSubscriptionId as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-2",
    });

    const response = await POST(createRequest("{}"));
    expect(response.status).toBe(200);
    expect(updateSubscriptionStatus).toHaveBeenCalledWith("user-2", {
      stripeSubscriptionId: undefined,
      stripePriceId: undefined,
      subscriptionStatus: "free",
      currentPeriodStart: undefined,
      currentPeriodEnd: undefined,
    });
  });

  it("handles customer.deleted event", async () => {
    (constructWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue({
      type: "customer.deleted",
      data: {
        object: {
          id: "cus_123",
          metadata: { userId: "user-1" },
        },
      },
    });

    const response = await POST(createRequest("{}"));
    expect(response.status).toBe(200);
    expect(updateSubscriptionStatus).toHaveBeenCalledWith("user-1", {
      stripeSubscriptionId: undefined,
      stripePriceId: undefined,
      subscriptionStatus: "free",
      currentPeriodStart: undefined,
      currentPeriodEnd: undefined,
    });
  });

  it("handles invoice.payment_failed event", async () => {
    (constructWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue({
      type: "invoice.payment_failed",
      data: {
        object: {
          customer: "cus_123",
        },
      },
    });
    (getUserByStripeCustomerId as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });

    const response = await POST(createRequest("{}"));
    expect(response.status).toBe(200);
    expect(updateSubscriptionStatus).toHaveBeenCalledWith("user-1", {
      subscriptionStatus: "past_due",
    });
  });

  it("ignres unhandled event types", async () => {
    (constructWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue({
      type: "product.created",
      data: { object: {} },
    });

    const response = await POST(createRequest("{}"));
    expect(response.status).toBe(200);
    expect(updateSubscriptionStatus).not.toHaveBeenCalled();
  });

  it("returns 500 when webhook handler throws", async () => {
    (constructWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue({
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_123",
          metadata: { userId: "user-1" },
          status: "active",
          current_period_start: 1700000000,
          current_period_end: 1702678400,
          items: { data: [{ price: { id: "price_starter" } }] },
        },
      },
    });
    (updateSubscriptionStatus as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error")
    );

    const response = await POST(createRequest("{}"));
    expect(response.status).toBe(500);
  });

  it("skips subscription change when userId metadata is missing", async () => {
    (constructWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue({
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_123",
          metadata: {},
          status: "active",
          current_period_start: 1700000000,
          current_period_end: 1702678400,
          items: { data: [{ price: { id: "price_starter" } }] },
        },
      },
    });

    const response = await POST(createRequest("{}"));
    expect(response.status).toBe(200);
    expect(updateSubscriptionStatus).not.toHaveBeenCalled();
  });
});
