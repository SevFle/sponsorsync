import type { ShipmentEmailData, TenantBranding, EmailContent } from "./types";
import { buildEmailHtml, buildEmailText } from "./layout";

export function arrivedPortTemplate(
  data: ShipmentEmailData,
  branding?: TenantBranding
): EmailContent {
  const customerGreeting = data.customerName
    ? `Hi ${data.customerName},`
    : "Hello,";
  const locationLine = data.location ? ` at ${data.location}` : "";

  return {
    subject: `Shipment ${data.trackingId} has arrived at port`,
    html: buildEmailHtml({
      headerColor: "#0EA5E9",
      headerTitle: "Arrived at Port",
      bodyHtml: `<p>${customerGreeting}</p><p>Your shipment <strong>${data.trackingId}</strong> has arrived at port${locationLine}.</p><p style="color: #6b7280; font-size: 14px;">Your shipment is now being processed at the destination port.</p>`,
      data,
      branding,
    }),
    text: buildEmailText({
      lines: [
        customerGreeting,
        "",
        `Your shipment ${data.trackingId} has arrived at port${locationLine}.`,
        "",
        "Your shipment is now being processed at the destination port.",
      ],
      data,
      branding,
    }),
  };
}
