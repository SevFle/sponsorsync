import type { SendEmailParams, SendEmailResult, EmailProvider } from "./types";

interface SmsParams {
  to: string;
  from: string;
  body: string;
}

interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface SmsProvider {
  send(params: SmsParams): Promise<SmsResult>;
}

class TwilioProvider implements SmsProvider {
  private client: unknown = null;

  private getClient(): unknown {
    if (!this.client) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (!accountSid || !authToken) {
        throw new Error(
          "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables are required."
        );
      }
      try {
        const twilio = require("twilio");
        this.client = twilio(accountSid, authToken);
      } catch {
        throw new Error(
          "twilio package is not installed. Install it with: npm install twilio"
        );
      }
    }
    return this.client;
  }

  async send(params: SmsParams): Promise<SmsResult> {
    try {
      const client = this.getClient() as {
        messages: { create: (args: Record<string, string>) => Promise<{ sid: string }> };
      };
      const message = await client.messages.create({
        to: params.to,
        from: params.from,
        body: params.body,
      });
      return { success: true, messageId: message.sid };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error sending SMS";
      return { success: false, error: message };
    }
  }
}

class ConsoleSmsProvider implements SmsProvider {
  async send(params: SmsParams): Promise<SmsResult> {
    console.log(
      `[SMS] To: ${params.to}, From: ${params.from}, Body: ${params.body}`
    );
    return { success: true, messageId: `console-${Date.now()}` };
  }
}

let smsProvider: SmsProvider | null = null;

export function getSmsProvider(): SmsProvider {
  if (!smsProvider) {
    const provider = process.env.SMS_PROVIDER ?? "twilio";
    if (provider === "console") {
      smsProvider = new ConsoleSmsProvider();
    } else {
      smsProvider = new TwilioProvider();
    }
  }
  return smsProvider;
}

export function resetSmsProvider(): void {
  smsProvider = null;
}

export async function sendSms(params: SmsParams): Promise<SmsResult> {
  const provider = getSmsProvider();
  return provider.send(params);
}
