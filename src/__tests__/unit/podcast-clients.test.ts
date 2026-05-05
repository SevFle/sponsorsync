import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBuzzsproutClient, createTransistorClient } from "@/lib/integrations/podcast/clients";

describe("createBuzzsproutClient", () => {
  let client: ReturnType<typeof createBuzzsproutClient>;

  beforeEach(() => {
    client = createBuzzsproutClient("bz-test-key", "12345");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an object with getEpisodes and getEpisode", () => {
    expect(client).toHaveProperty("getEpisodes");
    expect(client).toHaveProperty("getEpisode");
    expect(typeof client.getEpisodes).toBe("function");
    expect(typeof client.getEpisode).toBe("function");
  });

  describe("getEpisodes", () => {
    it("fetches from Buzzsprout episodes endpoint with token auth", async () => {
      const mockEpisodes = [{ id: 1, title: "Episode 1" }];
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        json: () => Promise.resolve(mockEpisodes),
      } as Response);

      const result = await client.getEpisodes();

      expect(fetch).toHaveBeenCalledWith(
        "https://www.buzzsprout.com/api/12345/episodes.json",
        { headers: { Authorization: "Token token=bz-test-key" } }
      );
      expect(result).toEqual(mockEpisodes);
    });
  });

  describe("getEpisode", () => {
    it("fetches single episode by id", async () => {
      const mockEpisode = { id: 42, title: "Episode 42" };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        json: () => Promise.resolve(mockEpisode),
      } as Response);

      const result = await client.getEpisode("42");

      expect(fetch).toHaveBeenCalledWith(
        "https://www.buzzsprout.com/api/12345/episodes/42.json",
        { headers: { Authorization: "Token token=bz-test-key" } }
      );
      expect(result).toEqual(mockEpisode);
    });
  });
});

describe("createTransistorClient", () => {
  let client: ReturnType<typeof createTransistorClient>;

  beforeEach(() => {
    client = createTransistorClient("tr-test-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an object with getEpisodes and getEpisode", () => {
    expect(client).toHaveProperty("getEpisodes");
    expect(client).toHaveProperty("getEpisode");
  });

  describe("getEpisodes", () => {
    it("fetches from Transistor episodes endpoint with x-api-key header", async () => {
      const mockEpisodes = [{ id: 1, title: "Ep 1" }];
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        json: () => Promise.resolve({ data: mockEpisodes }),
      } as Response);

      const result = await client.getEpisodes();

      expect(fetch).toHaveBeenCalledWith(
        "https://api.transistor.fm/v1/episodes",
        { headers: { "x-api-key": "tr-test-key" } }
      );
      expect(result).toEqual(mockEpisodes);
    });

    it("returns empty array when response has no data key", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        json: () => Promise.resolve({}),
      } as Response);

      const result = await client.getEpisodes();
      expect(result).toEqual([]);
    });
  });

  describe("getEpisode", () => {
    it("fetches single episode by id", async () => {
      const mockEpisode = { id: 99, title: "Ep 99" };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        json: () => Promise.resolve(mockEpisode),
      } as Response);

      const result = await client.getEpisode("99");

      expect(fetch).toHaveBeenCalledWith(
        "https://api.transistor.fm/v1/episodes/99",
        { headers: { "x-api-key": "tr-test-key" } }
      );
      expect(result).toEqual(mockEpisode);
    });
  });
});
