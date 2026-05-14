import { describe, it, expect, vi, beforeEach } from "vitest";

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
  sendDeadlineReminder,
  sendOverdueDeliverableReminder,
  sendPaymentFollowUp,
  sendSponsorCommunication,
} from "@/lib/email/templates";

describe("sendDeadlineReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends email with correct parameters", async () => {
    await sendDeadlineReminder("user@test.com", "Q1 Sponsor Deal", "2025-03-15");

    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe("user@test.com");
    expect(call.subject).toBe("Deadline Reminder: Q1 Sponsor Deal");
    expect(call.from).toBe("SponsorSync <notifications@sponsorsync.app>");
  });

  it("includes deal title in html body", async () => {
    await sendDeadlineReminder("user@test.com", "Premium Sponsor Deal", "2025-01-01");
    const call = sendMock.mock.calls[0][0];
    expect(call.html).toContain("Premium Sponsor Deal");
  });

  it("includes due date in html body", async () => {
    await sendDeadlineReminder("user@test.com", "Deal", "2025-03-15");
    const call = sendMock.mock.calls[0][0];
    expect(call.html).toContain("2025-03-15");
  });

  it("includes deal title in subject", async () => {
    await sendDeadlineReminder("user@test.com", "Premium Sponsor", "2025-01-01");
    expect(sendMock.mock.calls[0][0].subject).toBe("Deadline Reminder: Premium Sponsor");
  });

  it("uses correct from address", async () => {
    await sendDeadlineReminder("a@b.com", "Deal", "2025-01-01");
    expect(sendMock.mock.calls[0][0].from).toBe("SponsorSync <notifications@sponsorsync.app>");
  });

  it("returns id from resend api result", async () => {
    const result = await sendDeadlineReminder("a@b.com", "Deal", "2025-01-01");
    expect(result).toEqual({ id: "email-id-123" });
  });

  it("includes plain text version", async () => {
    await sendDeadlineReminder("a@b.com", "Deal", "2025-01-01");
    const call = sendMock.mock.calls[0][0];
    expect(call.text).toBeDefined();
    expect(typeof call.text).toBe("string");
  });
});

describe("sendOverdueDeliverableReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends email with correct parameters", async () => {
    await sendOverdueDeliverableReminder("user@test.com", "Big Deal", "Podcast Ad", "Jan 15, 2025");

    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe("user@test.com");
    expect(call.subject).toBe("Overdue Deliverable: Podcast Ad");
    expect(call.from).toBe("SponsorSync <notifications@sponsorsync.app>");
  });

  it("includes deal title in body", async () => {
    await sendOverdueDeliverableReminder("user@test.com", "Big Deal", "Ad", "Jan 15, 2025");
    const call = sendMock.mock.calls[0][0];
    expect(call.html).toContain("Big Deal");
  });

  it("includes due date in body", async () => {
    await sendOverdueDeliverableReminder("user@test.com", "Deal", "Deliverable", "Mar 1, 2025");
    const call = sendMock.mock.calls[0][0];
    expect(call.html).toContain("Mar 1, 2025");
  });

  it("includes deliverable title in subject", async () => {
    await sendOverdueDeliverableReminder("user@test.com", "Deal", "Newsletter Ad", "Jan 1, 2025");
    expect(sendMock.mock.calls[0][0].subject).toBe("Overdue Deliverable: Newsletter Ad");
  });

  it("includes overdue badge in body", async () => {
    await sendOverdueDeliverableReminder("user@test.com", "Deal", "Ad", "Jan 1, 2025");
    const call = sendMock.mock.calls[0][0];
    expect(call.html).toContain("Overdue");
  });

  it("returns id from resend api result", async () => {
    const result = await sendOverdueDeliverableReminder("a@b.com", "Deal", "Deliv", "Jan 1, 2025");
    expect(result).toEqual({ id: "email-id-123" });
  });
});

describe("sendPaymentFollowUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends email with correct parameters", async () => {
    await sendPaymentFollowUp("user@test.com", "Sponsor Deal", "$500.00", "Jan 15, 2025");

    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe("user@test.com");
    expect(call.subject).toBe("Payment Follow-Up: $500.00 for Sponsor Deal");
    expect(call.from).toBe("SponsorSync <notifications@sponsorsync.app>");
  });

  it("includes deal title in body", async () => {
    await sendPaymentFollowUp("user@test.com", "Premium Sponsor", "$1,000.00", "Jan 15, 2025");
    const call = sendMock.mock.calls[0][0];
    expect(call.html).toContain("Premium Sponsor");
  });

  it("includes due date in body", async () => {
    await sendPaymentFollowUp("user@test.com", "Deal", "$500.00", "Mar 1, 2025");
    const call = sendMock.mock.calls[0][0];
    expect(call.html).toContain("Mar 1, 2025");
  });

  it("includes amount in subject", async () => {
    await sendPaymentFollowUp("user@test.com", "Deal", "$250.00", "Jan 1, 2025");
    expect(sendMock.mock.calls[0][0].subject).toBe("Payment Follow-Up: $250.00 for Deal");
  });

  it("includes amount and details in body", async () => {
    await sendPaymentFollowUp("user@test.com", "Deal", "$500.00", "Jan 15, 2025");
    const call = sendMock.mock.calls[0][0];
    expect(call.html).toContain("$500.00");
  });

  it("returns id from resend api result", async () => {
    const result = await sendPaymentFollowUp("a@b.com", "Deal", "$100.00", "Jan 1, 2025");
    expect(result).toEqual({ id: "email-id-123" });
  });
});

describe("sendSponsorCommunication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends email with correct parameters", async () => {
    await sendSponsorCommunication("sponsor@test.com", "Meeting Request", "<p>Let's meet</p>");

    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe("sponsor@test.com");
    expect(call.subject).toBe("Meeting Request");
    expect(call.from).toBe("SponsorSync <notifications@sponsorsync.app>");
  });

  it("sends custom HTML body within layout", async () => {
    const customHtml = "<h1>Custom</h1><p>Body</p>";
    await sendSponsorCommunication("to@test.com", "Sub", customHtml);
    const call = sendMock.mock.calls[0][0];
    expect(call.html).toContain("Custom");
    expect(call.html).toContain("Body");
  });

  it("uses correct from address", async () => {
    await sendSponsorCommunication("to@test.com", "Sub", "body");
    expect(sendMock.mock.calls[0][0].from).toBe("SponsorSync <notifications@sponsorsync.app>");
  });

  it("returns id from resend api result", async () => {
    const result = await sendSponsorCommunication("to@test.com", "Sub", "body");
    expect(result).toEqual({ id: "email-id-123" });
  });
});

describe("email template error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sendDeadlineReminder propagates Resend API errors", async () => {
    sendMock.mockRejectedValueOnce(new Error("API rate limit exceeded"));
    await expect(
      sendDeadlineReminder("user@test.com", "Deal", "2025-01-01")
    ).rejects.toThrow("API rate limit exceeded");
  });

  it("sendOverdueDeliverableReminder propagates Resend API errors", async () => {
    sendMock.mockRejectedValueOnce(new Error("Network timeout"));
    await expect(
      sendOverdueDeliverableReminder("user@test.com", "Deal", "Deliv", "Jan 1")
    ).rejects.toThrow("Network timeout");
  });

  it("sendPaymentFollowUp propagates Resend API errors", async () => {
    sendMock.mockRejectedValueOnce(new Error("Invalid API key"));
    await expect(
      sendPaymentFollowUp("user@test.com", "Deal", "$100", "Jan 1")
    ).rejects.toThrow("Invalid API key");
  });

  it("sendSponsorCommunication propagates Resend API errors", async () => {
    sendMock.mockRejectedValueOnce(new Error("Domain not verified"));
    await expect(
      sendSponsorCommunication("sponsor@test.com", "Sub", "body")
    ).rejects.toThrow("Domain not verified");
  });

  it("handles empty strings in sendDeadlineReminder", async () => {
    await sendDeadlineReminder("", "", "");
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe("");
    expect(call.subject).toBe("Deadline Reminder: ");
  });

  it("handles special characters in email fields", async () => {
    await sendSponsorCommunication(
      "user+test@test.com",
      "Hello <script>alert('xss')</script>",
      "<p>O'Brien said \"hello\" & goodbye</p>"
    );
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe("user+test@test.com");
    expect(call.subject).toBe("Hello <script>alert('xss')</script>");
  });

  it("handles unicode in subject and body", async () => {
    await sendSponsorCommunication("user@test.com", "こんにちは 🎉", "<p>Ünïcödé</p>");
    const call = sendMock.mock.calls[0][0];
    expect(call.subject).toBe("こんにちは 🎉");
  });
});
