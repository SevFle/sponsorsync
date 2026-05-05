import { describe, it, expect } from "vitest";
import { POST as StripeWebhook } from "@/app/api/webhooks/stripe/route";
import { POST as InngestWebhook } from "@/app/api/webhooks/inngest/route";

describe("POST /api/webhooks/stripe", () => {
  it("returns received true", async () => {
    const payload = { type: "payment_intent.succeeded", data: { id: "pi_123" } };
    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await StripeWebhook(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ received: true });
  });

  it("returns received regardless of payload content", async () => {
    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await StripeWebhook(request);
    const body = await response.json();

    expect(body.received).toBe(true);
  });
});

describe("POST /api/webhooks/inngest", () => {
  it("returns received true with echoed body", async () => {
    const payload = { event: "test/event", data: { key: "value" } };
    const request = new Request("http://localhost:3000/api/webhooks/inngest", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await InngestWebhook(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.received).toBe(true);
    expect(body.event).toBe("test/event");
    expect(body.data).toEqual({ key: "value" });
  });

  it("echoes the entire payload alongside received flag", async () => {
    const payload = { foo: "bar", nested: { a: 1 } };
    const request = new Request("http://localhost:3000/api/webhooks/inngest", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await InngestWebhook(request);
    const body = await response.json();

    expect(body).toEqual({ received: true, foo: "bar", nested: { a: 1 } });
  });
});
