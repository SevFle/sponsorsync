import type { ShipmentEmailData, TenantBranding, EmailContent } from "./types";
import { buildEmailHtml, buildEmailText } from "./layout";

export function deliveredTemplate(
  data: ShipmentEmailData,
  branding?: TenantBranding
): EmailContent {
  const customerGreeting = data.customerName
    ? `Hi ${data.customerName},`
    : "Hello,";
  const carrierLine = data.carrier ? ` via ${data.carrier}` : "";

  return {
    subject: `Shipment ${data.trackingId} has been delivered!`,
    html: buildEmailHtml({
      headerColor: "#16A34A",
      headerTitle: "Delivered!",
      bodyHtml: `<p>${customerGreeting}</p><p>Great news! Your shipment <strong>${data.trackingId}</strong> has been delivered${carrierLine}.</p><p style="color: #16A34A; font-weight: bold;">Your package has arrived at its destination.</p>`,
      data,
      branding,
    }),
    text: buildEmailText({
      lines: [
        customerGreeting,
        "",
        `Great news! Your shipment ${data.trackingId} has been delivered${carrierLine}.`,
        "",
        "Your package has arrived at its destination.",
      ],
      data,
      branding,
    }),
  };
}
