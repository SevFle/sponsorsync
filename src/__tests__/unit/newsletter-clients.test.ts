import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createConvertKitClient,
  createMailchimpClient,
  NewsletterApiError,
} from "@/lib/integrations/newsletter/clients";

function mockOkResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as Response;
}

function mockErrorResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ error: "API error" }),
  } as Response;
}

describe("createConvertKitClient", () => {
  let client: ReturnType<typeof createConvertKitClient>;

  beforeEach(() => {
    client = createConvertKitClient("ck-test-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an object with getSubscribers and getCampaigns", () => {
    expect(client).toHaveProperty("getSubscribers");
    expect(client).toHaveProperty("getCampaigns");
    expect(typeof client.getSubscribers).toBe("function");
    expect(typeof client.getCampaigns).toBe("function");
  });

  describe("getSubscribers", () => {
    it("fetches from ConvertKit subscribers endpoint with api_secret", async () => {
      const mockSubscribers = [{ id: 1, email: "a@b.com" }];
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockOkResponse({ subscribers: mockSubscribers })
      );

      const result = await client.getSubscribers();

      expect(fetch).toHaveBeenCalledWith(
        "https://api.convertkit.com/v3/subscribers?api_secret=ck-test-key"
      );
      expect(result).toEqual(mockSubscribers);
    });

    it("returns empty array when response has no subscribers key", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(mockOkResponse({}));

      const result = await client.getSubscribers();
      expect(result).toEqual([]);
    });

    it("throws NewsletterApiError on non-ok response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(mockErrorResponse(401));

      await expect(client.getSubscribers()).rejects.toThrow(NewsletterApiError);
      await expect(client.getSubscribers()).rejects.toThrow(
        "[convertkit] API request failed with status 401"
      );
    });

    it("throws NewsletterApiError with correct provider and status", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(mockErrorResponse(500));

      try {
        await client.getSubscribers();
      } catch (e) {
        expect(e).toBeInstanceOf(NewsletterApiError);
        expect((e as NewsletterApiError).provider).toBe("convertkit");
        expect((e as NewsletterApiError).statusCode).toBe(500);
      }
    });
  });

  describe("getCampaigns", () => {
    it("fetches from ConvertKit campaigns endpoint with api_secret", async () => {
      const mockCampaigns = [{ id: 1, name: "Campaign 1" }];
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockOkResponse({ campaigns: mockCampaigns })
      );

      const result = await client.getCampaigns();

      expect(fetch).toHaveBeenCalledWith(
        "https://api.convertkit.com/v3/campaigns?api_secret=ck-test-key"
      );
      expect(result).toEqual(mockCampaigns);
    });

    it("returns empty array when response has no campaigns key", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(mockOkResponse({}));

      const result = await client.getCampaigns();
      expect(result).toEqual([]);
    });

    it("throws NewsletterApiError on non-ok response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(mockErrorResponse(403));

      await expect(client.getCampaigns()).rejects.toThrow(NewsletterApiError);
      await expect(client.getCampaigns()).rejects.toThrow(
        "[convertkit] API request failed with status 403"
      );
    });
  });
});

describe("createMailchimpClient", () => {
  let client: ReturnType<typeof createMailchimpClient>;

  beforeEach(() => {
    client = createMailchimpClient("mc-test-key", "us1");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an object with getSubscribers and getCampaigns", () => {
    expect(client).toHaveProperty("getSubscribers");
    expect(client).toHaveProperty("getCampaigns");
  });

  describe("getSubscribers", () => {
    it("fetches from Mailchimp lists endpoint with basic auth", async () => {
      const mockLists = [{ id: "list1", name: "My List" }];
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockOkResponse({ lists: mockLists })
      );

      const result = await client.getSubscribers();

      expect(fetch).toHaveBeenCalledWith(
        "https://us1.api.mailchimp.com/3.0/lists",
        expect.objectContaining({
          headers: { Authorization: expect.stringMatching(/^Basic /) },
        })
      );
      expect(result).toEqual(mockLists);
    });

    it("uses correct base64 auth header", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockOkResponse({ lists: [] })
      );

      await client.getSubscribers();
      const expectedAuth = Buffer.from("any:mc-test-key").toString("base64");

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { Authorization: `Basic ${expectedAuth}` },
        })
      );
    });

    it("returns empty array when response has no lists key", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(mockOkResponse({}));

      const result = await client.getSubscribers();
      expect(result).toEqual([]);
    });

    it("throws NewsletterApiError on non-ok response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(mockErrorResponse(401));

      await expect(client.getSubscribers()).rejects.toThrow(NewsletterApiError);
      await expect(client.getSubscribers()).rejects.toThrow(
        "[mailchimp] API request failed with status 401"
      );
    });

    it("throws NewsletterApiError with correct provider and status", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(mockErrorResponse(404));

      try {
        await client.getSubscribers();
      } catch (e) {
        expect(e).toBeInstanceOf(NewsletterApiError);
        expect((e as NewsletterApiError).provider).toBe("mailchimp");
        expect((e as NewsletterApiError).statusCode).toBe(404);
      }
    });
  });

  describe("getCampaigns", () => {
    it("fetches from Mailchimp campaigns endpoint", async () => {
      const mockCampaigns = [{ id: "c1", title: "Camp" }];
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockOkResponse({ campaigns: mockCampaigns })
      );

      const result = await client.getCampaigns();

      expect(fetch).toHaveBeenCalledWith(
        "https://us1.api.mailchimp.com/3.0/campaigns",
        expect.objectContaining({
          headers: { Authorization: expect.stringMatching(/^Basic /) },
        })
      );
      expect(result).toEqual(mockCampaigns);
    });

    it("returns empty array when response has no campaigns key", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(mockOkResponse({}));

      const result = await client.getCampaigns();
      expect(result).toEqual([]);
    });

    it("throws NewsletterApiError on non-ok response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(mockErrorResponse(500));

      await expect(client.getCampaigns()).rejects.toThrow(NewsletterApiError);
      await expect(client.getCampaigns()).rejects.toThrow(
        "[mailchimp] API request failed with status 500"
      );
    });
  });
});

describe("NewsletterApiError", () => {
  it("has correct name and properties", () => {
    const err = new NewsletterApiError("convertkit", 401, "Unauthorized");
    expect(err.name).toBe("NewsletterApiError");
    expect(err.provider).toBe("convertkit");
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("[convertkit] Unauthorized");
  });

  it("is an instance of Error", () => {
    const err = new NewsletterApiError("mailchimp", 500, "Server error");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(NewsletterApiError);
  });
});
