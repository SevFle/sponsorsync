export interface ShipmentEmailData {
  trackingId: string;
  customerName?: string;
  origin: string;
  destination: string;
  carrier?: string;
  estimatedDelivery?: string;
  location?: string;
  description?: string;
}

export interface TenantBranding {
  companyName?: string;
  primaryColor?: string;
  logoUrl?: string;
  trackingBaseUrl?: string;
  supportEmail?: string;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export const MILESTONE_DISPLAY_NAMES: Record<string, string> = {
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

export const TEMPLATE_NAMES = [
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
] as const;

export type TemplateName = (typeof TEMPLATE_NAMES)[number];
