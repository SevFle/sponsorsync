import { Resend } from "resend";
import { render } from "react-email";
import { config } from "@/lib/config";
import type { EmailPayload } from "@/emails/types";
import {
  validateTemplateData,
  getTemplateSubject,
  getTemplateComponent,
} from "@/emails";
import type { EmailTemplateSlug, TemplateDataMap, SendEmailInput } from "@/emails/types";
import { sendEmailSchema } from "@/emails/types";

const resend = new Resend(config.email.resendApiKey);

const DEFAULT_FROM = "SponsorSync <notifications@sponsorsync.app>";

export interface SendEmailResult {
  id: string;
}

export async function sendEmail(payload: EmailPayload): Promise<SendEmailResult> {
  const html = await render(payload.react);
  const text = await render(payload.react, { plainText: true });

  const params: Record<string, unknown> = {
    from: DEFAULT_FROM,
    to: payload.to,
    subject: payload.subject,
    html,
    text,
  };

  if (payload.cc) params.cc = payload.cc;
  if (payload.bcc) params.bcc = payload.bcc;
  if (payload.replyTo) params.replyTo = payload.replyTo;
  if (payload.scheduledAt) params.scheduledAt = payload.scheduledAt;

  const { data, error } = await resend.emails.send(params as unknown as Parameters<typeof resend.emails.send>[0]);

  if (error) {
    throw new Error(`Email delivery failed: ${error.message}`);
  }

  return { id: data!.id };
}

export async function sendTemplatedEmail<T extends EmailTemplateSlug>(
  slug: T,
  data: TemplateDataMap[T],
  options: Omit<EmailPayload, "subject" | "react">
): Promise<SendEmailResult> {
  const validation = validateTemplateData(slug, data);
  if (!validation.success) {
    throw new Error(`Template validation failed for "${slug}": ${validation.error}`);
  }

  const subject = getTemplateSubject(slug, data);
  const Component = getTemplateComponent(slug);

  const React = await import("react");
  const react = React.createElement(Component, data as React.Attributes & TemplateDataMap[T]);

  return sendEmail({
    ...options,
    subject,
    react,
  });
}

export async function processSendEmailRequest(input: SendEmailInput): Promise<SendEmailResult> {
  const parsed = sendEmailSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(
      `Invalid email request: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`
    );
  }

  const { to, cc, bcc, replyTo, template, templateData, scheduledAt } = parsed.data;

  return sendTemplatedEmail(
    template,
    templateData as TemplateDataMap[typeof template],
    {
      to,
      cc,
      bcc,
      replyTo,
      scheduledAt,
    }
  );
}

export { resend };
