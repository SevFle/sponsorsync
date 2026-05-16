import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/webhooks/podcast/route";

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
  process.env.PODCAST_WEBHOOK_SECRET = WEBHOOK_SECRET;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.BUZZSPROUT_API_KEY;
  delete process.env.TRANSISTOR_API_KEY;
  delete process.env.BUZZSPROUT_PODCAST_ID;
  delete process.env.PODCAST_WEBHOOK_SECRET;
});

describe("POST /api/webhooks/podcast", () => {
  it("returns 401 when webhook signature is missing", async () => {
    const request = new Request("http://localhost:3000/api/webhooks/podcast", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Missing webhook signature");
  });

  it("returns 401 when webhook signature is invalid", async () => {
    const request = new Request("http://localhost:3000/api/webhooks/podcast", {
      method: "POST",
      body: JSON.stringify({ event: "episode_published", episode: { id: 1, title: "Test" } }),
      headers: {
        "Content-Type": "application/json",
        "x-webhook-signature": "tampered-signature-value",
        "x-platform": "buzzsprout",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid webhook signature");
  });

  it("returns 500 when PODCAST_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.PODCAST_WEBHOOK_SECRET;
    const request = new Request("http://localhost:3000/api/webhooks/podcast", {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
        "x-webhook-signature": "some-sig",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Webhook not configured");
  });

  it("returns 400 when x-platform header is missing", async () => {
    const rawBody = JSON.stringify({});
    const signature = await computeSignature(rawBody);
    const request = new Request("http://localhost:3000/api/webhooks/podcast", {
      method: "POST",
      body: rawBody,
      headers: {
        "Content-Type": "application/json",
        "x-webhook-signature": signature,
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid or missing x-platform header");
  });

  it("returns 400 for unsupported platform", async () => {
    const response = await POST(
      await makeRequest({}, { "x-platform": "spotify" })
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid or missing x-platform header");
  });

  it("returns 400 for invalid JSON", async () => {
    const rawBody = "not valid json{{{";
    const signature = await computeSignature(rawBody);
    const request = new Request("http://localhost:3000/api/webhooks/podcast", {
      method: "POST",
      body: rawBody,
      headers: {
        "Content-Type": "application/json",
        "x-webhook-signature": signature,
        "x-platform": "buzzsprout",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid JSON payload");
  });

  describe("Buzzsprout webhooks", () => {
    it("processes episode_published event", async () => {
      const payload = {
        event: "episode_published",
        episode: {
          id: 42,
          title: "New Episode",
          published_at: "2026-05-10T10:00:00Z",
          status: "published",
        },
      };

      const response = await POST(await makeRequest(payload));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.received).toBe(true);
      expect(body.event.platform).toBe("buzzsprout");
      expect(body.event.eventType).toBe("episode.published");
      expect(body.event.episodeId).toBe("42");
      expect(body.event.episodeTitle).toBe("New Episode");
    });

    it("processes episode_updated event", async () => {
      const payload = {
        event: "episode_updated",
        episode: {
          id: 99,
          title: "Updated Episode",
        },
      };

      const response = await POST(await makeRequest(payload));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.event.eventType).toBe("episode.updated");
    });

    it("processes episode_deleted event", async () => {
      const payload = {
        event: "episode_deleted",
        episode: {
          id: 100,
          title: "Deleted Episode",
        },
      };

      const response = await POST(await makeRequest(payload));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.event.eventType).toBe("episode.deleted");
    });

    it("returns 400 for invalid buzzsprout payload", async () => {
      const response = await POST(
        await makeRequest({ invalid: "payload" })
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid Buzzsprout webhook payload");
      expect(body.details).toBeDefined();
    });

    it("defaults to episode.updated for unknown event types", async () => {
      const payload = {
        event: "unknown_event",
        episode: {
          id: 1,
          title: "Test",
        },
      };

      const response = await POST(await makeRequest(payload));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.event.eventType).toBe("episode.updated");
    });
  });

  describe("Transistor webhooks", () => {
    it("processes episode_created event", async () => {
      const payload = {
        event_name: "episode_created",
        data: {
          id: "ep-transistor-1",
          type: "episode",
          attributes: {
            title: "New Transistor Episode",
            status: "published",
            published_at: "2026-05-10T10:00:00Z",
          },
        },
      };

      const response = await POST(
        await makeRequest(payload, { "x-platform": "transistor" })
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.received).toBe(true);
      expect(body.event.platform).toBe("transistor");
      expect(body.event.eventType).toBe("episode.published");
      expect(body.event.episodeId).toBe("ep-transistor-1");
      expect(body.event.episodeTitle).toBe("New Transistor Episode");
    });

    it("processes episode_updated event", async () => {
      const payload = {
        event_name: "episode_updated",
        data: {
          id: "ep-2",
          attributes: {
            title: "Updated Episode",
          },
        },
      };

      const response = await POST(
        await makeRequest(payload, { "x-platform": "transistor" })
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.event.eventType).toBe("episode.updated");
    });

    it("processes episode_deleted event", async () => {
      const payload = {
        event_name: "episode_deleted",
        data: {
          id: "ep-3",
          attributes: {
            title: "Deleted Episode",
          },
        },
      };

      const response = await POST(
        await makeRequest(payload, { "x-platform": "transistor" })
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.event.eventType).toBe("episode.deleted");
    });

    it("returns 400 for invalid transistor payload", async () => {
      const response = await POST(
        await makeRequest({ bad: "data" }, { "x-platform": "transistor" })
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid Transistor webhook payload");
      expect(body.details).toBeDefined();
    });
  });

  describe("Webhook enrichment", () => {
    it("attempts episode enrichment when API key is configured", async () => {
      process.env.BUZZSPROUT_API_KEY = "test-key";
      const payload = {
        event: "episode_published",
        episode: {
          id: 42,
          title: "Test Episode",
          published_at: "2026-05-10T10:00:00Z",
        },
      };

      const response = await POST(await makeRequest(payload));
      expect(response.status).toBe(200);
    });

    it("succeeds even when enrichment fails", async () => {
      process.env.TRANSISTOR_API_KEY = "test-key";
      const { createPodcastClient } = await import("@/lib/integrations/podcast/clients");
      (createPodcastClient as ReturnType<typeof vi.fn>).mockReturnValue({
        getEpisode: vi.fn(async () => {
          throw new Error("API error");
        }),
      });

      const payload = {
        event_name: "episode_created",
        data: {
          id: "ep-1",
          attributes: { title: "Test" },
        },
      };

      const response = await POST(
        await makeRequest(payload, { "x-platform": "transistor" })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("Webhook signature validation", () => {
    it("rejects request with signature from wrong secret", async () => {
      const payload = JSON.stringify({
        event: "episode_published",
        episode: { id: 1, title: "Test" },
      });
      const key = await globalThis.crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode("wrong-secret"),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sig = await globalThis.crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(payload)
      );
      const signature = Array.from(new Uint8Array(sig), (b) =>
        b.toString(16).padStart(2, "0")
      ).join("");

      const request = new Request("http://localhost:3000/api/webhooks/podcast", {
        method: "POST",
        body: payload,
        headers: {
          "Content-Type": "application/json",
          "x-webhook-signature": signature,
          "x-platform": "buzzsprout",
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("accepts request with valid HMAC signature", async () => {
      const payload = {
        event: "episode_published",
        episode: { id: 1, title: "Valid Sig" },
      };
      const response = await POST(await makeRequest(payload));
      expect(response.status).toBe(200);
    });

    it("rejects empty signature string", async () => {
      const request = new Request("http://localhost:3000/api/webhooks/podcast", {
        method: "POST",
        body: JSON.stringify({ event: "episode_published", episode: { id: 1, title: "Test" } }),
        headers: {
          "Content-Type": "application/json",
          "x-webhook-signature": "",
          "x-platform": "buzzsprout",
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Missing webhook signature");
    });
  });
});
