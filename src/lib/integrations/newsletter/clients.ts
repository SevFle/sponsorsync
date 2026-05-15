export interface NewsletterClient {
  getSubscribers(): Promise<unknown[]>;
  getCampaigns(): Promise<unknown[]>;
}

export class NewsletterApiError extends Error {
  constructor(
    public readonly provider: string,
    public readonly statusCode: number,
    message: string
  ) {
    super(`[${provider}] ${message}`);
    this.name = "NewsletterApiError";
  }
}

export function createConvertKitClient(apiKey: string): NewsletterClient {
  const baseUrl = "https://api.convertkit.com/v3";
  return {
    async getSubscribers() {
      const res = await fetch(`${baseUrl}/subscribers?api_secret=${apiKey}`);
      if (!res.ok) {
        throw new NewsletterApiError(
          "convertkit",
          res.status,
          `API request failed with status ${res.status}`
        );
      }
      const data = await res.json();
      return data.subscribers ?? [];
    },
    async getCampaigns() {
      const res = await fetch(`${baseUrl}/campaigns?api_secret=${apiKey}`);
      if (!res.ok) {
        throw new NewsletterApiError(
          "convertkit",
          res.status,
          `API request failed with status ${res.status}`
        );
      }
      const data = await res.json();
      return data.campaigns ?? [];
    },
  };
}

export function createMailchimpClient(apiKey: string, serverPrefix: string): NewsletterClient {
  const baseUrl = `https://${serverPrefix}.api.mailchimp.com/3.0`;
  const auth = Buffer.from(`any:${apiKey}`).toString("base64");
  return {
    async getSubscribers() {
      const res = await fetch(`${baseUrl}/lists`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!res.ok) {
        throw new NewsletterApiError(
          "mailchimp",
          res.status,
          `API request failed with status ${res.status}`
        );
      }
      const data = await res.json();
      return data.lists ?? [];
    },
    async getCampaigns() {
      const res = await fetch(`${baseUrl}/campaigns`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!res.ok) {
        throw new NewsletterApiError(
          "mailchimp",
          res.status,
          `API request failed with status ${res.status}`
        );
      }
      const data = await res.json();
      return data.campaigns ?? [];
    },
  };
}
