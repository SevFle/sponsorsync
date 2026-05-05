import type { ShipmentEmailData, TenantBranding, EmailContent } from "./types";
import { buildEmailHtml, buildEmailText } from "./layout";

export function customsClearedTemplate(
  data: ShipmentEmailData,
  branding?: TenantBranding
): EmailContent {
  const customerGreeting = data.customerName
    ? `Hi ${data.customerName},`
    : "Hello,";
  const locationLine = data.location ? ` at ${data.location}` : "";

  return {
    subject: `Shipment ${data.trackingId} has cleared customs`,
    html: buildEmailHtml({
      headerColor: "#059669",
      headerTitle: "Customs Cleared",
      bodyHtml: `<p>${customerGreeting}</p><p>Good news! Your shipment <strong>${data.trackingId}</strong> has cleared customs${locationLine}.</p><p style="color: #059669; font-weight: bold;">Customs clearance complete. Your shipment will soon be on its way.</p>`,
      data,
      branding,
    }),
    text: buildEmailText({
      lines: [
        customerGreeting,
        "",
        `Good news! Your shipment ${data.trackingId} has cleared customs${locationLine}.`,
        "",
        "Customs clearance complete. Your shipment will soon be on its way.",
      ],
      data,
      branding,
    }),
  };
}
