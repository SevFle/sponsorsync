import type { ShipmentEmailData, TenantBranding, EmailContent } from "./types";
import { buildEmailHtml, buildEmailText, brandedTrackingUrl } from "./layout";

export function pickedUpTemplate(
  data: ShipmentEmailData,
  branding?: TenantBranding
): EmailContent {
  const customerGreeting = data.customerName
    ? `Hi ${data.customerName},`
    : "Hello,";
  const locationLine = data.location ? ` from ${data.location}` : "";
  const carrierLine = data.carrier ? ` via ${data.carrier}` : "";

  return {
    subject: `Your shipment ${data.trackingId} has been picked up`,
    html: buildEmailHtml({
      headerColor: "#2563EB",
      headerTitle: "Package Picked Up",
      bodyHtml: `<p>${customerGreeting}</p><p>Your shipment <strong>${data.trackingId}</strong> has been picked up${locationLine}${carrierLine}.</p>`,
      data,
      branding,
      showTrackButton: true,
    }),
    text: buildEmailText({
      lines: [
        customerGreeting,
        "",
        `Your shipment ${data.trackingId} has been picked up${locationLine}${carrierLine}.`,
        "",
        branding?.trackingBaseUrl
          ? `Track your shipment: ${brandedTrackingUrl(data.trackingId, branding)}`
          : "Track your shipment at your ShipLens dashboard.",
      ],
      data,
      branding,
    }),
  };
}
