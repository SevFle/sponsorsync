import { db, notificationRules, notificationSettings, notifications, shipments, tenants } from "@shiplens/db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  sendMilestoneEmail,
  sendMilestoneSms,
  getSmsMessage,
  type ShipmentEmailData,
  type SmsTemplateData,
  type MilestoneType,
} from "@shiplens/notifications";

interface DispatchContext {
  tenantId: string;
  shipmentId: string;
  milestoneId: string;
  milestoneType: string;
  location?: string;
  description?: string;
}

interface ShipmentInfo {
  id: string;
  trackingId: string;
  origin: string | null;
  destination: string | null;
  carrier: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  estimatedDelivery: Date | null;
}

interface TenantSettings {
  fromEmail: string | null;
  fromPhone: string | null;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

export async function getShipmentInfo(shipmentId: string, tenantId: string): Promise<ShipmentInfo | null> {
  const rows = await db
    .select()
    .from(shipments)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.tenantId, tenantId)))
    .limit(1);
  return (rows[0] as ShipmentInfo) ?? null;
}

export async function getTenantNotificationSettings(tenantId: string): Promise<TenantSettings> {
  const rows = await db
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.tenantId, tenantId))
    .limit(1);

  const settings = rows[0];
  if (settings) {
    return {
      fromEmail: settings.defaultFromEmail,
      fromPhone: settings.defaultFromPhone,
      emailEnabled: settings.emailEnabled,
      smsEnabled: settings.smsEnabled,
    };
  }

  const tenantRows = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const tenant = tenantRows[0];
  return {
    fromEmail: tenant?.fromEmail ?? null,
    fromPhone: tenant?.fromSmsNumber ?? null,
    emailEnabled: true,
    smsEnabled: false,
  };
}

export async function getApplicableRules(
  tenantId: string,
  milestoneType: string
): Promise<typeof notificationRules.$inferSelect[]> {
  return db
    .select()
    .from(notificationRules)
    .where(
      and(
        eq(notificationRules.tenantId, tenantId),
        eq(notificationRules.milestoneType, milestoneType as typeof notificationRules.$inferInsert.milestoneType),
        eq(notificationRules.enabled, true)
      )
    );
}

async function logNotification(params: {
  tenantId: string;
  shipmentId: string;
  milestoneId: string;
  ruleId: string | null;
  channel: "email" | "sms" | "both";
  recipient: string;
  subject?: string;
  body?: string;
  status: string;
  providerId?: string;
  errorMessage?: string;
}): Promise<void> {
  await db.insert(notifications).values({
    tenantId: params.tenantId,
    shipmentId: params.shipmentId,
    milestoneId: params.milestoneId,
    ruleId: params.ruleId,
    channel: params.channel,
    recipient: params.recipient,
    subject: params.subject ?? null,
    body: params.body ?? null,
    status: params.status,
    providerId: params.providerId ?? null,
    errorMessage: params.errorMessage ?? null,
    sentAt: params.status === "sent" ? new Date() : null,
  });
}

export async function dispatchMilestoneNotifications(
  ctx: DispatchContext
): Promise<{ dispatched: number; failed: number }> {
  const { tenantId, shipmentId, milestoneId, milestoneType, location, description } = ctx;

  const shipment = await getShipmentInfo(shipmentId, tenantId);
  if (!shipment) {
    return { dispatched: 0, failed: 0 };
  }

  if (!shipment.customerEmail && !shipment.customerPhone) {
    return { dispatched: 0, failed: 0 };
  }

  const settings = await getTenantNotificationSettings(tenantId);
  const rules = await getApplicableRules(tenantId, milestoneType);

  if (rules.length === 0) {
    return { dispatched: 0, failed: 0 };
  }

  const emailData: ShipmentEmailData = {
    trackingId: shipment.trackingId,
    origin: shipment.origin ?? "N/A",
    destination: shipment.destination ?? "N/A",
    carrier: shipment.carrier ?? undefined,
    customerName: shipment.customerName ?? undefined,
    estimatedDelivery: shipment.estimatedDelivery?.toISOString(),
    location,
    description,
  };

  const smsData: SmsTemplateData = {
    trackingId: shipment.trackingId,
    origin: shipment.origin ?? "N/A",
    destination: shipment.destination ?? "N/A",
    milestoneType,
    location,
    description,
    carrier: shipment.carrier ?? undefined,
    customerName: shipment.customerName ?? undefined,
  };

  let dispatched = 0;
  let failed = 0;

  for (const rule of rules) {
    const channels: ("email" | "sms")[] = [];
    if ((rule.channel === "email" || rule.channel === "both") && settings.emailEnabled) {
      channels.push("email");
    }
    if ((rule.channel === "sms" || rule.channel === "both") && settings.smsEnabled) {
      channels.push("sms");
    }

    for (const channel of channels) {
      if (channel === "email" && shipment.customerEmail && settings.fromEmail) {
        try {
          const result = await sendMilestoneEmail({
            templateName: milestoneType as MilestoneType,
            shipmentData: emailData,
            to: shipment.customerEmail,
            from: settings.fromEmail,
          });

          if (result.success) {
            dispatched++;
            await logNotification({
              tenantId,
              shipmentId,
              milestoneId,
              ruleId: rule.id,
              channel: "email",
              recipient: shipment.customerEmail,
              subject: emailData.trackingId,
              status: "sent",
              providerId: result.messageId,
            });
          } else {
            failed++;
            await logNotification({
              tenantId,
              shipmentId,
              milestoneId,
              ruleId: rule.id,
              channel: "email",
              recipient: shipment.customerEmail,
              status: "failed",
              errorMessage: result.error,
            });
          }
        } catch (err) {
          failed++;
          await logNotification({
            tenantId,
            shipmentId,
            milestoneId,
            ruleId: rule.id,
            channel: "email",
            recipient: shipment.customerEmail,
            status: "failed",
            errorMessage: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      if (channel === "sms" && shipment.customerPhone && settings.fromPhone) {
        try {
          const smsBody = getSmsMessage(milestoneType as MilestoneType, smsData);
          const result = await sendMilestoneSms({
            milestoneType: milestoneType as MilestoneType,
            smsData,
            to: shipment.customerPhone,
            from: settings.fromPhone,
          });

          if (result.success) {
            dispatched++;
            await logNotification({
              tenantId,
              shipmentId,
              milestoneId,
              ruleId: rule.id,
              channel: "sms",
              recipient: shipment.customerPhone,
              body: smsBody,
              status: "sent",
              providerId: result.messageId,
            });
          } else {
            failed++;
            await logNotification({
              tenantId,
              shipmentId,
              milestoneId,
              ruleId: rule.id,
              channel: "sms",
              recipient: shipment.customerPhone,
              status: "failed",
              errorMessage: result.error,
            });
          }
        } catch (err) {
          failed++;
          await logNotification({
            tenantId,
            shipmentId,
            milestoneId,
            ruleId: rule.id,
            channel: "sms",
            recipient: shipment.customerPhone,
            status: "failed",
            errorMessage: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    }
  }

  return { dispatched, failed };
}
