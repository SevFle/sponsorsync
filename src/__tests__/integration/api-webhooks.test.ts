import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/stripe", () => ({
  constructWebhookEvent: vi.fn(),
  mapStripeStatusToLocal: vi.fn((s: string) => s === "active" ? "active" : "free"),
}));

vi.mock("@/lib/db/queries/billing", () => ({
  getUserByStripeCustomerId: vi.fn(),
  updateSubscriptionStatus: vi.fn(),
  getUserByStripeSubscriptionId: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Map()),
}));

vi.mock("inngest/next", () => ({
  serve: vi.fn(() => ({
    GET: vi.fn(),
    POST: vi.fn(async (request: Request) => {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
    PUT: vi.fn(),
  })),
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: { id: "sponsorsync" },
  deadlineReminderFunction: {},
  deliverableVerificationFunction: {},
  paymentFollowUpFunction: {},
  statusTransitionFunction: {},
}));

import { POST as StripeWebhook } from "@/app/api/webhooks/stripe/route";
import { constructWebhookEvent } from "@/lib/stripe";
import { headers } from "next/headers";
import { POST as InngestWebhook } from "@/app/api/webhooks/inngest/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/webhooks/stripe", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    const payload = { type: "payment_intent.succeeded", data: { id: "pi_123" } };
    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await StripeWebhook(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Missing stripe-signature header");
  });

  it("returns 401 when webhook signature verification fails", async () => {
    vi.mocked(headers).mockResolvedValueOnce(
      new Map([["stripe-signature", "invalid_signature"]]) as unknown as Awaited<ReturnType<typeof headers>>
    );
    vi.mocked(constructWebhookEvent).mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const payload = { type: "test", data: {} };
    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "invalid_signature",
      },
    });

    const response = await StripeWebhook(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid signature");
  });

  it("returns 200 with received true for valid webhook events", async () => {
    vi.mocked(headers).mockResolvedValueOnce(
      new Map([["stripe-signature", "valid_sig"]]) as unknown as Awaited<ReturnType<typeof headers>>
    );
    vi.mocked(constructWebhookEvent).mockReturnValue({
      type: "product.created",
      data: { object: {} as any },
    } as any);

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify({ type: "product.created", data: {} }),
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "valid_sig",
      },
    });

    const response = await StripeWebhook(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ received: true });
  });

  it("returns received regardless of payload content when event is unhandled", async () => {
    vi.mocked(headers).mockResolvedValueOnce(
      new Map([["stripe-signature", "test_sig"]]) as unknown as Awaited<ReturnType<typeof headers>>
    );
    vi.mocked(constructWebhookEvent).mockReturnValue({
      type: "account.updated",
      data: { object: {} as any },
    } as any);

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "test_sig",
      },
    });

    const response = await StripeWebhook(request);
    const body = await response.json();

    expect(body.received).toBe(true);
  });
});

describe("POST /api/webhooks/inngest", () => {
  it("delegates to inngest serve handler", async () => {
    const payload = { event: "test/event", data: { key: "value" } };
    const request = new NextRequest("http://localhost:3000/api/webhooks/inngest", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await InngestWebhook(request, undefined as unknown);
    expect(response.status).toBe(200);
  });

  it("returns JSON response from serve", async () => {
    const request = new NextRequest("http://localhost:3000/api/webhooks/inngest", {
      method: "POST",
      body: JSON.stringify({ test: true }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await InngestWebhook(request, undefined as unknown);
    const body = await response.json();
    expect(body).toBeDefined();
  });
});
