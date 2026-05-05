import { Resend } from "resend";
import type { EmailProvider, SendEmailParams, SendEmailResult } from "./types";

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      throw new Error(
        "RESEND_API_KEY environment variable is required. " +
          "Set it to your Resend API key (re_xxxx)."
      );
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export function resetResendClient(): void {
  resendClient = null;
}

export class ResendProvider implements EmailProvider {
  async send(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const client = getResendClient();
      const { data, error } = await client.emails.send({
        to: params.to,
        from: params.from,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, messageId: data?.id };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error sending email";
      return { success: false, error: message };
    }
  }
}

export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const provider = new ResendProvider();
  return provider.send(params);
}
