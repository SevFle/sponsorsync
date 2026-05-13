import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/stripe", () => ({
  createCheckoutSession: vi.fn(),
  createOrRetrieveCustomer: vi.fn(),
  isValidPlan: vi.fn((id: string) => id === "starter" || id === "pro"),
  PLANS: {
    starter: { name: "Starter", priceId: "price_starter", amount: 1900 },
    pro: { name: "Pro", priceId: "price_pro", amount: 4900 },
  },
}));

vi.mock("@/lib/db/queries/billing", () => ({
  getUserWithBilling: vi.fn(),
  updateStripeCustomerId: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { POST } from "@/app/api/billing/checkout/route";
import { createCheckoutSession, createOrRetrieveCustomer } from "@/lib/stripe";
import { getUserWithBilling, updateStripeCustomerId } from "@/lib/db/queries/billing";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

beforeEach(() => {
  vi.clearAllMocks();
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
});

describe("POST /api/billing/checkout", () => {
  it("returns 401 when not authenticated", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const request = new Request("http://localhost:3000/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ planId: "starter" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new Request("http://localhost:3000/api/billing/checkout", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 422 for invalid plan ID", async () => {
    const request = new Request("http://localhost:3000/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ planId: "enterprise" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toContain("Invalid plan");
  });

  it("returns 422 when planId is missing", async () => {
    const request = new Request("http://localhost:3000/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(422);
  });

  it("returns 404 when user not found", async () => {
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ planId: "starter" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  it("creates checkout session and returns URL", async () => {
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      stripeCustomerId: null,
    });
    (createOrRetrieveCustomer as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "cus_new",
    });
    (createCheckoutSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      url: "https://checkout.stripe.com/test",
    });

    const request = new Request("http://localhost:3000/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ planId: "starter" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.url).toBe("https://checkout.stripe.com/test");
    expect(createOrRetrieveCustomer).toHaveBeenCalledWith({
      userId: "user-1",
      email: "test@test.com",
      existingCustomerId: null,
    });
    expect(updateStripeCustomerId).toHaveBeenCalledWith("user-1", "cus_new");
  });

  it("reuses existing stripe customer ID", async () => {
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      stripeCustomerId: "cus_existing",
    });
    (createOrRetrieveCustomer as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "cus_existing",
    });
    (createCheckoutSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      url: "https://checkout.stripe.com/test",
    });

    const request = new Request("http://localhost:3000/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ planId: "pro" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(updateStripeCustomerId).not.toHaveBeenCalled();
    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "cus_existing" })
    );
  });

  it("returns 500 when Stripe API fails", async () => {
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      stripeCustomerId: null,
    });
    (createOrRetrieveCustomer as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Stripe API error")
    );

    const request = new Request("http://localhost:3000/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ planId: "starter" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to create checkout session");
  });
});
