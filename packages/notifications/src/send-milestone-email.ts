import { getTemplate } from "./templates";
import type { ShipmentEmailData, TenantBranding, TemplateName } from "./templates";
import type { EmailProvider, SendEmailResult } from "./providers";
import { ResendProvider } from "./providers";
import { getSmsMessage } from "./sms-templates";
import { sendSms } from "./providers";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SendMilestoneEmailParams {
  templateName: TemplateName | string;
  shipmentData: ShipmentEmailData;
  to: string;
  from: string;
  branding?: TenantBranding;
  provider?: EmailProvider;
}

export async function sendMilestoneEmail(
  params: SendMilestoneEmailParams
): Promise<SendEmailResult> {
  const { templateName, shipmentData, to, from, branding, provider } = params;

  if (!to || to.trim() === "") {
    return { success: false, error: "Recipient email address is required" };
  }
  if (!emailRegex.test(to)) {
    return { success: false, error: `Invalid recipient email address: ${to}` };
  }
  if (!from || from.trim() === "") {
    return { success: false, error: "Sender email address is required" };
  }
  if (!emailRegex.test(from)) {
    return { success: false, error: `Invalid sender email address: ${from}` };
  }

  const templateFn = getTemplate(templateName);
  const { html, text, subject } = templateFn(shipmentData, branding);

  const emailProvider = provider ?? new ResendProvider();
  return emailProvider.send({ to, from, subject, html, text });
}

export interface SendMilestoneSmsParams {
  milestoneType: string;
  smsData: { trackingId: string; origin: string; destination: string; location?: string; description?: string };
  to: string;
  from: string;
}

export async function sendMilestoneSms(
  params: SendMilestoneSmsParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { milestoneType, smsData, to, from } = params;

  if (!to || to.trim() === "") {
    return { success: false, error: "Recipient phone number is required" };
  }
  if (!from || from.trim() === "") {
    return { success: false, error: "Sender phone number is required" };
  }

  const body = getSmsMessage(milestoneType, smsData);
  return sendSms({ to, from, body });
}

export interface DispatchMilestoneNotificationsParams {
  milestoneType: string;
  channels: ("email" | "sms")[];
  shipmentData: ShipmentEmailData;
  smsData: { trackingId: string; origin: string; destination: string; location?: string; description?: string };
  recipientEmail?: string;
  recipientPhone?: string;
  fromEmail: string;
  fromPhone?: string;
  branding?: TenantBranding;
  provider?: EmailProvider;
}

export interface DispatchResult {
  email?: SendEmailResult;
  sms?: { success: boolean; messageId?: string; error?: string };
}

export async function dispatchMilestoneNotifications(
  params: DispatchMilestoneNotificationsParams
): Promise<DispatchResult> {
  const result: DispatchResult = {};

  if (params.channels.includes("email") && params.recipientEmail) {
    result.email = await sendMilestoneEmail({
      templateName: params.milestoneType,
      shipmentData: params.shipmentData,
      to: params.recipientEmail,
      from: params.fromEmail,
      branding: params.branding,
      provider: params.provider,
    });
  }

  if (params.channels.includes("sms") && params.recipientPhone && params.fromPhone) {
    result.sms = await sendMilestoneSms({
      milestoneType: params.milestoneType,
      smsData: params.smsData,
      to: params.recipientPhone,
      from: params.fromPhone,
    });
  }

  return result;
}
