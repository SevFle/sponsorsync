import type { ShipmentEmailData, TenantBranding, EmailContent } from "./types";
import { buildEmailHtml, buildEmailText, brandedTrackingUrl } from "./layout";

export function inTransitTemplate(
  data: ShipmentEmailData,
  branding?: TenantBranding
): EmailContent {
  const customerGreeting = data.customerName
    ? `Hi ${data.customerName},`
    : "Hello,";
  const locationLine = data.location
    ? ` Current location: ${data.location}.`
    : "";
  const carrierLine = data.carrier ? ` via ${data.carrier}` : "";

  return {
    subject: `Shipment ${data.trackingId} is in transit`,
    html: buildEmailHtml({
      headerColor: "#0891B2",
      headerTitle: "Shipment In Transit",
      bodyHtml: `<p>${customerGreeting}</p><p>Your shipment <strong>${data.trackingId}</strong> is currently in transit${carrierLine}.${locationLine}</p>`,
      data,
      branding,
      showTrackButton: true,
    }),
    text: buildEmailText({
      lines: [
        customerGreeting,
        "",
        `Your shipment ${data.trackingId} is currently in transit${carrierLine}.${locationLine}`,
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
