export const SMS_MAX_LENGTH = 160;

interface SmsData {
  trackingId: string;
  origin: string;
  destination: string;
  location?: string;
  description?: string;
}

const smsTemplates: Record<string, (d: SmsData) => string> = {
  booked: (d) =>
    `Shiplens: Shipment ${d.trackingId} (${d.origin} -> ${d.destination}) has been booked.`,
  picked_up: (d) =>
    `Shiplens: ${d.trackingId} picked up${d.location ? ` from ${d.location}` : ""}. ${d.origin} -> ${d.destination}`,
  departed_origin: (d) =>
    `Shiplens: ${d.trackingId} departed origin${d.location ? ` (${d.location})` : ""}. En route to ${d.destination}`,
  in_transit: (d) =>
    `Shiplens: ${d.trackingId} in transit${d.location ? `. Location: ${d.location}` : ""}. ${d.origin} -> ${d.destination}`,
  arrived_port: (d) =>
    `Shiplens: ${d.trackingId} arrived at port${d.location ? ` (${d.location})` : ""}.`,
  customs_cleared: (d) =>
    `Shiplens: ${d.trackingId} cleared customs${d.location ? ` at ${d.location}` : ""}.`,
  departed_terminal: (d) =>
    `Shiplens: ${d.trackingId} departed terminal. Out for final delivery to ${d.destination}.`,
  out_for_delivery: (d) =>
    `Shiplens: ${d.trackingId} is out for delivery to ${d.destination}!`,
  delivered: (d) =>
    `Shiplens: ${d.trackingId} has been delivered to ${d.destination}!`,
  exception: (d) =>
    `Shiplens ALERT: Issue with ${d.trackingId}${d.description ? ` - ${d.description}` : ""}. Please check tracking.`,
};

export function getSmsMessage(
  milestoneType: string,
  data: SmsData
): string {
  const fn = smsTemplates[milestoneType];
  if (!fn) {
    throw new Error(`Unknown SMS template for milestone: ${milestoneType}`);
  }
  const message = fn(data);
  if (message.length > SMS_MAX_LENGTH) {
    return message.substring(0, SMS_MAX_LENGTH - 3) + "...";
  }
  return message;
}
