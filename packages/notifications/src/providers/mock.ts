import type { SendEmailParams, SendEmailResult, EmailProvider } from "./types";

export interface SentEmailRecord {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
}

export class MockEmailProvider implements EmailProvider {
  public sentEmails: SentEmailRecord[] = [];
  private shouldFail = false;
  private failMessage = "Mock send failure";

  constructor(options?: { shouldFail?: boolean; failMessage?: string }) {
    if (options?.shouldFail) this.shouldFail = true;
    if (options?.failMessage) this.failMessage = options.failMessage;
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    if (this.shouldFail) {
      return { success: false, error: this.failMessage };
    }

    this.sentEmails.push({
      to: params.to,
      from: params.from,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    return { success: true, messageId: `mock-${Date.now()}` };
  }

  clear(): void {
    this.sentEmails = [];
  }

  get lastEmail(): SentEmailRecord | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }
}

export class ConsoleEmailProvider implements EmailProvider {
  async send(params: SendEmailParams): Promise<SendEmailResult> {
    console.log(
      `[EMAIL] To: ${params.to}, From: ${params.from}, Subject: ${params.subject}`
    );
    return { success: true, messageId: `console-${Date.now()}` };
  }
}
