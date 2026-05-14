import React from "react";
import { render } from "react-email";
import type {
  EmailTemplateSlug,
  TemplateDataMap,
  EmailPayload,
} from "./types";
import { templateSchemaMap } from "./types";
import { SponsorOutreachEmail } from "./sponsor-outreach";
import type { SponsorOutreachProps } from "./types";
import { DealConfirmationEmail } from "./deal-confirmation";
import type { DealConfirmationProps } from "./types";
import { DeliverableReminderEmail } from "./deliverable-reminder";
import type { DeliverableReminderProps } from "./types";
import { PaymentFollowupEmail } from "./payment-followup";
import type { PaymentFollowupProps } from "./types";

type TemplateComponent<T> = React.FC<T>;

const templateComponents: {
  [K in EmailTemplateSlug]: {
    component: TemplateComponent<TemplateDataMap[K]>;
    getSubject: (data: TemplateDataMap[K]) => string;
  };
} = {
  "sponsor-outreach": {
    component: SponsorOutreachEmail as TemplateComponent<SponsorOutreachProps>,
    getSubject: (data) =>
      `Sponsorship Opportunity with ${data.creatorShow}`,
  },
  "deal-confirmation": {
    component: DealConfirmationEmail as TemplateComponent<DealConfirmationProps>,
    getSubject: (data) =>
      `Deal Confirmed: ${data.dealTitle}`,
  },
  "deliverable-reminder": {
    component: DeliverableReminderEmail as TemplateComponent<DeliverableReminderProps>,
    getSubject: (data) =>
      data.isOverdue
        ? `Overdue Deliverable: ${data.deliverableTitle}`
        : `Reminder: ${data.deliverableTitle}`,
  },
  "payment-followup": {
    component: PaymentFollowupEmail as TemplateComponent<PaymentFollowupProps>,
    getSubject: (data) => {
      const prefixes: Record<number, string> = {
        1: "Payment Reminder",
        2: "Payment Follow-Up",
        3: "Final Payment Notice",
      };
      return `${prefixes[data.followupNumber] ?? "Payment Notice"}: ${data.amount} ${data.currency} for ${data.dealTitle}`;
    },
  },
};

export function validateTemplateData<T extends EmailTemplateSlug>(
  slug: T,
  data: unknown
): { success: true; data: TemplateDataMap[T] } | { success: false; error: string } {
  const schema = templateSchemaMap[slug];
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as TemplateDataMap[T] };
  }
  return {
    success: false,
    error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
  };
}

export function getTemplateSubject<T extends EmailTemplateSlug>(
  slug: T,
  data: TemplateDataMap[T]
): string {
  return templateComponents[slug].getSubject(data);
}

export async function renderTemplate<T extends EmailTemplateSlug>(
  slug: T,
  data: TemplateDataMap[T]
): Promise<{ html: string; text: string }> {
  const { component } = templateComponents[slug];
  const reactElement = React.createElement(component as React.FC<Record<string, unknown>>, data as Record<string, unknown>);
  const [html, text] = await Promise.all([
    render(reactElement),
    render(reactElement, { plainText: true }),
  ]);
  return { html, text };
}

export function getTemplateComponent<T extends EmailTemplateSlug>(
  slug: T
): TemplateComponent<TemplateDataMap[T]> {
  return templateComponents[slug].component;
}

export async function buildEmailPayload<T extends EmailTemplateSlug>(
  slug: T,
  data: TemplateDataMap[T],
  options: Omit<EmailPayload, "subject" | "react">
): Promise<EmailPayload> {
  const subject = getTemplateSubject(slug, data);
  const Component = getTemplateComponent(slug);
  const react = React.createElement(Component as React.FC<Record<string, unknown>>, data as Record<string, unknown>);

  return {
    ...options,
    subject,
    react,
  };
}

export const AVAILABLE_TEMPLATES: { slug: EmailTemplateSlug; name: string; description: string }[] = [
  {
    slug: "sponsor-outreach",
    name: "Sponsor Outreach",
    description: "Initial sponsorship proposal to prospective sponsors",
  },
  {
    slug: "deal-confirmation",
    name: "Deal Confirmation",
    description: "Confirmation of a new sponsorship deal with details",
  },
  {
    slug: "deliverable-reminder",
    name: "Deliverable Reminder",
    description: "Reminder for upcoming or overdue deliverables",
  },
  {
    slug: "payment-followup",
    name: "Payment Follow-Up",
    description: "Follow-up on outstanding payments with escalating urgency",
  },
];

export { SponsorOutreachEmail } from "./sponsor-outreach";
export { DealConfirmationEmail } from "./deal-confirmation";
export { DeliverableReminderEmail } from "./deliverable-reminder";
export { PaymentFollowupEmail } from "./payment-followup";
export { EmailLayout, EmailHeading, EmailParagraph, EmailButton, EmailDivider, DetailRow, StatusBadge, FooterNote } from "./layout";
