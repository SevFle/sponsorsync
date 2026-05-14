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

describe("sendEmail edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends to multiple recipients (array)", async () => {
    const payload: EmailPayload = {
      to: ["one@example.com", "two@example.com", "three@example.com"],
      subject: "Multi",
      react: React.createElement("div", null, "Body"),
    };

    await sendEmail(payload);
    expect(sendMock.mock.calls[0][0].to).toEqual([
      "one@example.com",
      "two@example.com",
      "three@example.com",
    ]);
  });

  it("sends with all optional fields populated", async () => {
    const payload: EmailPayload = {
      to: "test@example.com",
      cc: "cc@example.com",
      bcc: ["bcc1@example.com", "bcc2@example.com"],
      replyTo: "reply@example.com",
      subject: "Full",
      react: React.createElement("div", null, "Body"),
      scheduledAt: "2025-12-01T09:00:00Z",
    };

    await sendEmail(payload);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe("test@example.com");
    expect(call.cc).toBe("cc@example.com");
    expect(call.bcc).toEqual(["bcc1@example.com", "bcc2@example.com"]);
    expect(call.replyTo).toBe("reply@example.com");
    expect(call.scheduledAt).toBe("2025-12-01T09:00:00Z");
    expect(call.from).toBe("SponsorSync <notifications@sponsorsync.app>");
    expect(call.html).toBeDefined();
    expect(call.text).toBeDefined();
  });

  it("omits optional fields when not provided", async () => {
    const payload: EmailPayload = {
      to: "test@example.com",
      subject: "Minimal",
      react: React.createElement("div", null, "Body"),
    };

    await sendEmail(payload);
    const call = sendMock.mock.calls[0][0];
    expect(call.cc).toBeUndefined();
    expect(call.bcc).toBeUndefined();
    expect(call.replyTo).toBeUndefined();
    expect(call.scheduledAt).toBeUndefined();
  });

  it("throws with error message from Resend API", async () => {
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Rate limit exceeded" },
    });

    await expect(
      sendEmail({
        to: "test@example.com",
        subject: "Test",
        react: React.createElement("div", null, "Body"),
      })
    ).rejects.toThrow("Email delivery failed: Rate limit exceeded");
  });

  it("throws when Resend returns null data without error", async () => {
    sendMock.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    await expect(
      sendEmail({
        to: "test@example.com",
        subject: "Test",
        react: React.createElement("div", null, "Body"),
      })
    ).rejects.toThrow();
  });

  it("sends cc as array of emails", async () => {
    const payload: EmailPayload = {
      to: "test@example.com",
      cc: ["cc1@example.com", "cc2@example.com"],
      subject: "Test",
      react: React.createElement("div", null, "Body"),
    };

    await sendEmail(payload);
    expect(sendMock.mock.calls[0][0].cc).toEqual(["cc1@example.com", "cc2@example.com"]);
  });

  it("sends replyTo as array of emails", async () => {
    const payload: EmailPayload = {
      to: "test@example.com",
      replyTo: ["reply1@example.com", "reply2@example.com"],
      subject: "Test",
      react: React.createElement("div", null, "Body"),
    };

    await sendEmail(payload);
    expect(sendMock.mock.calls[0][0].replyTo).toEqual(["reply1@example.com", "reply2@example.com"]);
  });
});

describe("processSendEmailRequest edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts cc and bcc as arrays", async () => {
    await processSendEmailRequest({
      to: "test@example.com",
      cc: ["cc1@example.com", "cc2@example.com"],
      bcc: ["bcc1@example.com"],
      template: "sponsor-outreach",
      templateData: {
        sponsorName: "Sponsor",
        creatorName: "Creator",
        creatorShow: "Show",
        proposalSummary: "Summary",
      },
    });

    const call = sendMock.mock.calls[0][0];
    expect(call.cc).toEqual(["cc1@example.com", "cc2@example.com"]);
    expect(call.bcc).toEqual(["bcc1@example.com"]);
  });

  it("accepts replyTo parameter", async () => {
    await processSendEmailRequest({
      to: "test@example.com",
      replyTo: "reply@example.com",
      template: "sponsor-outreach",
      templateData: {
        sponsorName: "Sponsor",
        creatorName: "Creator",
        creatorShow: "Show",
        proposalSummary: "Summary",
      },
    });

    expect(sendMock.mock.calls[0][0].replyTo).toBe("reply@example.com");
  });

  it("rejects completely empty input", async () => {
    await expect(processSendEmailRequest({} as any)).rejects.toThrow(
      "Invalid email request"
    );
  });

  it("rejects numeric template data values for string fields", async () => {
    await expect(
      processSendEmailRequest({
        to: "test@example.com",
        template: "sponsor-outreach",
        templateData: { sponsorName: 123 },
      })
    ).rejects.toThrow();
  });

  it("accepts optional sponsorCompany in sponsor-outreach", async () => {
    await processSendEmailRequest({
      to: "test@example.com",
      template: "sponsor-outreach",
      templateData: {
        sponsorName: "Sponsor",
        creatorName: "Creator",
        creatorShow: "Show",
        proposalSummary: "Summary",
        sponsorCompany: "BigCorp",
      },
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("accepts optional dashboardUrl in deal-confirmation", async () => {
    await processSendEmailRequest({
      to: "test@example.com",
      template: "deal-confirmation",
      templateData: {
        sponsorName: "Sponsor",
        dealTitle: "Deal",
        dealAmount: "$1000",
        startDate: "Jan 1",
        endDate: "Mar 31",
        deliverablesCount: 3,
        creatorName: "Creator",
        creatorShow: "Show",
        dashboardUrl: "https://app.example.com/dashboard",
      },
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("accepts optional invoiceUrl in payment-followup", async () => {
    await processSendEmailRequest({
      to: "test@example.com",
      template: "payment-followup",
      templateData: {
        sponsorName: "Sponsor",
        dealTitle: "Deal",
        amount: "$500",
        dueDate: "Feb 1",
        daysOverdue: 5,
        creatorName: "Creator",
        creatorShow: "Show",
        invoiceUrl: "https://pay.example.com/invoice/1",
      },
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid URL for optional proposalUrl", async () => {
    await expect(
      processSendEmailRequest({
        to: "test@example.com",
        template: "sponsor-outreach",
        templateData: {
          sponsorName: "Sponsor",
          creatorName: "Creator",
          creatorShow: "Show",
          proposalSummary: "Summary",
          proposalUrl: "not-a-url",
        },
      })
    ).rejects.toThrow();
  });

  it("rejects negative deliverablesCount", async () => {
    await expect(
      processSendEmailRequest({
        to: "test@example.com",
        template: "deal-confirmation",
        templateData: {
          sponsorName: "Sponsor",
          dealTitle: "Deal",
          dealAmount: "$1000",
          startDate: "Jan",
          endDate: "Mar",
          deliverablesCount: -1,
          creatorName: "Creator",
          creatorShow: "Show",
        },
      })
    ).rejects.toThrow();
  });

  it("rejects negative daysOverdue", async () => {
    await expect(
      processSendEmailRequest({
        to: "test@example.com",
        template: "payment-followup",
        templateData: {
          sponsorName: "Sponsor",
          dealTitle: "Deal",
          amount: "$500",
          dueDate: "Feb 1",
          daysOverdue: -1,
          creatorName: "Creator",
          creatorShow: "Show",
        },
      })
    ).rejects.toThrow();
  });

  it("rejects followupNumber outside 1-3 range", async () => {
    await expect(
      processSendEmailRequest({
        to: "test@example.com",
        template: "payment-followup",
        templateData: {
          sponsorName: "Sponsor",
          dealTitle: "Deal",
          amount: "$500",
          dueDate: "Feb 1",
          daysOverdue: 5,
          creatorName: "Creator",
          creatorShow: "Show",
          followupNumber: 0,
        },
      })
    ).rejects.toThrow();

    await expect(
      processSendEmailRequest({
        to: "test@example.com",
        template: "payment-followup",
        templateData: {
          sponsorName: "Sponsor",
          dealTitle: "Deal",
          amount: "$500",
          dueDate: "Feb 1",
          daysOverdue: 5,
          creatorName: "Creator",
          creatorShow: "Show",
          followupNumber: 4,
        },
      })
    ).rejects.toThrow();
  });
});

describe("validateTemplateData edge cases", () => {
  it("rejects null data", () => {
    const result = validateTemplateData("sponsor-outreach", null as any);
    expect(result.success).toBe(false);
  });

  it("rejects undefined data", () => {
    const result = validateTemplateData("sponsor-outreach", undefined as any);
    expect(result.success).toBe(false);
  });

  it("applies default isOverdue=false for deliverable-reminder", () => {
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

  it("accepts explicit isOverdue=true for deliverable-reminder", () => {
    const result = validateTemplateData("deliverable-reminder", {
      sponsorName: "Sponsor",
      dealTitle: "Deal",
      deliverableTitle: "Deliverable",
      dueDate: "Mar 1",
      daysRemaining: -3,
      isOverdue: true,
      creatorName: "Creator",
      creatorShow: "Show",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isOverdue).toBe(true);
    }
  });

  it("applies default currency=USD for deal-confirmation when omitted", () => {
    const result = validateTemplateData("deal-confirmation", {
      sponsorName: "Sponsor",
      dealTitle: "Deal",
      dealAmount: "$1000",
      startDate: "Jan",
      endDate: "Mar",
      deliverablesCount: 1,
      creatorName: "Creator",
      creatorShow: "Show",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("USD");
    }
  });

  it("accepts 3-letter currency code", () => {
    const result = validateTemplateData("deal-confirmation", {
      sponsorName: "Sponsor",
      dealTitle: "Deal",
      dealAmount: "€1000",
      currency: "EUR",
      startDate: "Jan",
      endDate: "Mar",
      deliverablesCount: 1,
      creatorName: "Creator",
      creatorShow: "Show",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("EUR");
    }
  });

  it("rejects currency codes that are not 3 letters", () => {
    const result = validateTemplateData("deal-confirmation", {
      sponsorName: "Sponsor",
      dealTitle: "Deal",
      dealAmount: "$1000",
      currency: "US",
      startDate: "Jan",
      endDate: "Mar",
      deliverablesCount: 1,
      creatorName: "Creator",
      creatorShow: "Show",
    } as any);
    expect(result.success).toBe(false);
  });

  it("applies defaults for payment-followup (currency, daysOverdue, followupNumber)", () => {
    const result = validateTemplateData("payment-followup", {
      sponsorName: "Sponsor",
      dealTitle: "Deal",
      amount: "$500",
      dueDate: "Feb 1",
      creatorName: "Creator",
      creatorShow: "Show",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("USD");
      expect(result.data.daysOverdue).toBe(0);
      expect(result.data.followupNumber).toBe(1);
    }
  });

  it("accepts optional dashboardUrl for deliverable-reminder", () => {
    const result = validateTemplateData("deliverable-reminder", {
      sponsorName: "Sponsor",
      dealTitle: "Deal",
      deliverableTitle: "Deliverable",
      dueDate: "Mar 15",
      daysRemaining: 5,
      creatorName: "Creator",
      creatorShow: "Show",
      dashboardUrl: "https://app.example.com/dashboard",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dashboardUrl).toBe("https://app.example.com/dashboard");
    }
  });

  it("accepts optional dealAmount and proposalUrl for sponsor-outreach", () => {
    const result = validateTemplateData("sponsor-outreach", {
      sponsorName: "Sponsor",
      creatorName: "Creator",
      creatorShow: "Show",
      proposalSummary: "Summary",
      dealAmount: "$5,000",
      proposalUrl: "https://app.example.com/proposal/1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dealAmount).toBe("$5,000");
      expect(result.data.proposalUrl).toBe("https://app.example.com/proposal/1");
    }
  });
});

describe("getTemplateSubject edge cases", () => {
  it("generates payment reminder for followupNumber 1", () => {
    const subject = getTemplateSubject("payment-followup", {
      sponsorName: "Sponsor",
      dealTitle: "Deal",
      amount: "$500",
      currency: "USD",
      dueDate: "Feb 1",
      daysOverdue: 5,
      creatorName: "Creator",
      creatorShow: "Show",
      followupNumber: 1,
    });
    expect(subject).toContain("Payment Reminder");
    expect(subject).toContain("$500");
    expect(subject).toContain("Deal");
  });

  it("generates payment follow-up for followupNumber 2", () => {
    const subject = getTemplateSubject("payment-followup", {
      sponsorName: "Sponsor",
      dealTitle: "Deal",
      amount: "$750",
      currency: "USD",
      dueDate: "Feb 1",
      daysOverdue: 10,
      creatorName: "Creator",
      creatorShow: "Show",
      followupNumber: 2,
    });
    expect(subject).toContain("Payment Follow-Up");
    expect(subject).toContain("$750");
  });

  it("generates final notice for followupNumber 3", () => {
    const subject = getTemplateSubject("payment-followup", {
      sponsorName: "Sponsor",
      dealTitle: "Deal",
      amount: "$1000",
      currency: "USD",
      dueDate: "Feb 1",
      daysOverdue: 30,
      creatorName: "Creator",
      creatorShow: "Show",
      followupNumber: 3,
    });
    expect(subject).toContain("Final Payment Notice");
    expect(subject).toContain("$1000");
  });
});
