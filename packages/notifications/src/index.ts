export { getTemplate, TEMPLATE_NAMES, MILESTONE_DISPLAY_NAMES } from "./templates";
export type { EmailTemplate, ShipmentEmailData, TemplateName, EmailResult, SmsResult, SmsTemplateData, MilestoneType } from "./templates";
export { getSmsMessage, SMS_MAX_LENGTH } from "./sms-templates";
export { sendEmail, getResendClient, resetResendClient, sendSms, getSmsProvider, resetSmsProvider } from "./providers";
export type { SendEmailParams, SendSmsParams, SmsProvider } from "./providers";
export { sendMilestoneEmail, sendMilestoneSms, dispatchMilestoneNotifications } from "./send-milestone-email";
export type { SendMilestoneEmailParams, SendMilestoneSmsParams, DispatchResult } from "./send-milestone-email";
