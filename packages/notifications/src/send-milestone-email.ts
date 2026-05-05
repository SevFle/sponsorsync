import { getTemplate } from "./templates";
import { sendEmail } from "./providers/email";
import { getSmsMessage } from "./sms-templates";
import { sendSms } from "./providers/sms";
import type { ShipmentEmailData, TemplateName, EmailResult, SmsTemplateData, MilestoneType, SmsResult } from "./templates/types";

export interface SendMilestoneEmailParams {
  templateName: TemplateName;
  shipmentData: ShipmentEmailData;
  to: string;
  from: string;
}

export interface SendMilestoneSmsParams {
  milestoneType: MilestoneType;
  smsData: SmsTemplateData;
  to: string;
  from: string;
}

export interface DispatchResult {
  email?: EmailResult;
  sms?: SmsResult;
}

export async function sendMilestoneEmail(params: SendMilestoneEmailParams): Promise<EmailResult> {
  const { templateName, shipmentData, to, from } = params;

  if (!to || to.trim() === "") {
    return { success: false, error: "Recipient email address is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
  const { html, text, subject } = templateFn(shipmentData);
  return sendEmail({ to, from, subject, html, text });
}

export async function sendMilestoneSms(params: SendMilestoneSmsParams): Promise<SmsResult> {
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

export async function dispatchMilestoneNotifications(params: {
  milestoneType: MilestoneType;
  shipmentData: ShipmentEmailData;
  smsData: SmsTemplateData;
  channels: ("email" | "sms")[];
  recipientEmail?: string;
  recipientPhone?: string;
  fromEmail: string;
  fromPhone: string;
}): Promise<DispatchResult> {
  const result: DispatchResult = {};

  if (params.channels.includes("email") && params.recipientEmail) {
    result.email = await sendMilestoneEmail({
      templateName: params.milestoneType as TemplateName,
      shipmentData: params.shipmentData,
      to: params.recipientEmail,
      from: params.fromEmail,
    });
  }

  if (params.channels.includes("sms") && params.recipientPhone) {
    result.sms = await sendMilestoneSms({
      milestoneType: params.milestoneType,
      smsData: params.smsData,
      to: params.recipientPhone,
      from: params.fromPhone,
    });
  }

  return result;
}
