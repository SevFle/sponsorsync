export interface EmailTemplate {
  html: string;
  text: string;
  subject: string;
}

export interface ShipmentEmailData {
  trackingId: string;
  origin: string;
  destination: string;
  carrier?: string;
  customerName?: string;
  estimatedDelivery?: string;
  location?: string;
  description?: string;
  occurredAt?: string;
}

export type TemplateName =
  | "booked"
  | "picked_up"
  | "departed_origin"
  | "in_transit"
  | "arrived_port"
  | "customs_cleared"
  | "departed_terminal"
  | "out_for_delivery"
  | "delivered"
  | "exception";

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SmsTemplateData {
  trackingId: string;
  origin: string;
  destination: string;
  milestoneType: string;
  location?: string;
  description?: string;
  carrier?: string;
  customerName?: string;
}

export type MilestoneType =
  | "booked"
  | "picked_up"
  | "departed_origin"
  | "in_transit"
  | "arrived_port"
  | "customs_cleared"
  | "departed_terminal"
  | "out_for_delivery"
  | "delivered"
  | "exception";

export const MILESTONE_DISPLAY_NAMES: Record<MilestoneType, string> = {
  booked: "Shipment Booked",
  picked_up: "Shipment Picked Up",
  departed_origin: "Departed Origin",
  in_transit: "In Transit",
  arrived_port: "Arrived at Port",
  customs_cleared: "Customs Cleared",
  departed_terminal: "Departed Terminal",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  exception: "Delivery Exception",
};

export const TEMPLATE_NAMES: TemplateName[] = [
  "booked",
  "picked_up",
  "departed_origin",
  "in_transit",
  "arrived_port",
  "customs_cleared",
  "departed_terminal",
  "out_for_delivery",
  "delivered",
  "exception",
];
