import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockCheckoutSessionsCreate,
  mockBillingPortalSessionsCreate,
  mockCustomersCreate,
  mockCustomersRetrieve,
  mockSubscriptionsRetrieve,
  mockSubscriptionsUpdate,
  mockWebhooksConstructEvent,
} = vi.hoisted(() => ({
  mockCheckoutSessionsCreate: vi.fn(),
  mockBillingPortalSessionsCreate: vi.fn(),
  mockCustomersCreate: vi.fn(),
  mockCustomersRetrieve: vi.fn(),
  mockSubscriptionsRetrieve: vi.fn(),
  mockSubscriptionsUpdate: vi.fn(),
  mockWebhooksConstructEvent: vi.fn(),
}));

vi.mock("@/lib/config", () => ({
  config: {
    app: { name: "SponsorSync", url: "http://localhost:3000" },
    stripe: {
      secretKey: "sk_test_123",
      publishableKey: "pk_test_123",
      webhookSecret: "whsec_test",
      starterPriceId: "price_starter",
      proPriceId: "price_pro",
    },
  },
}));

vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: { sessions: { create: mockCheckoutSessionsCreate } },
      billingPortal: { sessions: { create: mockBillingPortalSessionsCreate } },
      customers: { create: mockCustomersCreate, retrieve: mockCustomersRetrieve },
      subscriptions: { retrieve: mockSubscriptionsRetrieve, update: mockSubscriptionsUpdate },
      webhooks: { constructEvent: mockWebhooksConstructEvent },
    })),
  };
});

import {
  createCheckoutSession,
  createBillingPortalSession,
  createOrRetrieveCustomer,
  getSubscription,
  cancelSubscription,
  reactivateSubscription,
  constructWebhookEvent,
} from "@/lib/stripe";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createCheckoutSession", () => {
  it("creates a checkout session with correct parameters", async () => {
    mockCheckoutSessionsCreate.mockResolvedValue({
      id: "cs_test",
      url: "https://checkout.stripe.com/test",
    });

    const result = await createCheckoutSession({
      customerId: "cus_123",
      priceId: "price_starter",
      userId: "user-1",
      email: "test@test.com",
    });

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_123",
        mode: "subscription",
        line_items: [{ price: "price_starter", quantity: 1 }],
        metadata: { userId: "user-1" },
      })
    );
    expect(result.url).toBe("https://checkout.stripe.com/test");
  });

  it("includes success and cancel URLs with app url", async () => {
    mockCheckoutSessionsCreate.mockResolvedValue({ id: "cs_test", url: "url" });

    await createCheckoutSession({
      customerId: "cus_123",
      priceId: "price_pro",
      userId: "user-1",
      email: "test@test.com",
    });

    const call = mockCheckoutSessionsCreate.mock.calls[0][0];
    expect(call.success_url).toContain("http://localhost:3000");
    expect(call.success_url).toContain("/dashboard/settings/billing");
    expect(call.cancel_url).toContain("/dashboard/settings/billing");
  });
});

describe("createBillingPortalSession", () => {
  it("creates a portal session with correct customer ID", async () => {
    mockBillingPortalSessionsCreate.mockResolvedValue({
      id: "bps_test",
      url: "https://billing.stripe.com/test",
    });

    const result = await createBillingPortalSession({
      customerId: "cus_123",
    });

    expect(mockBillingPortalSessionsCreate).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "http://localhost:3000/dashboard/settings/billing",
    });
    expect(result.url).toBe("https://billing.stripe.com/test");
  });
});

describe("createOrRetrieveCustomer", () => {
  it("returns existing customer if customerId provided and not deleted", async () => {
    const existingCustomer = { id: "cus_123", deleted: false };
    mockCustomersRetrieve.mockResolvedValue(existingCustomer);

    const result = await createOrRetrieveCustomer({
      userId: "user-1",
      email: "test@test.com",
      existingCustomerId: "cus_123",
    });

    expect(result).toEqual(existingCustomer);
    expect(mockCustomersCreate).not.toHaveBeenCalled();
  });

  it("creates new customer if existing customer is deleted", async () => {
    const deletedCustomer = { id: "cus_123", deleted: true };
    mockCustomersRetrieve.mockResolvedValue(deletedCustomer);
    mockCustomersCreate.mockResolvedValue({ id: "cus_new" });

    const result = await createOrRetrieveCustomer({
      userId: "user-1",
      email: "test@test.com",
      existingCustomerId: "cus_123",
    });

    expect(mockCustomersCreate).toHaveBeenCalledWith({
      email: "test@test.com",
      metadata: { userId: "user-1" },
    });
    expect(result.id).toBe("cus_new");
  });

  it("creates new customer if no existingCustomerId provided", async () => {
    mockCustomersCreate.mockResolvedValue({ id: "cus_new" });

    const result = await createOrRetrieveCustomer({
      userId: "user-1",
      email: "test@test.com",
    });

    expect(mockCustomersCreate).toHaveBeenCalledWith({
      email: "test@test.com",
      metadata: { userId: "user-1" },
    });
    expect(result.id).toBe("cus_new");
  });
});

describe("getSubscription", () => {
  it("retrieves subscription by ID", async () => {
    const mockSub = { id: "sub_123", status: "active" };
    mockSubscriptionsRetrieve.mockResolvedValue(mockSub);

    const result = await getSubscription("sub_123");

    expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith("sub_123");
    expect(result).toEqual(mockSub);
  });
});

describe("cancelSubscription", () => {
  it("sets cancel_at_period_end to true", async () => {
    const mockSub = { id: "sub_123", cancel_at_period_end: true };
    mockSubscriptionsUpdate.mockResolvedValue(mockSub);

    const result = await cancelSubscription("sub_123");

    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith("sub_123", {
      cancel_at_period_end: true,
    });
    expect(result.cancel_at_period_end).toBe(true);
  });
});

describe("reactivateSubscription", () => {
  it("sets cancel_at_period_end to false", async () => {
    const mockSub = { id: "sub_123", cancel_at_period_end: false };
    mockSubscriptionsUpdate.mockResolvedValue(mockSub);

    const result = await reactivateSubscription("sub_123");

    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith("sub_123", {
      cancel_at_period_end: false,
    });
    expect(result.cancel_at_period_end).toBe(false);
  });
});

describe("constructWebhookEvent", () => {
  it("constructs event from payload and signature", () => {
    const mockEvent = { type: "checkout.session.completed", data: {} };
    mockWebhooksConstructEvent.mockReturnValue(mockEvent);

    const result = constructWebhookEvent("payload", "sig_123");

    expect(mockWebhooksConstructEvent).toHaveBeenCalledWith(
      "payload",
      "sig_123",
      "whsec_test"
    );
    expect(result).toEqual(mockEvent);
  });
});
