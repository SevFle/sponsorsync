import type { EmailProvider, SendEmailResult, TenantBranding as Branding, ShipmentEmailData } from "@shiplens/notifications";
import { sendMilestoneEmail } from "@shiplens/notifications";

export interface MilestoneNotificationInput {
  milestoneType: string;
  tenantId: string;
  shipmentId: string;
  shipmentData: {
    trackingId: string;
    customerName?: string | null;
    customerEmail?: string | null;
    origin?: string | null;
    destination?: string | null;
    carrier?: string | null;
    estimatedDelivery?: Date | null;
  };
  tenantData: {
    name: string;
    fromEmail?: string | null;
    primaryColor?: string | null;
    logoUrl?: string | null;
    notificationChannel?: string | null;
  };
  location?: string | null;
  description?: string | null;
}

export interface NotificationDispatchResult {
  email?: SendEmailResult;
  skipped: boolean;
  reason?: string;
}

export class NotificationDispatcher {
  private provider: EmailProvider | undefined;

  constructor(provider?: EmailProvider) {
    this.provider = provider;
  }

  async dispatch(
    input: MilestoneNotificationInput
  ): Promise<NotificationDispatchResult> {
    const channel = input.tenantData.notificationChannel ?? "email";
    if (channel !== "email" && channel !== "both") {
      return { skipped: true, reason: `Channel '${channel}' not supported for email` };
    }

    const recipientEmail = input.shipmentData.customerEmail;
    if (!recipientEmail) {
      return { skipped: true, reason: "No customer email on shipment" };
    }

    const fromEmail = input.tenantData.fromEmail;
    if (!fromEmail) {
      return { skipped: true, reason: "No fromEmail configured for tenant" };
    }

    const branding: Branding = {
      companyName: input.tenantData.name,
      primaryColor: input.tenantData.primaryColor ?? undefined,
      logoUrl: input.tenantData.logoUrl ?? undefined,
    };

    const shipmentEmailData: ShipmentEmailData = {
      trackingId: input.shipmentData.trackingId,
      customerName: input.shipmentData.customerName ?? undefined,
      origin: input.shipmentData.origin ?? "Unknown",
      destination: input.shipmentData.destination ?? "Unknown",
      carrier: input.shipmentData.carrier ?? undefined,
      estimatedDelivery: input.shipmentData.estimatedDelivery
        ? input.shipmentData.estimatedDelivery.toISOString()
        : undefined,
      location: input.location ?? undefined,
      description: input.description ?? undefined,
    };

    const result = await sendMilestoneEmail({
      templateName: input.milestoneType,
      shipmentData: shipmentEmailData,
      to: recipientEmail,
      from: fromEmail,
      branding,
      provider: this.provider,
    });

    return { email: result, skipped: false };
  }
}

export function createDispatcher(provider?: EmailProvider): NotificationDispatcher {
  return new NotificationDispatcher(provider);
}
