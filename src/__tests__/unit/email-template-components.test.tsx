import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "react-email";
import React from "react";

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn().mockResolvedValue({ id: "mock-email-id" }),
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

import { SponsorOutreachEmail } from "@/emails/sponsor-outreach";
import { DealConfirmationEmail } from "@/emails/deal-confirmation";
import { DeliverableReminderEmail } from "@/emails/deliverable-reminder";
import { PaymentFollowupEmail } from "@/emails/payment-followup";
import { EmailLayout } from "@/emails/layout";

describe("SponsorOutreachEmail", () => {
  const defaultProps = {
    sponsorName: "Acme Corp",
    sponsorCompany: "Acme Corporation",
    creatorName: "Jane Doe",
    creatorShow: "The Creative Podcast",
    proposalSummary: "We'd love to feature your product in our upcoming episodes.",
    dealAmount: "$5,000",
    proposalUrl: "https://sponsorsync.app/proposal/123",
  };

  it("renders without errors", async () => {
    const html = await render(React.createElement(SponsorOutreachEmail, defaultProps));
    expect(html).toBeTruthy();
    expect(typeof html).toBe("string");
  });

  it("includes sponsor name", async () => {
    const html = await render(React.createElement(SponsorOutreachEmail, defaultProps));
    expect(html).toContain("Acme Corp");
  });

  it("includes creator name and show", async () => {
    const html = await render(React.createElement(SponsorOutreachEmail, defaultProps));
    expect(html).toContain("Jane Doe");
    expect(html).toContain("The Creative Podcast");
  });

  it("includes proposal summary", async () => {
    const html = await render(React.createElement(SponsorOutreachEmail, defaultProps));
    expect(html).toContain("upcoming episodes");
  });

  it("includes deal amount when provided", async () => {
    const html = await render(React.createElement(SponsorOutreachEmail, defaultProps));
    expect(html).toContain("$5,000");
  });

  it("includes proposal link when provided", async () => {
    const html = await render(React.createElement(SponsorOutreachEmail, defaultProps));
    expect(html).toContain("https://sponsorsync.app/proposal/123");
  });

  it("renders without deal amount", async () => {
    const props = { ...defaultProps, dealAmount: undefined };
    const html = await render(React.createElement(SponsorOutreachEmail, props));
    expect(html).toBeTruthy();
    expect(html).toContain("Acme Corp");
  });

  it("renders without proposal URL", async () => {
    const props = { ...defaultProps, proposalUrl: undefined };
    const html = await render(React.createElement(SponsorOutreachEmail, props));
    expect(html).toBeTruthy();
  });

  it("renders without sponsor company", async () => {
    const props = { ...defaultProps, sponsorCompany: undefined };
    const html = await render(React.createElement(SponsorOutreachEmail, props));
    expect(html).toContain("Acme Corp");
  });

  it("renders plain text version", async () => {
    const text = await render(React.createElement(SponsorOutreachEmail, defaultProps), {
      plainText: true,
    });
    expect(text).toBeTruthy();
    expect(text).toContain("Acme Corp");
    expect(text).toContain("Jane Doe");
  });
});

describe("DealConfirmationEmail", () => {
  const defaultProps = {
    sponsorName: "Big Sponsor",
    dealTitle: "Q1 2025 Partnership",
    dealAmount: "$10,000",
    currency: "USD",
    startDate: "January 1, 2025",
    endDate: "March 31, 2025",
    deliverablesCount: 5,
    creatorName: "John Smith",
    creatorShow: "Tech Talk Weekly",
    dashboardUrl: "https://sponsorsync.app/dashboard",
  };

  it("renders without errors", async () => {
    const html = await render(React.createElement(DealConfirmationEmail, defaultProps));
    expect(html).toBeTruthy();
  });

  it("includes deal title", async () => {
    const html = await render(React.createElement(DealConfirmationEmail, defaultProps));
    expect(html).toContain("Q1 2025 Partnership");
  });

  it("includes deal amount and currency", async () => {
    const html = await render(React.createElement(DealConfirmationEmail, defaultProps));
    expect(html).toContain("$10,000");
    expect(html).toContain("USD");
  });

  it("includes campaign dates", async () => {
    const html = await render(React.createElement(DealConfirmationEmail, defaultProps));
    expect(html).toContain("January 1, 2025");
    expect(html).toContain("March 31, 2025");
  });

  it("includes deliverables count", async () => {
    const html = await render(React.createElement(DealConfirmationEmail, defaultProps));
    expect(html).toContain("5");
  });

  it("includes success status badge", async () => {
    const html = await render(React.createElement(DealConfirmationEmail, defaultProps));
    expect(html).toContain("Deal Confirmed");
  });

  it("renders without dashboard URL", async () => {
    const props = { ...defaultProps, dashboardUrl: undefined };
    const html = await render(React.createElement(DealConfirmationEmail, props));
    expect(html).toBeTruthy();
  });

  it("handles singular deliverable", async () => {
    const props = { ...defaultProps, deliverablesCount: 1 };
    const html = await render(React.createElement(DealConfirmationEmail, props));
    expect(html).toContain("1 item");
  });
});

describe("DeliverableReminderEmail", () => {
  const defaultProps = {
    sponsorName: "Sponsor Inc",
    dealTitle: "Big Deal",
    deliverableTitle: "Episode 42 Ad Read",
    dueDate: "March 15, 2025",
    daysRemaining: 7,
    isOverdue: false,
    creatorName: "Creator",
    creatorShow: "My Show",
  };

  it("renders upcoming reminder", async () => {
    const html = await render(React.createElement(DeliverableReminderEmail, defaultProps));
    expect(html).toBeTruthy();
    expect(html).toContain("Episode 42 Ad Read");
    expect(html).toContain("7 day");
  });

  it("renders overdue reminder", async () => {
    const props = { ...defaultProps, isOverdue: true, daysRemaining: -3 };
    const html = await render(React.createElement(DeliverableReminderEmail, props));
    expect(html).toContain("Overdue");
    expect(html).toContain("3 day");
  });

  it("renders at-risk reminder (<= 3 days)", async () => {
    const props = { ...defaultProps, daysRemaining: 2 };
    const html = await render(React.createElement(DeliverableReminderEmail, props));
    expect(html).toContain("Due Soon");
  });

  it("renders with dashboard URL", async () => {
    const props = { ...defaultProps, dashboardUrl: "https://sponsorsync.app/d/1" };
    const html = await render(React.createElement(DeliverableReminderEmail, props));
    expect(html).toContain("https://sponsorsync.app/d/1");
  });

  it("includes correct overdue message", async () => {
    const props = { ...defaultProps, isOverdue: true, daysRemaining: -5 };
    const html = await render(React.createElement(DeliverableReminderEmail, props));
    expect(html).toContain("overdue");
    expect(html).toContain("5 day");
  });

  it("renders plain text version", async () => {
    const text = await render(React.createElement(DeliverableReminderEmail, defaultProps), {
      plainText: true,
    });
    expect(text).toContain("Episode 42 Ad Read");
  });
});

describe("PaymentFollowupEmail", () => {
  const defaultProps = {
    sponsorName: "Corporate Sponsor",
    dealTitle: "Annual Partnership",
    amount: "$2,500",
    currency: "USD",
    dueDate: "February 1, 2025",
    daysOverdue: 15,
    creatorName: "Host Name",
    creatorShow: "The Best Podcast",
    followupNumber: 1,
  };

  it("renders first followup (friendly)", async () => {
    const html = await render(React.createElement(PaymentFollowupEmail, defaultProps));
    expect(html).toBeTruthy();
    expect(html).toContain("Friendly Reminder");
    expect(html).toContain("$2,500");
  });

  it("renders second followup (urgent)", async () => {
    const props = { ...defaultProps, followupNumber: 2 };
    const html = await render(React.createElement(PaymentFollowupEmail, props));
    expect(html).toContain("Follow-Up");
    expect(html).toContain("15 day");
  });

  it("renders third followup (final notice)", async () => {
    const props = { ...defaultProps, followupNumber: 3 };
    const html = await render(React.createElement(PaymentFollowupEmail, props));
    expect(html).toContain("Final Notice");
  });

  it("includes invoice link when provided", async () => {
    const props = { ...defaultProps, invoiceUrl: "https://pay.sponsorsync.app/invoice/1" };
    const html = await render(React.createElement(PaymentFollowupEmail, props));
    expect(html).toContain("https://pay.sponsorsync.app/invoice/1");
  });

  it("renders without invoice URL", async () => {
    const html = await render(React.createElement(PaymentFollowupEmail, defaultProps));
    expect(html).toBeTruthy();
  });

  it("shows overdue days when > 0", async () => {
    const html = await render(React.createElement(PaymentFollowupEmail, defaultProps));
    expect(html).toContain("15 day");
  });

  it("renders plain text version", async () => {
    const text = await render(React.createElement(PaymentFollowupEmail, defaultProps), {
      plainText: true,
    });
    expect(text).toContain("$2,500");
    expect(text).toContain("Corporate Sponsor");
  });
});

describe("EmailLayout", () => {
  it("renders children", async () => {
    const html = await render(
      React.createElement(EmailLayout, { preview: "Test preview" }, React.createElement("div", null, "Hello World"))
    );
    expect(html).toContain("Hello World");
  });

  it("includes creator show name in header", async () => {
    const html = await render(
      React.createElement(EmailLayout, { preview: "Test", creatorShow: "My Amazing Show" }, React.createElement("div", null))
    );
    expect(html).toContain("My Amazing Show");
  });

  it("defaults to SponsorSync when no show name", async () => {
    const html = await render(
      React.createElement(EmailLayout, { preview: "Test" }, React.createElement("div", null))
    );
    expect(html).toContain("SponsorSync");
  });

  it("includes SponsorSync footer link", async () => {
    const html = await render(
      React.createElement(EmailLayout, { preview: "Test" }, React.createElement("div", null))
    );
    expect(html).toContain("sponsorsync.app");
  });
});
