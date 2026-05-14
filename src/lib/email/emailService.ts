import { Resend } from "resend";
import { config } from "@/lib/config";
import { renderEmailFromTemplate, stripHandlebarsConditionals } from "./emailRenderer";
import { interpolateTemplate, validateVariables, extractVariablesFromTemplate } from "@/lib/templates/templateEngine";
import { resolveVariables, type VariableContext } from "@/lib/templates/variableResolver";

let _resend: Resend | undefined;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = config.email.resendApiKey;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured.");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

export function _resetResendClient(): void {
  _resend = undefined;
}

const DEFAULT_FROM = "SponsorSync <notifications@sponsorsync.app>";

const RATE_LIMIT_MAX = 50;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

export interface SendTemplateEmailOptions {
  subject: string;
  body: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  variables: Record<string, string>;
}

export async function sendTemplateEmail(options: SendTemplateEmailOptions): Promise<{ id: string }> {
  const client = getResend();

  const cleanedBody = stripHandlebarsConditionals(options.body);
  const rendered = renderEmailFromTemplate(options.subject, cleanedBody, options.variables);

  const params: Record<string, unknown> = {
    from: DEFAULT_FROM,
    to: options.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  };

  if (options.cc) params.cc = options.cc;
  if (options.bcc) params.bcc = options.bcc;
  if (options.replyTo) params.replyTo = options.replyTo;

  const { data, error } = await client.emails.send(
    params as unknown as Parameters<typeof client.emails.send>[0]
  );

  if (error) {
    throw new Error(`Email delivery failed: ${error.message}`);
  }

  return { id: data!.id };
}

export interface PreviewTemplateEmailOptions {
  subject: string;
  body: string;
  variables: Record<string, string>;
}

export function previewTemplateEmail(options: PreviewTemplateEmailOptions) {
  const cleanedBody = stripHandlebarsConditionals(options.body);
  return renderEmailFromTemplate(options.subject, cleanedBody, options.variables);
}
