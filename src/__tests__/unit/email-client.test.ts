import { describe, it, expect, vi, beforeEach } from "vitest";

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn().mockResolvedValue({ data: { id: "mock-email-id" }, error: null }),
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

import React from "react";
import {
  sendEmail,
  sendTemplatedEmail,
  processSendEmailRequest,
} from "@/lib/email/client";
import {
  validateTemplateData,
  getTemplateSubject,
  renderTemplate,
  buildEmailPayload,
  AVAILABLE_TEMPLATES,
} from "@/emails";
import type { EmailPayload } from "@/emails/types";
import { emailTemplateSlugSchema } from "@/emails/types";

describe("sendEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends email with html and text", async () => {
    const payload: EmailPayload = {
      to: "test@example.com",
      subject: "Test Subject",
      react: React.createElement("div", null, "Hello"),
    };

    const result = await sendEmail(payload);
    expect(sendMock).toHaveBeenCalledTimes(1);

    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe("test@example.com");
    expect(call.subject).toBe("Test Subject");
    expect(call.html).toBeDefined();
    expect(call.text).toBeDefined();
    expect(call.from).toBe("SponsorSync <notifications@sponsorsync.app>");
    expect(result).toEqual({ id: "mock-email-id" });
  });

  it("includes cc when provided", async () => {
    const payload: EmailPayload = {
      to: "test@example.com",
      cc: "cc@example.com",
      subject: "Test",
      react: React.createElement("div", null, "Body"),
    };

    await sendEmail(payload);
    expect(sendMock.mock.calls[0][0].cc).toBe("cc@example.com");
  });

  it("includes bcc when provided", async () => {
    const payload: EmailPayload = {
      to: "test@example.com",
      bcc: ["bcc1@example.com", "bcc2@example.com"],
      subject: "Test",
      react: React.createElement("div", null, "Body"),
    };

    await sendEmail(payload);
    expect(sendMock.mock.calls[0][0].bcc).toEqual(["bcc1@example.com", "bcc2@example.com"]);
  });

  it("includes replyTo when provided", async () => {
    const payload: EmailPayload = {
      to: "test@example.com",
      replyTo: "reply@example.com",
      subject: "Test",
      react: React.createElement("div", null, "Body"),
    };

    await sendEmail(payload);
    expect(sendMock.mock.calls[0][0].replyTo).toBe("reply@example.com");
  });

  it("includes scheduledAt when provided", async () => {
    const payload: EmailPayload = {
      to: "test@example.com",
      subject: "Test",
      react: React.createElement("div", null, "Body"),
      scheduledAt: "2025-12-01T09:00:00Z",
    };

    await sendEmail(payload);
    expect(sendMock.mock.calls[0][0].scheduledAt).toBe("2025-12-01T09:00:00Z");
  });

  it("throws on Resend API error", async () => {
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Domain not verified" },
    });

    await expect(
      sendEmail({
        to: "test@example.com",
        subject: "Test",
        react: React.createElement("div", null, "Body"),
      })
    ).rejects.toThrow("Email delivery failed: Domain not verified");
  });
});

describe("sendTemplatedEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends sponsor outreach email", async () => {
    const result = await sendTemplatedEmail("sponsor-outreach", {
      sponsorName: "Test Sponsor",
      creatorName: "Creator",
      creatorShow: "My Show",
      proposalSummary: "Let's partner!",
    }, { to: "test@example.com" });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.subject).toContain("My Show");
    expect(result).toEqual({ id: "mock-email-id" });
  });

  it("sends deal confirmation email", async () => {
    await sendTemplatedEmail("deal-confirmation", {
      sponsorName: "Sponsor",
      dealTitle: "Q1 Deal",
      dealAmount: "$1,000",
      currency: "USD",
      startDate: "Jan 1",
      endDate: "Mar 31",
      deliverablesCount: 3,
      creatorName: "Creator",
      creatorShow: "Show",
    }, { to: "test@example.com" });

    const call = sendMock.mock.calls[0][0];
    expect(call.subject).toContain("Q1 Deal");
  });

  it("sends deliverable reminder email", async () => {
    await sendTemplatedEmail("deliverable-reminder", {
      sponsorName: "Sponsor",
      dealTitle: "Deal",
      deliverableTitle: "Ep 10 Ad",
      dueDate: "Mar 15",
      daysRemaining: 5,
      isOverdue: false,
      creatorName: "Creator",
      creatorShow: "Show",
    }, { to: "test@example.com" });

    const call = sendMock.mock.calls[0][0];
    expect(call.subject).toContain("Ep 10 Ad");
  });

  it("sends overdue deliverable reminder email", async () => {
    await sendTemplatedEmail("deliverable-reminder", {
      sponsorName: "Sponsor",
      dealTitle: "Deal",
      deliverableTitle: "Late Deliverable",
      dueDate: "Mar 1",
      daysRemaining: -5,
      isOverdue: true,
      creatorName: "Creator",
      creatorShow: "Show",
    }, { to: "test@example.com" });

    const call = sendMock.mock.calls[0][0];
    expect(call.subject).toContain("Overdue Deliverable");
  });

  it("sends payment followup email", async () => {
    await sendTemplatedEmail("payment-followup", {
      sponsorName: "Sponsor",
      dealTitle: "Deal",
      amount: "$500",
      currency: "USD",
      dueDate: "Feb 1",
      daysOverdue: 10,
      creatorName: "Creator",
      creatorShow: "Show",
      followupNumber: 2,
    }, { to: "test@example.com" });

    const call = sendMock.mock.calls[0][0];
    expect(call.subject).toContain("Follow-Up");
    expect(call.subject).toContain("$500");
  });

  it("throws on invalid template data", async () => {
    await expect(
      sendTemplatedEmail("sponsor-outreach", {
        sponsorName: "",
        creatorName: "",
        creatorShow: "",
        proposalSummary: "",
      }, { to: "test@example.com" })
    ).rejects.toThrow("Template validation failed");
  });

  it("accepts cc and bcc options", async () => {
    await sendTemplatedEmail(
      "sponsor-outreach",
      {
        sponsorName: "Sponsor",
        creatorName: "Creator",
        creatorShow: "Show",
        proposalSummary: "Summary",
      },
      {
        to: "test@example.com",
        cc: "cc@example.com",
        bcc: "bcc@example.com",
      }
    );

    const call = sendMock.mock.calls[0][0];
    expect(call.cc).toBe("cc@example.com");
    expect(call.bcc).toBe("bcc@example.com");
  });
});

describe("processSendEmailRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes valid send email request", async () => {
    const result = await processSendEmailRequest({
      to: "sponsor@example.com",
      template: "sponsor-outreach",
      templateData: {
        sponsorName: "Sponsor",
        creatorName: "Creator",
        creatorShow: "The Show",
        proposalSummary: "Great opportunity!",
      },
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: "mock-email-id" });
  });

  it("rejects invalid template slug", async () => {
    await expect(
      processSendEmailRequest({
        to: "test@example.com",
        template: "nonexistent-template" as any,
        templateData: {},
      })
    ).rejects.toThrow("Invalid email request");
  });

  it("rejects invalid email address", async () => {
    await expect(
      processSendEmailRequest({
        to: "not-an-email",
        template: "sponsor-outreach",
        templateData: {},
      })
    ).rejects.toThrow("Invalid email request");
  });

  it("rejects invalid template data", async () => {
    await expect(
      processSendEmailRequest({
        to: "test@example.com",
        template: "deal-confirmation",
        templateData: { sponsorName: "" },
      })
    ).rejects.toThrow();
  });

  it("accepts array of recipients", async () => {
    await processSendEmailRequest({
      to: ["one@example.com", "two@example.com"],
      template: "sponsor-outreach",
      templateData: {
        sponsorName: "Sponsor",
        creatorName: "Creator",
        creatorShow: "Show",
        proposalSummary: "Summary",
      },
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].to).toEqual(["one@example.com", "two@example.com"]);
  });

  it("accepts scheduledAt parameter", async () => {
    await processSendEmailRequest({
      to: "test@example.com",
      template: "sponsor-outreach",
      templateData: {
        sponsorName: "Sponsor",
        creatorName: "Creator",
        creatorShow: "Show",
        proposalSummary: "Summary",
      },
      scheduledAt: "2025-12-01T09:00:00Z",
    });

    expect(sendMock.mock.calls[0][0].scheduledAt).toBe("2025-12-01T09:00:00Z");
  });
});

describe("validateTemplateData", () => {
  it("validates sponsor outreach data", () => {
    const result = validateTemplateData("sponsor-outreach", {
      sponsorName: "Sponsor",
      creatorName: "Creator",
      creatorShow: "Show",
      proposalSummary: "Summary",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sponsorName).toBe("Sponsor");
    }
  });

  it("rejects missing required fields", () => {
    const result = validateTemplateData("sponsor-outreach", {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });

  it("validates deal confirmation data", () => {
    const result = validateTemplateData("deal-confirmation", {
      sponsorName: "Sponsor",
      dealTitle: "Deal",
      dealAmount: "$1000",
      startDate: "Jan 1",
      endDate: "Mar 31",
      deliverablesCount: 3,
      creatorName: "Creator",
      creatorShow: "Show",
    });
    expect(result.success).toBe(true);
  });

  it("applies default values", () => {
    const result = validateTemplateData("deal-confirmation", {
      sponsorName: "Sponsor",
      dealTitle: "Deal",
      dealAmount: "$1000",
      startDate: "Jan 1",
      endDate: "Mar 31",
      deliverablesCount: 3,
      creatorName: "Creator",
      creatorShow: "Show",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("USD");
    }
  });

  it("validates deliverable reminder data", () => {
    const result = validateTemplateData("deliverable-reminder", {
      sponsorName: "Sponsor",
      dealTitle: "Deal",
      deliverableTitle: "Deliverable",
      dueDate: "Mar 15",
      daysRemaining: 5,
      creatorName: "Creator",
      creatorShow: "Show",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isOverdue).toBe(false);
    }
  });

  it("validates payment followup data", () => {
    const result = validateTemplateData("payment-followup", {
      sponsorName: "Sponsor",
      dealTitle: "Deal",
      amount: "$500",
      dueDate: "Feb 1",
      daysOverdue: 0,
      creatorName: "Creator",
      creatorShow: "Show",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.followupNumber).toBe(1);
      expect(result.data.currency).toBe("USD");
    }
  });

  it("rejects invalid followup number", () => {
    const result = validateTemplateData("payment-followup", {
      sponsorName: "Sponsor",
      dealTitle: "Deal",
      amount: "$500",
      dueDate: "Feb 1",
      daysOverdue: 0,
      creatorName: "Creator",
      creatorShow: "Show",
      followupNumber: 5,
    });
    expect(result.success).toBe(false);
  });
});

describe("getTemplateSubject", () => {
  it("generates outreach subject", () => {
    expect(
      getTemplateSubject("sponsor-outreach", {
        sponsorName: "Sponsor",
        creatorName: "Creator",
        creatorShow: "Amazing Show",
        proposalSummary: "Summary",
      })
    ).toBe("Sponsorship Opportunity with Amazing Show");
  });

  it("generates confirmation subject", () => {
    expect(
      getTemplateSubject("deal-confirmation", {
        sponsorName: "Sponsor",
        dealTitle: "Big Deal",
        dealAmount: "$5,000",
        currency: "USD",
        startDate: "Jan 1",
        endDate: "Mar 31",
        deliverablesCount: 3,
        creatorName: "Creator",
        creatorShow: "Show",
      })
    ).toBe("Deal Confirmed: Big Deal");
  });

  it("generates non-overdue reminder subject", () => {
    expect(
      getTemplateSubject("deliverable-reminder", {
        sponsorName: "Sponsor",
        dealTitle: "Deal",
        deliverableTitle: "Ad Read",
        dueDate: "Mar 15",
        daysRemaining: 5,
        isOverdue: false,
        creatorName: "Creator",
        creatorShow: "Show",
      })
    ).toBe("Reminder: Ad Read");
  });

  it("generates overdue reminder subject", () => {
    expect(
      getTemplateSubject("deliverable-reminder", {
        sponsorName: "Sponsor",
        dealTitle: "Deal",
        deliverableTitle: "Late Item",
        dueDate: "Mar 1",
        daysRemaining: -5,
        isOverdue: true,
        creatorName: "Creator",
        creatorShow: "Show",
      })
    ).toBe("Overdue Deliverable: Late Item");
  });

  it("generates payment followup subjects with escalation", () => {
    expect(
      getTemplateSubject("payment-followup", {
        sponsorName: "Sponsor",
        dealTitle: "Deal",
        amount: "$500",
        currency: "USD",
        dueDate: "Feb 1",
        daysOverdue: 5,
        creatorName: "Creator",
        creatorShow: "Show",
        followupNumber: 1,
      })
    ).toContain("Payment Reminder");

    expect(
      getTemplateSubject("payment-followup", {
        sponsorName: "Sponsor",
        dealTitle: "Deal",
        amount: "$500",
        currency: "USD",
        dueDate: "Feb 1",
        daysOverdue: 15,
        creatorName: "Creator",
        creatorShow: "Show",
        followupNumber: 3,
      })
    ).toContain("Final Payment Notice");
  });
});

describe("renderTemplate", () => {
  it("renders html and text for sponsor outreach", async () => {
    const { html, text } = await renderTemplate("sponsor-outreach", {
      sponsorName: "Sponsor",
      creatorName: "Creator",
      creatorShow: "Show",
      proposalSummary: "Summary",
    });

    expect(html).toBeTruthy();
    expect(text).toBeTruthy();
    expect(html).toContain("Sponsor");
    expect(text).toContain("Sponsor");
  });

  it("renders all template types", async () => {
    const templates: Array<{ slug: "sponsor-outreach" | "deal-confirmation" | "deliverable-reminder" | "payment-followup"; data: Record<string, unknown> }> = [
      {
        slug: "sponsor-outreach",
        data: {
          sponsorName: "S",
          creatorName: "C",
          creatorShow: "Sh",
          proposalSummary: "Sum",
        },
      },
      {
        slug: "deal-confirmation",
        data: {
          sponsorName: "S",
          dealTitle: "D",
          dealAmount: "$1",
          startDate: "Jan",
          endDate: "Mar",
          deliverablesCount: 1,
          creatorName: "C",
          creatorShow: "Sh",
        },
      },
      {
        slug: "deliverable-reminder",
        data: {
          sponsorName: "S",
          dealTitle: "D",
          deliverableTitle: "Del",
          dueDate: "Mar",
          daysRemaining: 3,
          creatorName: "C",
          creatorShow: "Sh",
        },
      },
      {
        slug: "payment-followup",
        data: {
          sponsorName: "S",
          dealTitle: "D",
          amount: "$1",
          dueDate: "Feb",
          daysOverdue: 5,
          creatorName: "C",
          creatorShow: "Sh",
        },
      },
    ];

    for (const { slug, data } of templates) {
      const { html, text } = await renderTemplate(slug, data as any);
      expect(html).toBeTruthy();
      expect(text).toBeTruthy();
      expect(html.length).toBeGreaterThan(0);
      expect(text.length).toBeGreaterThan(0);
    }
  });
});

describe("buildEmailPayload", () => {
  it("builds payload with subject and react component", async () => {
    const payload = await buildEmailPayload(
      "sponsor-outreach",
      {
        sponsorName: "Sponsor",
        creatorName: "Creator",
        creatorShow: "Show",
        proposalSummary: "Summary",
      },
      { to: "test@example.com" }
    );

    expect(payload.subject).toBe("Sponsorship Opportunity with Show");
    expect(payload.to).toBe("test@example.com");
    expect(payload.react).toBeTruthy();
  });

  it("includes cc and bcc in payload", async () => {
    const payload = await buildEmailPayload(
      "deal-confirmation",
      {
        sponsorName: "S",
        dealTitle: "D",
        dealAmount: "$1",
        currency: "USD",
        startDate: "Jan",
        endDate: "Mar",
        deliverablesCount: 1,
        creatorName: "C",
        creatorShow: "Sh",
      },
      {
        to: "test@example.com",
        cc: "cc@example.com",
        bcc: "bcc@example.com",
      }
    );

    expect(payload.cc).toBe("cc@example.com");
    expect(payload.bcc).toBe("bcc@example.com");
  });
});

describe("emailTemplateSlugSchema", () => {
  it("accepts valid slugs", () => {
    const slugs = ["sponsor-outreach", "deal-confirmation", "deliverable-reminder", "payment-followup"];
    for (const slug of slugs) {
      expect(emailTemplateSlugSchema.safeParse(slug).success).toBe(true);
    }
  });

  it("rejects invalid slugs", () => {
    expect(emailTemplateSlugSchema.safeParse("invalid").success).toBe(false);
    expect(emailTemplateSlugSchema.safeParse("").success).toBe(false);
    expect(emailTemplateSlugSchema.safeParse("sponsor_outreach").success).toBe(false);
  });
});

describe("AVAILABLE_TEMPLATES", () => {
  it("lists all 4 template types", () => {
    expect(AVAILABLE_TEMPLATES).toHaveLength(4);
  });

  it("each template has slug, name, and description", () => {
    for (const t of AVAILABLE_TEMPLATES) {
      expect(t.slug).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
    }
  });

  it("contains all expected slugs", () => {
    const slugs = AVAILABLE_TEMPLATES.map((t) => t.slug);
    expect(slugs).toContain("sponsor-outreach");
    expect(slugs).toContain("deal-confirmation");
    expect(slugs).toContain("deliverable-reminder");
    expect(slugs).toContain("payment-followup");
  });
});
