import type { ShipmentEmailData, TenantBranding, EmailContent } from "./types";
import { buildEmailHtml, buildEmailText } from "./layout";

export function outForDeliveryTemplate(
  data: ShipmentEmailData,
  branding?: TenantBranding
): EmailContent {
  const customerGreeting = data.customerName
    ? `Hi ${data.customerName},`
    : "Hello,";
  const carrierLine = data.carrier ? ` via ${data.carrier}` : "";

  return {
    subject: `Shipment ${data.trackingId} is out for delivery!`,
    html: buildEmailHtml({
      headerColor: "#D97706",
      headerTitle: "Out for Delivery",
      bodyHtml: `<p>${customerGreeting}</p><p>Your shipment <strong>${data.trackingId}</strong> is out for delivery${carrierLine}!</p>`,
      data,
      branding,
      alertHtml: `<p style="margin: 0; color: #92400E;"><strong>Heads up!</strong> Please ensure someone is available to receive the delivery.</p>`,
    }),
    text: buildEmailText({
      lines: [
        customerGreeting,
        "",
        `Your shipment ${data.trackingId} is out for delivery${carrierLine}!`,
        "",
        "Heads up! Please ensure someone is available to receive the delivery.",
      ],
      data,
      branding,
    }),
  };
}
