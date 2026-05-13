import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/stripe", () => ({
  createBillingPortalSession: vi.fn(),
}));

vi.mock("@/lib/db/queries/billing", () => ({
  getUserWithBilling: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { POST } from "@/app/api/billing/portal/route";
import { createBillingPortalSession } from "@/lib/stripe";
import { getUserWithBilling } from "@/lib/db/queries/billing";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

beforeEach(() => {
  vi.clearAllMocks();
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
});

describe("POST /api/billing/portal", () => {
  it("returns 401 when not authenticated", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const response = await POST();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 404 when user not found", async () => {
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const response = await POST();
    expect(response.status).toBe(404);
  });

  it("returns 400 when user has no stripe customer ID", async () => {
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      stripeCustomerId: null,
    });
    const response = await POST();
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("No billing account");
  });

  it("creates portal session and returns URL", async () => {
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      stripeCustomerId: "cus_123",
    });
    (createBillingPortalSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      url: "https://billing.stripe.com/portal",
    });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.url).toBe("https://billing.stripe.com/portal");
    expect(createBillingPortalSession).toHaveBeenCalledWith({
      customerId: "cus_123",
    });
  });

  it("returns 500 when Stripe API fails", async () => {
    (getUserWithBilling as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      stripeCustomerId: "cus_123",
    });
    (createBillingPortalSession as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Stripe error")
    );

    const response = await POST();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to create billing portal session");
  });
});
