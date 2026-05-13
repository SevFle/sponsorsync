import { NextResponse } from "next/server";
import { z } from "zod";
import type { PodcastWebhookEvent, PodcastPlatform } from "@/lib/integrations/podcast/types";
import { episodeToVerificationData } from "@/lib/integrations/podcast/mapper";
import { decrypt } from "@/lib/security/encryption";
import { createPodcastClient } from "@/lib/integrations/podcast/clients";

const buzzsproutWebhookSchema = z.object({
  event: z.string(),
  episode: z.object({
    id: z.union([z.number(), z.string()]),
    title: z.string(),
    description: z.string().nullable().optional(),
    audio_url: z.string().nullable().optional(),
    duration: z.number().nullable().optional(),
    published_at: z.string().nullable().optional(),
    status: z.string().optional(),
    season_number: z.number().nullable().optional(),
    episode_number: z.number().nullable().optional(),
    artwork_url: z.string().nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
  }),
});

const transistorWebhookSchema = z.object({
  event_name: z.string(),
  data: z.object({
    id: z.string(),
    type: z.string().optional(),
    attributes: z.object({
      title: z.string(),
      status: z.string().optional(),
      published_at: z.string().nullable().optional(),
      audio_url: z.string().nullable().optional(),
      duration: z.number().nullable().optional(),
      description: z.string().nullable().optional(),
      keywords: z.array(z.string()).nullable().optional(),
    }),
  }),
});

function buildBuzzsproutEvent(
  body: z.infer<typeof buzzsproutWebhookSchema>
): PodcastWebhookEvent {
  const eventTypeMap: Record<string, PodcastWebhookEvent["eventType"]> = {
    episode_published: "episode.published",
    episode_updated: "episode.updated",
    episode_deleted: "episode.deleted",
  };

  const ep = body.episode;
  return {
    platform: "buzzsprout",
    eventType: eventTypeMap[body.event] ?? "episode.updated",
    episodeId: String(ep.id),
    episodeTitle: ep.title,
    timestamp: ep.published_at ?? new Date().toISOString(),
    raw: body as unknown as Record<string, unknown>,
  };
}

function buildTransistorEvent(
  body: z.infer<typeof transistorWebhookSchema>
): PodcastWebhookEvent {
  const eventTypeMap: Record<string, PodcastWebhookEvent["eventType"]> = {
    episode_created: "episode.published",
    episode_updated: "episode.updated",
    episode_deleted: "episode.deleted",
  };

  const attrs = body.data.attributes;
  return {
    platform: "transistor",
    eventType: eventTypeMap[body.event_name] ?? "episode.updated",
    episodeId: body.data.id,
    episodeTitle: attrs.title,
    timestamp: attrs.published_at ?? new Date().toISOString(),
    raw: body as unknown as Record<string, unknown>,
  };
}

async function fetchVerificationData(
  event: PodcastWebhookEvent,
  apiKey: string,
  podcastId?: string
): Promise<PodcastWebhookEvent & { verification: PodcastWebhookEvent["raw"] extends infer T ? T : never }> {
  if (event.eventType === "episode.deleted") {
    return { ...event, verification: null as unknown as PodcastWebhookEvent["raw"] };
  }

  try {
    const client = createPodcastClient(event.platform, {
      apiKey,
      podcastId,
    });
    const episode = await client.getEpisode(event.episodeId);
    if (episode) {
      return {
        ...event,
        verification: episodeToVerificationData(episode) as unknown as PodcastWebhookEvent["raw"],
      };
    }
  } catch {
    // fall through to return event without enrichment
  }

  return { ...event, verification: null as unknown as PodcastWebhookEvent["raw"] };
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-webhook-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing webhook signature" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const platformHeader = request.headers.get("x-platform") as
    | PodcastPlatform
    | null;

  if (!platformHeader || (platformHeader !== "buzzsprout" && platformHeader !== "transistor")) {
    return NextResponse.json(
      { error: "Invalid or missing x-platform header" },
      { status: 400 }
    );
  }

  let event: PodcastWebhookEvent;

  if (platformHeader === "buzzsprout") {
    const parsed = buzzsproutWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid Buzzsprout webhook payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    event = buildBuzzsproutEvent(parsed.data);
  } else {
    const parsed = transistorWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid Transistor webhook payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    event = buildTransistorEvent(parsed.data);
  }

  if (event.eventType === "episode.published" || event.eventType === "episode.updated") {
    const apiKeyEnv =
      platformHeader === "buzzsprout"
        ? process.env.BUZZSPROUT_API_KEY
        : process.env.TRANSISTOR_API_KEY;
    const podcastIdEnv = process.env.BUZZSPROUT_PODCAST_ID;

    if (apiKeyEnv) {
      const apiKey = process.env.NODE_ENV === "production" ? decrypt(apiKeyEnv) : apiKeyEnv;
      try {
        await fetchVerificationData(event, apiKey, podcastIdEnv);
      } catch {
        // enrichment failure should not block webhook acknowledgment
      }
    }
  }

  return NextResponse.json(
    {
      received: true,
      event: {
        platform: event.platform,
        eventType: event.eventType,
        episodeId: event.episodeId,
        episodeTitle: event.episodeTitle,
        timestamp: event.timestamp,
      },
    },
    { status: 200 }
  );
}
