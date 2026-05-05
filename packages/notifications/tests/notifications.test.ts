import { describe, it, expect } from "vitest";
import { MockEmailProvider } from "../src/providers/mock";
import { sendMilestoneEmail, dispatchMilestoneNotifications } from "../src/send-milestone-email";
import type { ShipmentEmailData, TenantBranding } from "../src/templates/types";
import { TEMPLATE_NAMES, MILESTONE_DISPLAY_NAMES } from "../src/templates/types";
import { getTemplate } from "../src/templates";
import { getSmsMessage, SMS_MAX_LENGTH } from "../src/sms-templates";

const sampleShipment: ShipmentEmailData = {
  trackingId: "SL-ABC123",
  customerName: "Jane Doe",
  origin: "Shanghai, CN",
  destination: "Los Angeles, US",
  carrier: "Maersk",
  estimatedDelivery: "2026-06-01",
  location: "Pacific Ocean",
  description: "On schedule",
};

const sampleBranding: TenantBranding = {
  companyName: "Acme Forwarding",
  primaryColor: "#FF5500",
  logoUrl: "https://example.com/logo.png",
  trackingBaseUrl: "https://track.acme.com",
  supportEmail: "support@acme.com",
};

describe("Email Templates", () => {
  for (const name of TEMPLATE_NAMES) {
    describe(`${name} template`, () => {
      it("returns subject, html, and text", () => {
        const fn = getTemplate(name);
        const result = fn(sampleShipment);
        expect(result.subject).toBeTruthy();
        expect(result.html).toBeTruthy();
        expect(result.text).toBeTruthy();
        expect(result.subject).toContain("SL-ABC123");
      });

      it("renders with tenant branding", () => {
        const fn = getTemplate(name);
        const result = fn(sampleShipment, sampleBranding);
        expect(result.html).toContain("Acme Forwarding");
        expect(result.html).toContain("https://example.com/logo.png");
      });

      it("renders without optional fields", () => {
        const fn = getTemplate(name);
        const minimal: ShipmentEmailData = {
          trackingId: "SL-XYZ",
          origin: "A",
          destination: "B",
        };
        const result = fn(minimal);
        expect(result.subject).toContain("SL-XYZ");
        expect(result.html).toBeTruthy();
        expect(result.text).toBeTruthy();
      });
    });
  }

  it("throws for unknown template name", () => {
    expect(() => getTemplate("unknown_type" as any)).toThrow("Unknown template");
  });
});

describe("MILESTONE_DISPLAY_NAMES", () => {
  it("has a display name for every template", () => {
    for (const name of TEMPLATE_NAMES) {
      expect(MILESTONE_DISPLAY_NAMES[name]).toBeTruthy();
    }
  });
});

describe("MockEmailProvider", () => {
  it("records sent emails", async () => {
    const mock = new MockEmailProvider();
    const result = await mock.send({
      to: "customer@example.com",
      from: "noreply@acme.com",
      subject: "Test",
      html: "<p>Hello</p>",
      text: "Hello",
    });
    expect(result.success).toBe(true);
    expect(result.messageId).toBeTruthy();
    expect(mock.sentEmails).toHaveLength(1);
    expect(mock.lastEmail?.to).toBe("customer@example.com");
  });

  it("can be configured to fail", async () => {
    const mock = new MockEmailProvider({ shouldFail: true, failMessage: "Boom" });
    const result = await mock.send({
      to: "a@b.com",
      from: "c@d.com",
      subject: "X",
      html: "X",
      text: "X",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Boom");
  });

  it("clear resets history", async () => {
    const mock = new MockEmailProvider();
    await mock.send({ to: "a@b.com", from: "c@d.com", subject: "X", html: "X", text: "X" });
    expect(mock.sentEmails).toHaveLength(1);
    mock.clear();
    expect(mock.sentEmails).toHaveLength(0);
  });
});

describe("sendMilestoneEmail", () => {
  it("sends email via mock provider", async () => {
    const mock = new MockEmailProvider();
    const result = await sendMilestoneEmail({
      templateName: "delivered",
      shipmentData: sampleShipment,
      to: "customer@example.com",
      from: "noreply@acme.com",
      branding: sampleBranding,
      provider: mock,
    });
    expect(result.success).toBe(true);
    expect(mock.sentEmails).toHaveLength(1);
    expect(mock.lastEmail?.subject).toContain("SL-ABC123");
    expect(mock.lastEmail?.html).toContain("Acme Forwarding");
  });

  it("rejects empty recipient", async () => {
    const result = await sendMilestoneEmail({
      templateName: "booked",
      shipmentData: sampleShipment,
      to: "",
      from: "noreply@acme.com",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("required");
  });

  it("rejects invalid recipient email", async () => {
    const result = await sendMilestoneEmail({
      templateName: "booked",
      shipmentData: sampleShipment,
      to: "not-an-email",
      from: "noreply@acme.com",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid");
  });

  it("rejects empty sender", async () => {
    const result = await sendMilestoneEmail({
      templateName: "booked",
      shipmentData: sampleShipment,
      to: "customer@example.com",
      from: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("SMS Templates", () => {
  it("generates SMS for each milestone type", () => {
    for (const name of TEMPLATE_NAMES) {
      const msg = getSmsMessage(name, {
        trackingId: "SL-123",
        origin: "A",
        destination: "B",
      });
      expect(msg).toBeTruthy();
      expect(msg.length).toBeLessThanOrEqual(SMS_MAX_LENGTH);
    }
  });

  it("throws for unknown milestone type", () => {
    expect(() =>
      getSmsMessage("unknown" as any, { trackingId: "X", origin: "A", destination: "B" })
    ).toThrow();
  });

  it("truncates long messages", () => {
    const msg = getSmsMessage("exception", {
      trackingId: "SL-" + "X".repeat(200),
      origin: "A".repeat(60),
      destination: "B".repeat(60),
      description: "D".repeat(100),
    });
    expect(msg.length).toBeLessThanOrEqual(SMS_MAX_LENGTH);
    expect(msg.endsWith("...")).toBe(true);
  });
});

describe("dispatchMilestoneNotifications", () => {
  it("dispatches email when channel includes email", async () => {
    const mock = new MockEmailProvider();
    const result = await dispatchMilestoneNotifications({
      milestoneType: "in_transit",
      channels: ["email"],
      shipmentData: sampleShipment,
      smsData: { trackingId: "SL-ABC123", origin: "A", destination: "B" },
      recipientEmail: "customer@example.com",
      fromEmail: "noreply@acme.com",
      branding: sampleBranding,
      provider: mock,
    });
    expect(result.email?.success).toBe(true);
    expect(mock.sentEmails).toHaveLength(1);
  });

  it("skips email when no recipient email", async () => {
    const mock = new MockEmailProvider();
    const result = await dispatchMilestoneNotifications({
      milestoneType: "delivered",
      channels: ["email"],
      shipmentData: sampleShipment,
      smsData: { trackingId: "SL-ABC123", origin: "A", destination: "B" },
      fromEmail: "noreply@acme.com",
      provider: mock,
    });
    expect(result.email).toBeUndefined();
    expect(mock.sentEmails).toHaveLength(0);
  });

  it("skips email when channel does not include email", async () => {
    const mock = new MockEmailProvider();
    const result = await dispatchMilestoneNotifications({
      milestoneType: "delivered",
      channels: ["sms"],
      shipmentData: sampleShipment,
      smsData: { trackingId: "SL-ABC123", origin: "A", destination: "B" },
      recipientEmail: "customer@example.com",
      fromEmail: "noreply@acme.com",
      provider: mock,
    });
    expect(result.email).toBeUndefined();
    expect(mock.sentEmails).toHaveLength(0);
  });
});
