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

describe("sendOverdueDeliverableReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends email with correct parameters", async () => {
    await sendOverdueDeliverableReminder("user@test.com", "Big Deal", "Podcast Ad", "Jan 15, 2025");

    expect(sendMock).toHaveBeenCalledWith({
      from: "SponsorSync <notifications@sponsorsync.app>",
      to: "user@test.com",
      subject: "Overdue Deliverable: Podcast Ad",
      html: expect.stringContaining("Podcast Ad"),
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
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

  it("uses correct from address", async () => {
    await sendOverdueDeliverableReminder("a@b.com", "Deal", "Deliv", "Jan 1, 2025");

    expect(sendMock.mock.calls[0][0].from).toBe("SponsorSync <notifications@sponsorsync.app>");
  });

  it("returns the resend api result", async () => {
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

    expect(sendMock).toHaveBeenCalledWith({
      from: "SponsorSync <notifications@sponsorsync.app>",
      to: "user@test.com",
      subject: "Payment Follow-Up: $500.00 for Sponsor Deal",
      html: expect.stringContaining("$500.00"),
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
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

  it("uses correct from address", async () => {
    await sendPaymentFollowUp("a@b.com", "Deal", "$100.00", "Jan 1, 2025");

    expect(sendMock.mock.calls[0][0].from).toBe("SponsorSync <notifications@sponsorsync.app>");
  });

  it("returns the resend api result", async () => {
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
