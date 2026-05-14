import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn().mockResolvedValue({ data: { id: "mock-email-id" }, error: null }),
}));

const { mockApiKey } = vi.hoisted(() => ({
  mockApiKey: { value: "test-key" },
}));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation((key: string) => ({
    emails: { send: sendMock },
    _apiKey: key,
  })),
}));

vi.mock("@/lib/config", () => ({
  config: {
    email: {
      get resendApiKey() {
        return mockApiKey.value;
      },
    },
    app: { name: "SponsorSync", url: "http://localhost:3000" },
    database: { url: "" },
    auth: { secret: "", url: "" },
    inngest: { eventKey: "", signingKey: "" },
    stripe: { secretKey: "", publishableKey: "", webhookSecret: "", starterPriceId: "", proPriceId: "" },
  },
}));

vi.mock("react-email", () => ({
  render: vi.fn().mockResolvedValue("<html>mock</html>"),
}));

import React from "react";
import { sendEmail, getResend, _resetResendClient } from "@/lib/email/client";
import { Resend } from "resend";

describe("Email client lazy initialization and API key guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiKey.value = "test-key";
    _resetResendClient();
  });

  afterEach(() => {
    _resetResendClient();
    mockApiKey.value = "test-key";
  });

  it("throws descriptive error when RESEND_API_KEY is not set", async () => {
    mockApiKey.value = "";
    _resetResendClient();

    const payload = {
      to: "test@example.com",
      subject: "Test",
      react: React.createElement("div", null, "Hello"),
    };

    await expect(sendEmail(payload)).rejects.toThrow(
      "RESEND_API_KEY is not configured"
    );
  });

  it("throws descriptive error when RESEND_API_KEY is empty string", async () => {
    mockApiKey.value = "";
    _resetResendClient();

    await expect(
      sendEmail({
        to: "test@example.com",
        subject: "Test",
        react: React.createElement("div", null, "Body"),
      })
    ).rejects.toThrow("RESEND_API_KEY is not configured");
  });

  it("creates Resend client when API key is present", async () => {
    mockApiKey.value = "re_valid_key_123";
    _resetResendClient();

    await sendEmail({
      to: "test@example.com",
      subject: "Test",
      react: React.createElement("div", null, "Body"),
    });

    expect(Resend).toHaveBeenCalledWith("re_valid_key_123");
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("lazily initializes Resend client only once (singleton)", async () => {
    mockApiKey.value = "re_singleton_key";
    _resetResendClient();

    await sendEmail({
      to: "a@test.com",
      subject: "First",
      react: React.createElement("div", null, "1"),
    });

    await sendEmail({
      to: "b@test.com",
      subject: "Second",
      react: React.createElement("div", null, "2"),
    });

    expect(Resend).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("re-creates client after reset", async () => {
    mockApiKey.value = "re_first_key";
    _resetResendClient();

    await sendEmail({
      to: "a@test.com",
      subject: "First",
      react: React.createElement("div", null, "1"),
    });

    expect(Resend).toHaveBeenCalledTimes(1);

    _resetResendClient();
    mockApiKey.value = "re_second_key";

    await sendEmail({
      to: "b@test.com",
      subject: "Second",
      react: React.createElement("div", null, "2"),
    });

    expect(Resend).toHaveBeenCalledTimes(2);
    expect(Resend).toHaveBeenNthCalledWith(1, "re_first_key");
    expect(Resend).toHaveBeenNthCalledWith(2, "re_second_key");
  });

  it("getResend returns a Resend instance when key is configured", () => {
    mockApiKey.value = "re_test_key";
    _resetResendClient();

    const client = getResend();
    expect(client).toBeDefined();
    expect(Resend).toHaveBeenCalledWith("re_test_key");
  });

  it("getResend throws when key is not configured", () => {
    mockApiKey.value = "";
    _resetResendClient();

    expect(() => getResend()).toThrow("RESEND_API_KEY is not configured");
  });

  it("getResend returns same instance on repeated calls", () => {
    mockApiKey.value = "re_same_key";
    _resetResendClient();

    const a = getResend();
    const b = getResend();
    expect(a).toBe(b);
    expect(Resend).toHaveBeenCalledTimes(1);
  });

  it("sendEmail does not create Resend client if render fails", async () => {
    const { render } = await import("react-email");
    (render as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("render error"));

    mockApiKey.value = "re_key";
    _resetResendClient();

    await expect(
      sendEmail({
        to: "test@example.com",
        subject: "Test",
        react: React.createElement("div", null, "Body"),
      })
    ).rejects.toThrow("render error");

    expect(Resend).toHaveBeenCalledTimes(1);
  });

  it("allows sending after key is set following an initial failure", async () => {
    mockApiKey.value = "";
    _resetResendClient();

    await expect(
      sendEmail({
        to: "test@example.com",
        subject: "Test",
        react: React.createElement("div", null, "Body"),
      })
    ).rejects.toThrow("RESEND_API_KEY is not configured");

    mockApiKey.value = "re_newly_set_key";
    _resetResendClient();

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      react: React.createElement("div", null, "Body"),
    });

    expect(result).toEqual({ id: "mock-email-id" });
  });
});
