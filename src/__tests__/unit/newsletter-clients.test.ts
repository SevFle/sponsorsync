import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createConvertKitClient, createMailchimpClient } from "@/lib/integrations/newsletter/clients";

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
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        json: () => Promise.resolve({ subscribers: mockSubscribers }),
      } as Response);

      const result = await client.getSubscribers();

      expect(fetch).toHaveBeenCalledWith(
        "https://api.convertkit.com/v3/subscribers?api_secret=ck-test-key"
      );
      expect(result).toEqual(mockSubscribers);
    });

    it("returns empty array when response has no subscribers key", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        json: () => Promise.resolve({}),
      } as Response);

      const result = await client.getSubscribers();
      expect(result).toEqual([]);
    });
  });

  describe("getCampaigns", () => {
    it("fetches from ConvertKit campaigns endpoint with api_secret", async () => {
      const mockCampaigns = [{ id: 1, name: "Campaign 1" }];
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        json: () => Promise.resolve({ campaigns: mockCampaigns }),
      } as Response);

      const result = await client.getCampaigns();

      expect(fetch).toHaveBeenCalledWith(
        "https://api.convertkit.com/v3/campaigns?api_secret=ck-test-key"
      );
      expect(result).toEqual(mockCampaigns);
    });

    it("returns empty array when response has no campaigns key", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        json: () => Promise.resolve({}),
      } as Response);

      const result = await client.getCampaigns();
      expect(result).toEqual([]);
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
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        json: () => Promise.resolve({ lists: mockLists }),
      } as Response);

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
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        json: () => Promise.resolve({ lists: [] }),
      } as Response);

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
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        json: () => Promise.resolve({}),
      } as Response);

      const result = await client.getSubscribers();
      expect(result).toEqual([]);
    });
  });

  describe("getCampaigns", () => {
    it("fetches from Mailchimp campaigns endpoint", async () => {
      const mockCampaigns = [{ id: "c1", title: "Camp" }];
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        json: () => Promise.resolve({ campaigns: mockCampaigns }),
      } as Response);

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
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        json: () => Promise.resolve({}),
      } as Response);

      const result = await client.getCampaigns();
      expect(result).toEqual([]);
    });
  });
});
