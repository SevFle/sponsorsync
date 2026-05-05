export {
  getTemplate,
  TEMPLATE_NAMES,
  MILESTONE_DISPLAY_NAMES,
} from "./templates";
export type {
  ShipmentEmailData,
  TenantBranding,
  EmailContent,
  TemplateName,
} from "./templates";

export { getSmsMessage, SMS_MAX_LENGTH } from "./sms-templates";

export {
  ResendProvider,
  MockEmailProvider,
  ConsoleEmailProvider,
  sendEmail,
  getResendClient,
  resetResendClient,
  sendSms,
  getSmsProvider,
  resetSmsProvider,
} from "./providers";
export type {
  EmailProvider,
  SendEmailParams,
  SendEmailResult,
  SentEmailRecord,
} from "./providers";

export {
  sendMilestoneEmail,
  sendMilestoneSms,
  dispatchMilestoneNotifications,
} from "./send-milestone-email";
export type {
  SendMilestoneEmailParams,
  SendMilestoneSmsParams,
  DispatchMilestoneNotificationsParams,
  DispatchResult,
} from "./send-milestone-email";
