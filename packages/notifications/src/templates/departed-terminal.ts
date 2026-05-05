import type { EmailTemplate, ShipmentEmailData } from "./types";

export function departedTerminalTemplate(data: ShipmentEmailData): EmailTemplate {
  const customerGreeting = data.customerName ? `Hi ${data.customerName},` : "Hello,";
  const locationLine = data.location ? ` from ${data.location}` : "";
  return {
    subject: `Shipment ${data.trackingId} has departed terminal`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0;">Departed Terminal</h1>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
    <p>${customerGreeting}</p>
    <p>Your shipment <strong>${data.trackingId}</strong> has departed the terminal${locationLine} and is on its way to delivery.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">From</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.origin}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">To</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.destination}</td></tr>
      ${data.estimatedDelivery ? `<tr><td style="padding: 8px; color: #6b7280;">Est. Delivery</td><td style="padding: 8px;">${data.estimatedDelivery}</td></tr>` : ""}
    </table>
    <a href="#" style="display: inline-block; background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Track Your Shipment</a>
  </div>
  <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">ShipLens Tracking Notification</p>
</body>
</html>`,
    text: [
      customerGreeting,
      "",
      `Your shipment ${data.trackingId} has departed the terminal${locationLine} and is on its way to delivery.`,
      "",
      `From: ${data.origin}`,
      `To: ${data.destination}`,
      data.estimatedDelivery ? `Est. Delivery: ${data.estimatedDelivery}` : "",
      "",
      "ShipLens Tracking Notification",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
