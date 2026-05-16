import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/webhooks/podcast/route";
import { createPodcastClient } from "@/lib/integrations/podcast/clients";
import { decrypt } from "@/lib/security/encryption";

vi.mock("@/lib/security/encryption", () => ({
  decrypt: vi.fn((text: string) => text),
}));

vi.mock("@/lib/integrations/podcast/clients", () => ({
  createPodcastClient: vi.fn(() => ({
    getEpisodes: vi.fn(async () => []),
    getEpisode: vi.fn(async () => null),
    getShow: vi.fn(async () => ({})),
  })),
}));

const WEBHOOK_SECRET = "test-webhook-secret";

async function computeSignature(payload: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return Array.from(new Uint8Array(sig), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

async function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  const rawBody = typeof body === "string" ? body : JSON.stringify(body);
  const signature = await computeSignature(rawBody);
  return new Request("http://localhost:3000/api/webhooks/podcast", {
    method: "POST",
    body: rawBody,
    headers: {
      "Content-Type": "application/json",
      "x-webhook-signature": signature,
      "x-platform": "buzzsprout",
      ...headers,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.BUZZSPROUT_API_KEY;
  delete process.env.TRANSISTOR_API_KEY;
  delete process.env.BUZZSPROUT_PODCAST_ID;
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  process.env.PODCAST_WEBHOOK_SECRET = WEBHOOK_SECRET;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.BUZZSPROUT_API_KEY;
  delete process.env.TRANSISTOR_API_KEY;
  delete process.env.BUZZSPROUT_PODCAST_ID;
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  delete process.env.PODCAST_WEBHOOK_SECRET;
});

describe("POST /api/webhooks/podcast – edge cases", () => {
  it("episode.deleted event skips enrichment even when API key is configured", async () => {
    process.env.BUZZSPROUT_API_KEY = "some-key";
    const payload = {
      event: "episode_deleted",
      episode: { id: 77, title: "Gone" },
    };

    const response = await POST(await makeRequest(payload));
    expect(response.status).toBe(200);
    expect(createPodcastClient).not.toHaveBeenCalled();
  });

  it("decrypts API key when NODE_ENV is production", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.BUZZSPROUT_API_KEY = "enc::cipherkey";
    const payload = {
      event: "episode_published",
      episode: { id: 1, title: "Prod Episode" },
    };

    const response = await POST(await makeRequest(payload));
    expect(response.status).toBe(200);
    expect(decrypt).toHaveBeenCalledWith("enc::cipherkey");
  });

  it("skips enrichment when no API key is configured for published event", async () => {
    const payload = {
      event: "episode_published",
      episode: { id: 5, title: "No Key" },
    };

    const response = await POST(await makeRequest(payload));
    expect(response.status).toBe(200);
    expect(createPodcastClient).not.toHaveBeenCalled();
  });

  it("skips enrichment when no API key is configured for updated event", async () => {
    const payload = {
      event: "episode_updated",
      episode: { id: 6, title: "No Key Update" },
    };

    const response = await POST(await makeRequest(payload));
    expect(response.status).toBe(200);
    expect(createPodcastClient).not.toHaveBeenCalled();
  });

  it("attempts enrichment for Transistor webhook when TRANSISTOR_API_KEY is set", async () => {
    process.env.TRANSISTOR_API_KEY = "transistor-key";
    const payload = {
      event_name: "episode_created",
      data: {
        id: "ep-tr-1",
        attributes: { title: "Transistor Enrich" },
      },
    };

    const response = await POST(
      await makeRequest(payload, { "x-platform": "transistor" })
    );
    expect(response.status).toBe(200);
    expect(createPodcastClient).toHaveBeenCalledWith(
      "transistor",
      expect.objectContaining({ apiKey: "transistor-key" })
    );
  });

  it("uses current time as timestamp fallback for Buzzsprout when published_at is null", async () => {
    const before = new Date().toISOString();
    const payload = {
      event: "episode_published",
      episode: { id: 10, title: "No Date", published_at: null },
    };

    const response = await POST(await makeRequest(payload));
    const body = await response.json();
    const after = new Date().toISOString();

    expect(response.status).toBe(200);
    expect(body.event.timestamp >= before).toBe(true);
    expect(body.event.timestamp <= after).toBe(true);
  });

  it("uses current time as timestamp fallback for Buzzsprout when published_at is missing", async () => {
    const before = new Date().toISOString();
    const payload = {
      event: "episode_updated",
      episode: { id: 11, title: "No Date Field" },
    };

    const response = await POST(await makeRequest(payload));
    const body = await response.json();
    const after = new Date().toISOString();

    expect(response.status).toBe(200);
    expect(body.event.timestamp >= before).toBe(true);
    expect(body.event.timestamp <= after).toBe(true);
  });

  it("uses current time as timestamp fallback for Transistor when published_at is null", async () => {
    const before = new Date().toISOString();
    const payload = {
      event_name: "episode_created",
      data: {
        id: "ep-td",
        attributes: { title: "No Date Transistor", published_at: null },
      },
    };

    const response = await POST(
      await makeRequest(payload, { "x-platform": "transistor" })
    );
    const body = await response.json();
    const after = new Date().toISOString();

    expect(response.status).toBe(200);
    expect(body.event.timestamp >= before).toBe(true);
    expect(body.event.timestamp <= after).toBe(true);
  });

  it("uses current time as timestamp fallback for Transistor when published_at is missing", async () => {
    const before = new Date().toISOString();
    const payload = {
      event_name: "episode_updated",
      data: {
        id: "ep-td2",
        attributes: { title: "No Date Field Transistor" },
      },
    };

    const response = await POST(
      await makeRequest(payload, { "x-platform": "transistor" })
    );
    const body = await response.json();
    const after = new Date().toISOString();

    expect(response.status).toBe(200);
    expect(body.event.timestamp >= before).toBe(true);
    expect(body.event.timestamp <= after).toBe(true);
  });

  it("defaults to episode.updated for unknown Transistor event_name", async () => {
    const payload = {
      event_name: "something_weird",
      data: {
        id: "ep-unknown",
        attributes: { title: "Unknown Event" },
      },
    };

    const response = await POST(
      await makeRequest(payload, { "x-platform": "transistor" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.event.eventType).toBe("episode.updated");
  });

  it("processes Buzzsprout webhook with all optional fields null", async () => {
    const payload = {
      event: "episode_published",
      episode: {
        id: 200,
        title: "Minimal",
        description: null,
        audio_url: null,
        duration: null,
        published_at: null,
        season_number: null,
        episode_number: null,
        artwork_url: null,
        tags: null,
      },
    };

    const response = await POST(await makeRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.received).toBe(true);
    expect(body.event.episodeId).toBe("200");
    expect(body.event.episodeTitle).toBe("Minimal");
    expect(body.event.platform).toBe("buzzsprout");
  });

  it("processes Transistor webhook with all optional attribute fields null", async () => {
    const payload = {
      event_name: "episode_updated",
      data: {
        id: "ep-min",
        attributes: {
          title: "Minimal Transistor",
          published_at: null,
          audio_url: null,
          duration: null,
          description: null,
          keywords: null,
        },
      },
    };

    const response = await POST(
      await makeRequest(payload, { "x-platform": "transistor" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.received).toBe(true);
    expect(body.event.episodeId).toBe("ep-min");
    expect(body.event.episodeTitle).toBe("Minimal Transistor");
    expect(body.event.platform).toBe("transistor");
  });

  it("coerces numeric Buzzsprout episode ID to string in response", async () => {
    const payload = {
      event: "episode_published",
      episode: { id: 123456789, title: "Coerce Me" },
    };

    const response = await POST(await makeRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.event.episodeId).toBe("123456789");
    expect(typeof body.event.episodeId).toBe("string");
  });

  it("coerces zero Buzzsprout episode ID to string '0'", async () => {
    const payload = {
      event: "episode_published",
      episode: { id: 0, title: "Zero ID" },
    };

    const response = await POST(await makeRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.event.episodeId).toBe("0");
  });

  it("returns correct event structure with exactly the expected keys", async () => {
    const payload = {
      event: "episode_published",
      episode: {
        id: 42,
        title: "Struct Check",
        published_at: "2026-05-10T10:00:00Z",
      },
    };

    const response = await POST(await makeRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      received: true,
      event: {
        platform: "buzzsprout",
        eventType: "episode.published",
        episodeId: "42",
        episodeTitle: "Struct Check",
        timestamp: "2026-05-10T10:00:00Z",
      },
    });
  });

  it("returns correct event structure for Transistor", async () => {
    const payload = {
      event_name: "episode_deleted",
      data: {
        id: "ep-del",
        attributes: {
          title: "Delete Struct",
          published_at: "2026-06-01T00:00:00Z",
        },
      },
    };

    const response = await POST(
      await makeRequest(payload, { "x-platform": "transistor" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      received: true,
      event: {
        platform: "transistor",
        eventType: "episode.deleted",
        episodeId: "ep-del",
        episodeTitle: "Delete Struct",
        timestamp: "2026-06-01T00:00:00Z",
      },
    });
  });

  it("does not leak state between sequential calls", async () => {
    const first = {
      event: "episode_published",
      episode: { id: 1, title: "First", published_at: "2026-01-01T00:00:00Z" },
    };
    const second = {
      event_name: "episode_updated",
      data: {
        id: "second-ep",
        attributes: { title: "Second", published_at: "2026-02-02T00:00:00Z" },
      },
    };

    const response1 = await POST(await makeRequest(first));
    const body1 = await response1.json();
    const response2 = await POST(
      await makeRequest(second, { "x-platform": "transistor" })
    );
    const body2 = await response2.json();

    expect(body1.event.platform).toBe("buzzsprout");
    expect(body1.event.eventType).toBe("episode.published");
    expect(body1.event.episodeId).toBe("1");
    expect(body1.event.episodeTitle).toBe("First");

    expect(body2.event.platform).toBe("transistor");
    expect(body2.event.eventType).toBe("episode.updated");
    expect(body2.event.episodeId).toBe("second-ep");
    expect(body2.event.episodeTitle).toBe("Second");
  });

  it("does not leak state when first call has API key and second does not", async () => {
    process.env.BUZZSPROUT_API_KEY = "key-one";
    const first = {
      event: "episode_published",
      episode: { id: 10, title: "With Key" },
    };

    const response1 = await POST(await makeRequest(first));
    expect(response1.status).toBe(200);
    expect(createPodcastClient).toHaveBeenCalledTimes(1);

    delete process.env.BUZZSPROUT_API_KEY;
    vi.clearAllMocks();

    const second = {
      event: "episode_updated",
      episode: { id: 20, title: "Without Key" },
    };

    const response2 = await POST(await makeRequest(second));
    expect(response2.status).toBe(200);
    expect(createPodcastClient).not.toHaveBeenCalled();
  });

  it("uses passed podcastId from env for Buzzsprout enrichment", async () => {
    process.env.BUZZSPROUT_API_KEY = "buzz-key";
    process.env.BUZZSPROUT_PODCAST_ID = "my-show-123";
    const payload = {
      event: "episode_published",
      episode: { id: 55, title: "With Podcast ID" },
    };

    const response = await POST(await makeRequest(payload));
    expect(response.status).toBe(200);
    expect(createPodcastClient).toHaveBeenCalledWith(
      "buzzsprout",
      expect.objectContaining({
        apiKey: "buzz-key",
        podcastId: "my-show-123",
      })
    );
  });

  it("does not call decrypt in non-production environment", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    process.env.BUZZSPROUT_API_KEY = "plain-key";
    const payload = {
      event: "episode_published",
      episode: { id: 3, title: "Dev Episode" },
    };

    const response = await POST(await makeRequest(payload));
    expect(response.status).toBe(200);
    expect(decrypt).not.toHaveBeenCalled();
    expect(createPodcastClient).toHaveBeenCalledWith(
      "buzzsprout",
      expect.objectContaining({ apiKey: "plain-key" })
    );
  });
});
