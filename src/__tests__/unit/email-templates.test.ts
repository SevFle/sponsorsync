import { describe, it, expect, vi, beforeEach } from "vitest";

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn().mockResolvedValue({ id: "email-id-123" }),
}));

vi.mock("resend", () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: { send: sendMock },
    })),
  };
});

import { sendDeadlineReminder, sendSponsorCommunication } from "@/lib/email/templates";

describe("sendDeadlineReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends email with correct parameters", async () => {
    await sendDeadlineReminder("user@test.com", "Q1 Sponsor Deal", "2025-03-15");

    expect(sendMock).toHaveBeenCalledWith({
      from: "SponsorSync <notifications@sponsorsync.app>",
      to: "user@test.com",
      subject: "Deadline Reminder: Q1 Sponsor Deal",
      html: expect.stringContaining("Q1 Sponsor Deal"),
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("includes due date in email body", async () => {
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

  it("returns the resend api result", async () => {
    const result = await sendDeadlineReminder("a@b.com", "Deal", "2025-01-01");

    expect(result).toEqual({ id: "email-id-123" });
  });
});

describe("sendSponsorCommunication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends email with correct parameters", async () => {
    await sendSponsorCommunication("sponsor@test.com", "Meeting Request", "<p>Let's meet</p>");

    expect(sendMock).toHaveBeenCalledWith({
      from: "SponsorSync <notifications@sponsorsync.app>",
      to: "sponsor@test.com",
      subject: "Meeting Request",
      html: "<p>Let's meet</p>",
    });
  });

  it("sends custom HTML body", async () => {
    const customHtml = "<h1>Custom</h1><p>Body</p>";
    await sendSponsorCommunication("to@test.com", "Sub", customHtml);

    expect(sendMock.mock.calls[0][0].html).toBe(customHtml);
  });

  it("uses correct from address", async () => {
    await sendSponsorCommunication("to@test.com", "Sub", "body");

    expect(sendMock.mock.calls[0][0].from).toBe("SponsorSync <notifications@sponsorsync.app>");
  });

  it("returns the resend api result", async () => {
    const result = await sendSponsorCommunication("to@test.com", "Sub", "body");

    expect(result).toEqual({ id: "email-id-123" });
  });
});
