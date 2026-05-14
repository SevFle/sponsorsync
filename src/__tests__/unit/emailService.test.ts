import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn().mockResolvedValue({ data: { id: "email-id-123" }, error: null }),
}));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

vi.mock("@/lib/config", () => ({
  config: {
    email: { resendApiKey: "test-key" },
    app: { name: "SponsorSync", url: "http://localhost:3000" },
    database: { url: "" },
    auth: { secret: "", url: "" },
    inngest: { eventKey: "", signingKey: "" },
    stripe: { secretKey: "", publishableKey: "", webhookSecret: "", starterPriceId: "", proPriceId: "" },
  },
}));

import {
  sendTemplateEmail,
  previewTemplateEmail,
  checkRateLimit,
  _resetResendClient,
} from "@/lib/email/emailService";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows first request", () => {
    const result = checkRateLimit("user-1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(49);
  });

  it("counts down remaining requests", () => {
    checkRateLimit("user-2");
    checkRateLimit("user-2");
    checkRateLimit("user-2");
    const result = checkRateLimit("user-2");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(46);
  });

  it("blocks requests after 50 in an hour", () => {
    for (let i = 0; i < 50; i++) {
      checkRateLimit("user-3");
    }
    const result = checkRateLimit("user-3");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after 1 hour window", () => {
    for (let i = 0; i < 50; i++) {
      checkRateLimit("user-4");
    }
    const blocked = checkRateLimit("user-4");
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(60 * 60 * 1000 + 1);

    const reset = checkRateLimit("user-4");
    expect(reset.allowed).toBe(true);
    expect(reset.remaining).toBe(49);
  });

  it("tracks rate limits independently per user", () => {
    for (let i = 0; i < 50; i++) {
      checkRateLimit("user-5a");
    }
    const user5a = checkRateLimit("user-5a");
    expect(user5a.allowed).toBe(false);

    const user5b = checkRateLimit("user-5b");
    expect(user5b.allowed).toBe(true);
  });
});

describe("sendTemplateEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetResendClient();
  });

  it("sends email with interpolated variables", async () => {
    await sendTemplateEmail({
      subject: "Hello {{sponsor_name}}",
      body: "<p>Hi {{sponsor_name}}, deal: {{deal_amount}}</p>",
      to: "sponsor@test.com",
      variables: {
        sponsor_name: "Acme Corp",
        deal_amount: "$500",
      },
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe("sponsor@test.com");
    expect(call.from).toBe("SponsorSync <notifications@sponsorsync.app>");
    expect(call.subject).toBe("Hello Acme Corp");
    expect(call.html).toContain("Hi Acme Corp");
    expect(call.html).toContain("$500");
  });

  it("strips handlebars conditionals from body", async () => {
    await sendTemplateEmail({
      subject: "Test",
      body: "{{#if sponsor_company}}Company: {{sponsor_company}}{{/if}}",
      to: "test@test.com",
      variables: { sponsor_company: "Acme" },
    });

    const call = sendMock.mock.calls[0][0];
    expect(call.html).not.toContain("{{#if");
    expect(call.html).toContain("Company: Acme");
  });

  it("includes cc, bcc, and replyTo when provided", async () => {
    await sendTemplateEmail({
      subject: "Test",
      body: "<p>Hello</p>",
      to: "to@test.com",
      cc: "cc@test.com",
      bcc: "bcc@test.com",
      replyTo: "reply@test.com",
      variables: {},
    });

    const call = sendMock.mock.calls[0][0];
    expect(call.cc).toBe("cc@test.com");
    expect(call.bcc).toBe("bcc@test.com");
    expect(call.replyTo).toBe("reply@test.com");
  });

  it("throws on Resend API error", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "Invalid API key" } });

    await expect(
      sendTemplateEmail({
        subject: "Test",
        body: "<p>Hello</p>",
        to: "test@test.com",
        variables: {},
      })
    ).rejects.toThrow("Email delivery failed: Invalid API key");
  });

  it("returns the email id from Resend", async () => {
    sendMock.mockResolvedValueOnce({ data: { id: "custom-id-456" }, error: null });

    const result = await sendTemplateEmail({
      subject: "Test",
      body: "<p>Hello</p>",
      to: "test@test.com",
      variables: {},
    });

    expect(result.id).toBe("custom-id-456");
  });
});

describe("previewTemplateEmail", () => {
  it("returns rendered html, text, and subject", () => {
    const result = previewTemplateEmail({
      subject: "Hello {{name}}",
      body: "<p>Welcome {{name}}</p>",
      variables: { name: "World" },
    });

    expect(result.html).toContain("Welcome World");
    expect(result.subject).toBe("Hello World");
    expect(result.text).toBeTruthy();
  });

  it("strips handlebars conditionals from preview", () => {
    const result = previewTemplateEmail({
      subject: "Test",
      body: "{{#if show}}Content{{/if}}",
      variables: {},
    });

    expect(result.html).toContain("Content");
    expect(result.html).not.toContain("{{#if");
  });

  it("wraps body in email envelope", () => {
    const result = previewTemplateEmail({
      subject: "Test",
      body: "<p>Hello</p>",
      variables: {},
    });

    expect(result.html).toContain("<!DOCTYPE html>");
    expect(result.html).toContain("<html");
  });
});
