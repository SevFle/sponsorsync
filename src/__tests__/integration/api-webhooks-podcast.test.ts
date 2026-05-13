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

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.BUZZSPROUT_API_KEY;
  delete process.env.TRANSISTOR_API_KEY;
  delete process.env.BUZZSPROUT_PODCAST_ID;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.BUZZSPROUT_API_KEY;
  delete process.env.TRANSISTOR_API_KEY;
  delete process.env.BUZZSPROUT_PODCAST_ID;
});

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/webhooks/podcast", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-webhook-signature": "test-signature",
      "x-platform": "buzzsprout",
      ...headers,
    },
  });
}

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

  it("returns 400 when x-platform header is missing", async () => {
    const request = new Request("http://localhost:3000/api/webhooks/podcast", {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
        "x-webhook-signature": "test-sig",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid or missing x-platform header");
  });

  it("returns 400 for unsupported platform", async () => {
    const request = makeRequest(
      {},
      { "x-platform": "spotify" }
    );

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid or missing x-platform header");
  });

  it("returns 400 for invalid JSON", async () => {
    const request = new Request("http://localhost:3000/api/webhooks/podcast", {
      method: "POST",
      body: "not valid json{{{",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-signature": "test-sig",
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

      const response = await POST(makeRequest(payload));
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

      const response = await POST(makeRequest(payload));
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

      const response = await POST(makeRequest(payload));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.event.eventType).toBe("episode.deleted");
    });

    it("returns 400 for invalid buzzsprout payload", async () => {
      const response = await POST(
        makeRequest({ invalid: "payload" })
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

      const response = await POST(makeRequest(payload));
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
        makeRequest(payload, { "x-platform": "transistor" })
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
        makeRequest(payload, { "x-platform": "transistor" })
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
        makeRequest(payload, { "x-platform": "transistor" })
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.event.eventType).toBe("episode.deleted");
    });

    it("returns 400 for invalid transistor payload", async () => {
      const response = await POST(
        makeRequest({ bad: "data" }, { "x-platform": "transistor" })
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

      const response = await POST(makeRequest(payload));
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
        makeRequest(payload, { "x-platform": "transistor" })
      );
      expect(response.status).toBe(200);
    });
  });
});
