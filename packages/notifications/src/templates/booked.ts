import type { ShipmentEmailData, TenantBranding, EmailContent } from "./types";
import { buildEmailHtml, buildEmailText } from "./layout";

export function bookedTemplate(
  data: ShipmentEmailData,
  branding?: TenantBranding
): EmailContent {
  const customerGreeting = data.customerName
    ? `Hi ${data.customerName},`
    : "Hello,";
  const carrierLine = data.carrier ? ` via ${data.carrier}` : "";

  return {
    subject: `Shipment ${data.trackingId} has been booked`,
    html: buildEmailHtml({
      headerColor: "#6366F1",
      headerTitle: "Shipment Booked",
      bodyHtml: `<p>${customerGreeting}</p><p>Your shipment <strong>${data.trackingId}</strong> has been booked${carrierLine}.</p><p style="color: #6b7280; font-size: 14px;">You will receive updates as your shipment progresses.</p>`,
      data,
      branding,
    }),
    text: buildEmailText({
      lines: [
        customerGreeting,
        "",
        `Your shipment ${data.trackingId} has been booked${carrierLine}.`,
        "",
        "You will receive updates as your shipment progresses.",
      ],
      data,
      branding,
    }),
  };
}
