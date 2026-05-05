import type { EmailTemplate, ShipmentEmailData } from "./types";

export function outForDeliveryTemplate(data: ShipmentEmailData): EmailTemplate {
  const customerGreeting = data.customerName ? `Hi ${data.customerName},` : "Hello,";
  const carrierLine = data.carrier ? ` via ${data.carrier}` : "";
  return {
    subject: `Shipment ${data.trackingId} is out for delivery!`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #D97706; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0;">Out for Delivery</h1>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
    <p>${customerGreeting}</p>
    <p>Your shipment <strong>${data.trackingId}</strong> is out for delivery${carrierLine}!</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">From</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.origin}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">To</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.destination}</td></tr>
    </table>
    <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px; padding: 12px; margin: 16px 0;">
      <p style="margin: 0; color: #92400E;"><strong>Heads up!</strong> Please ensure someone is available to receive the delivery.</p>
    </div>
  </div>
  <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">ShipLens Tracking Notification</p>
</body>
</html>`,
    text: [
      customerGreeting,
      "",
      `Your shipment ${data.trackingId} is out for delivery${carrierLine}!`,
      "",
      `From: ${data.origin}`,
      `To: ${data.destination}`,
      "",
      "Heads up! Please ensure someone is available to receive the delivery.",
      "",
      "ShipLens Tracking Notification",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
