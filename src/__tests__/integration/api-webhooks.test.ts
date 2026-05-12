import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as StripeWebhook } from "@/app/api/webhooks/stripe/route";

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
}));

import { POST as InngestWebhook } from "@/app/api/webhooks/inngest/route";

describe("POST /api/webhooks/stripe", () => {
  it("returns 401 when stripe-signature header is missing", async () => {
    const payload = { type: "payment_intent.succeeded", data: { id: "pi_123" } };
    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await StripeWebhook(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Missing stripe-signature header");
  });

  it("returns 401 when stripe-signature header is invalid and STRIPE_WEBHOOK_SECRET is set", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_valid_secret";
    const payload = { type: "payment_intent.succeeded", data: { id: "pi_123" } };
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
    expect(body.error).toBe("Invalid stripe-signature");
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it("returns 200 with received true when stripe-signature is present and valid", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_valid_secret";
    const payload = { type: "payment_intent.succeeded", data: { id: "pi_123" } };
    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "whsec_valid_secret",
      },
    });

    const response = await StripeWebhook(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ received: true });
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it("returns 200 when stripe-signature is present and no secret configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const payload = { type: "payment_intent.succeeded", data: { id: "pi_123" } };
    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "any_signature",
      },
    });

    const response = await StripeWebhook(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ received: true });
  });

  it("returns received regardless of payload content when signature is valid", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
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

  it("returns 401 with empty stripe-signature header", async () => {
    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify({ type: "test" }),
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "",
      },
    });

    const response = await StripeWebhook(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Missing stripe-signature header");
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
