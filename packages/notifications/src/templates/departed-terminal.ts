import type { ShipmentEmailData, TenantBranding, EmailContent } from "./types";
import { buildEmailHtml, buildEmailText, brandedTrackingUrl } from "./layout";

export function departedTerminalTemplate(
  data: ShipmentEmailData,
  branding?: TenantBranding
): EmailContent {
  const customerGreeting = data.customerName
    ? `Hi ${data.customerName},`
    : "Hello,";
  const locationLine = data.location ? ` from ${data.location}` : "";

  return {
    subject: `Shipment ${data.trackingId} has departed terminal`,
    html: buildEmailHtml({
      headerColor: "#4F46E5",
      headerTitle: "Departed Terminal",
      bodyHtml: `<p>${customerGreeting}</p><p>Your shipment <strong>${data.trackingId}</strong> has departed the terminal${locationLine} and is on its way to delivery.</p>`,
      data,
      branding,
      showTrackButton: true,
    }),
    text: buildEmailText({
      lines: [
        customerGreeting,
        "",
        `Your shipment ${data.trackingId} has departed the terminal${locationLine} and is on its way to delivery.`,
      ],
      data,
      branding,
    }),
  };
}
