import { z } from "zod";

export const emailTemplateSlugSchema = z.enum([
  "sponsor-outreach",
  "deal-confirmation",
  "deliverable-reminder",
  "payment-followup",
]);

export type EmailTemplateSlug = z.infer<typeof emailTemplateSlugSchema>;

export const sponsorOutreachSchema = z.object({
  sponsorName: z.string().min(1),
  sponsorCompany: z.string().optional(),
  creatorName: z.string().min(1),
  creatorShow: z.string().min(1),
  proposalSummary: z.string().min(1),
  dealAmount: z.string().optional(),
  proposalUrl: z.string().url().optional(),
});

export type SponsorOutreachProps = z.infer<typeof sponsorOutreachSchema>;

export const dealConfirmationSchema = z.object({
  sponsorName: z.string().min(1),
  dealTitle: z.string().min(1),
  dealAmount: z.string().min(1),
  currency: z.string().length(3).default("USD"),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  deliverablesCount: z.number().int().positive(),
  creatorName: z.string().min(1),
  creatorShow: z.string().min(1),
  dashboardUrl: z.string().url().optional(),
});

export type DealConfirmationProps = z.infer<typeof dealConfirmationSchema>;

export const deliverableReminderSchema = z.object({
  sponsorName: z.string().min(1),
  dealTitle: z.string().min(1),
  deliverableTitle: z.string().min(1),
  dueDate: z.string().min(1),
  daysRemaining: z.number().int(),
  isOverdue: z.boolean().default(false),
  creatorName: z.string().min(1),
  creatorShow: z.string().min(1),
  dashboardUrl: z.string().url().optional(),
});

export type DeliverableReminderProps = z.infer<typeof deliverableReminderSchema>;

export const paymentFollowupSchema = z.object({
  sponsorName: z.string().min(1),
  dealTitle: z.string().min(1),
  amount: z.string().min(1),
  currency: z.string().length(3).default("USD"),
  dueDate: z.string().min(1),
  daysOverdue: z.number().int().nonnegative().default(0),
  invoiceUrl: z.string().url().optional(),
  creatorName: z.string().min(1),
  creatorShow: z.string().min(1),
  followupNumber: z.number().int().min(1).max(3).default(1),
});

export type PaymentFollowupProps = z.infer<typeof paymentFollowupSchema>;

export const sendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  replyTo: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  template: emailTemplateSlugSchema,
  templateData: z.record(z.unknown()),
  scheduledAt: z.string().datetime().optional(),
});

export type SendEmailInput = z.infer<typeof sendEmailSchema>;

export type EmailPayload = {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  subject: string;
  react: React.ReactElement;
  scheduledAt?: string;
};

export type TemplateDataMap = {
  "sponsor-outreach": SponsorOutreachProps;
  "deal-confirmation": DealConfirmationProps;
  "deliverable-reminder": DeliverableReminderProps;
  "payment-followup": PaymentFollowupProps;
};

export const templateSchemaMap: Record<EmailTemplateSlug, z.ZodSchema> = {
  "sponsor-outreach": sponsorOutreachSchema,
  "deal-confirmation": dealConfirmationSchema,
  "deliverable-reminder": deliverableReminderSchema,
  "payment-followup": paymentFollowupSchema,
};

export const TEMPLATE_SUBJECTS: Record<EmailTemplateSlug, string> = {
  "sponsor-outreach": "Sponsorship Opportunity with {{creatorShow}}",
  "deal-confirmation": "Deal Confirmed: {{dealTitle}}",
  "deliverable-reminder": "{{isOverdue, select, true{Overdue Deliverable:} other{Reminder:}}} {{deliverableTitle}}",
  "payment-followup": "Payment {{followupNumber, select, 1{Reminder} 2{Follow-Up} 3{Final Notice}}}: {{amount}} for {{dealTitle}}",
};
