import type { ShipmentEmailData, TenantBranding, EmailContent } from "./types";
import { buildEmailHtml, buildEmailText, brandedTrackingUrl } from "./layout";

export function departedOriginTemplate(
  data: ShipmentEmailData,
  branding?: TenantBranding
): EmailContent {
  const customerGreeting = data.customerName
    ? `Hi ${data.customerName},`
    : "Hello,";
  const locationLine = data.location ? ` from ${data.location}` : "";
  const carrierLine = data.carrier ? ` via ${data.carrier}` : "";

  return {
    subject: `Shipment ${data.trackingId} has departed origin`,
    html: buildEmailHtml({
      headerColor: "#7C3AED",
      headerTitle: "Departed Origin",
      bodyHtml: `<p>${customerGreeting}</p><p>Your shipment <strong>${data.trackingId}</strong> has departed the origin${locationLine}${carrierLine}.</p>`,
      data,
      branding,
      showTrackButton: true,
    }),
    text: buildEmailText({
      lines: [
        customerGreeting,
        "",
        `Your shipment ${data.trackingId} has departed the origin${locationLine}${carrierLine}.`,
      ],
      data,
      branding,
    }),
  };
}
