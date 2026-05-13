import {
  type VerificationRule,
  type VerificationCheck,
  type VerificationContext,
  type VerificationStatus,
} from "./types";

function createCheck(
  id: string,
  name: string,
  description: string,
  status: VerificationStatus,
  evidence: string | null
): VerificationCheck {
  return { id, name, description, status, evidence, checkedAt: new Date() };
}

function extractStringField(data: Record<string, unknown> | null, field: string): string | null {
  if (!data || typeof data[field] !== "string") return null;
  return data[field];
}

function extractNumberField(data: Record<string, unknown> | null, field: string): number | null {
  if (!data || typeof data[field] !== "number") return null;
  return data[field];
}

function extractBooleanField(data: Record<string, unknown> | null, field: string): boolean | null {
  if (!data || typeof data[field] !== "boolean") return null;
  return data[field];
}

export const adReadRules: VerificationRule[] = [
  {
    id: "ad_read_published",
    name: "Episode Published",
    description: "Verify the podcast episode containing the ad read has been published",
    deliverableType: "ad_read",
    check: (ctx: VerificationContext): VerificationCheck => {
      const publishedUrl = extractStringField(ctx.verificationData, "episodeUrl");
      const isPublished = extractBooleanField(ctx.verificationData, "episodePublished");

      if (ctx.status === "verified" || ctx.status === "submitted") {
        return createCheck(
          "ad_read_published",
          "Episode Published",
          "Verify the podcast episode containing the ad read has been published",
          "pass",
          publishedUrl ? `Episode found at: ${publishedUrl}` : "Marked as submitted/verified"
        );
      }

      if (isPublished === true) {
        return createCheck(
          "ad_read_published",
          "Episode Published",
          "Verify the podcast episode containing the ad read has been published",
          "pass",
          publishedUrl ? `Episode published at: ${publishedUrl}` : "Episode marked as published"
        );
      }

      return createCheck(
        "ad_read_published",
        "Episode Published",
        "Verify the podcast episode containing the ad read has been published",
        "pending",
        "Awaiting episode publication confirmation"
      );
    },
  },
  {
    id: "ad_read_duration",
    name: "Ad Duration Met",
    description: "Verify the ad read meets the required duration (typically 30-60 seconds)",
    deliverableType: "ad_read",
    check: (ctx: VerificationContext): VerificationCheck => {
      const actualDuration = extractNumberField(ctx.verificationData, "adDurationSeconds");
      const requiredDuration = extractNumberField(ctx.verificationData, "requiredDurationSeconds") ?? 30;

      if (ctx.status === "verified") {
        return createCheck(
          "ad_read_duration",
          "Ad Duration Met",
          `Verify the ad read meets the required duration (${requiredDuration}s)`,
          "pass",
          `Deliverable verified`
        );
      }

      if (actualDuration !== null) {
        if (actualDuration >= requiredDuration) {
          return createCheck(
            "ad_read_duration",
            "Ad Duration Met",
            `Verify the ad read meets the required duration (${requiredDuration}s)`,
            "pass",
            `Ad duration: ${actualDuration}s (required: ${requiredDuration}s)`
          );
        }
        return createCheck(
          "ad_read_duration",
          "Ad Duration Met",
          `Verify the ad read meets the required duration (${requiredDuration}s)`,
          "fail",
          `Ad duration: ${actualDuration}s is less than required ${requiredDuration}s`
        );
      }

      return createCheck(
        "ad_read_duration",
        "Ad Duration Met",
        `Verify the ad read meets the required duration (${requiredDuration}s)`,
        "pending",
        "No duration data available yet"
      );
    },
  },
  {
    id: "ad_read_sponsor_mention",
    name: "Sponsor Mentioned",
    description: "Verify the sponsor name or product was mentioned in the ad read",
    deliverableType: "ad_read",
    check: (ctx: VerificationContext): VerificationCheck => {
      const transcript = extractStringField(ctx.verificationData, "transcript");
      const sponsorName = extractStringField(ctx.verificationData, "sponsorName");
      const mentionDetected = extractBooleanField(ctx.verificationData, "sponsorMentioned");

      if (ctx.status === "verified") {
        return createCheck(
          "ad_read_sponsor_mention",
          "Sponsor Mentioned",
          "Verify the sponsor name or product was mentioned in the ad read",
          "pass",
          "Deliverable verified"
        );
      }

      if (mentionDetected === true) {
        return createCheck(
          "ad_read_sponsor_mention",
          "Sponsor Mentioned",
          "Verify the sponsor name or product was mentioned in the ad read",
          "pass",
          "Sponsor mention detected in content"
        );
      }

      if (mentionDetected === false) {
        return createCheck(
          "ad_read_sponsor_mention",
          "Sponsor Mentioned",
          "Verify the sponsor name or product was mentioned in the ad read",
          "fail",
          "Sponsor mention not detected in content"
        );
      }

      if (transcript && sponsorName) {
        const found = transcript.toLowerCase().includes(sponsorName.toLowerCase());
        return createCheck(
          "ad_read_sponsor_mention",
          "Sponsor Mentioned",
          "Verify the sponsor name or product was mentioned in the ad read",
          found ? "pass" : "fail",
          found
            ? `Sponsor "${sponsorName}" found in transcript`
            : `Sponsor "${sponsorName}" not found in transcript`
        );
      }

      return createCheck(
        "ad_read_sponsor_mention",
        "Sponsor Mentioned",
        "Verify the sponsor name or product was mentioned in the ad read",
        "pending",
        "No transcript or sponsor data available for verification"
      );
    },
  },
];

export const linkPlacementRules: VerificationRule[] = [
  {
    id: "link_url_present",
    name: "Link URL Present",
    description: "Verify the required link URL is present in the published content",
    deliverableType: "link_placement",
    check: (ctx: VerificationContext): VerificationCheck => {
      const requiredUrl = extractStringField(ctx.verificationData, "requiredUrl");
      const foundUrl = extractStringField(ctx.verificationData, "foundUrl");

      if (ctx.status === "verified") {
        return createCheck(
          "link_url_present",
          "Link URL Present",
          "Verify the required link URL is present in the published content",
          "pass",
          "Deliverable verified"
        );
      }

      if (!requiredUrl) {
        return createCheck(
          "link_url_present",
          "Link URL Present",
          "Verify the required link URL is present in the published content",
          "pending",
          "No required URL specified in verification data"
        );
      }

      if (foundUrl && foundUrl.includes(requiredUrl)) {
        return createCheck(
          "link_url_present",
          "Link URL Present",
          "Verify the required link URL is present in the published content",
          "pass",
          `Required URL "${requiredUrl}" found in content`
        );
      }

      if (ctx.status === "submitted") {
        return createCheck(
          "link_url_present",
          "Link URL Present",
          "Verify the required link URL is present in the published content",
          "pass",
          "Deliverable submitted for review"
        );
      }

      return createCheck(
        "link_url_present",
        "Link URL Present",
        "Verify the required link URL is present in the published content",
        "pending",
        `Link "${requiredUrl}" not yet confirmed in content`
      );
    },
  },
  {
    id: "link_placement_position",
    name: "Link Placement Position",
    description: "Verify the link is placed in the agreed position (e.g., body, footer, sidebar)",
    deliverableType: "link_placement",
    check: (ctx: VerificationContext): VerificationCheck => {
      const requiredPosition = extractStringField(ctx.verificationData, "requiredPosition");
      const actualPosition = extractStringField(ctx.verificationData, "actualPosition");

      if (ctx.status === "verified") {
        return createCheck(
          "link_placement_position",
          "Link Placement Position",
          "Verify the link is placed in the agreed position",
          "pass",
          "Deliverable verified"
        );
      }

      if (!requiredPosition) {
        return createCheck(
          "link_placement_position",
          "Link Placement Position",
          "Verify the link is placed in the agreed position",
          "not_applicable",
          "No specific position requirement"
        );
      }

      if (actualPosition) {
        const matches = actualPosition.toLowerCase() === requiredPosition.toLowerCase();
        return createCheck(
          "link_placement_position",
          "Link Placement Position",
          `Verify the link is placed in the ${requiredPosition} position`,
          matches ? "pass" : "fail",
          matches
            ? `Link placed in required position: ${requiredPosition}`
            : `Link found in ${actualPosition}, required: ${requiredPosition}`
        );
      }

      return createCheck(
        "link_placement_position",
        "Link Placement Position",
        `Verify the link is placed in the ${requiredPosition} position`,
        "pending",
        "Position data not yet available"
      );
    },
  },
  {
    id: "link_content_published",
    name: "Content Published",
    description: "Verify the content (newsletter/article/page) containing the link has been published",
    deliverableType: "link_placement",
    check: (ctx: VerificationContext): VerificationCheck => {
      const publishedUrl = extractStringField(ctx.verificationData, "contentUrl");
      const isPublished = extractBooleanField(ctx.verificationData, "contentPublished");

      if (ctx.status === "verified" || ctx.status === "submitted") {
        return createCheck(
          "link_content_published",
          "Content Published",
          "Verify the content containing the link has been published",
          "pass",
          publishedUrl ? `Content published at: ${publishedUrl}` : "Marked as submitted/verified"
        );
      }

      if (isPublished === true) {
        return createCheck(
          "link_content_published",
          "Content Published",
          "Verify the content containing the link has been published",
          "pass",
          publishedUrl ? `Content published at: ${publishedUrl}` : "Content marked as published"
        );
      }

      return createCheck(
        "link_content_published",
        "Content Published",
        "Verify the content containing the link has been published",
        "pending",
        "Content not yet published"
      );
    },
  },
];

export const socialMentionRules: VerificationRule[] = [
  {
    id: "social_post_published",
    name: "Social Post Published",
    description: "Verify the social media post has been published",
    deliverableType: "social_mention",
    check: (ctx: VerificationContext): VerificationCheck => {
      const postUrl = extractStringField(ctx.verificationData, "postUrl");
      const isPublished = extractBooleanField(ctx.verificationData, "postPublished");

      if (ctx.status === "verified" || ctx.status === "submitted") {
        return createCheck(
          "social_post_published",
          "Social Post Published",
          "Verify the social media post has been published",
          "pass",
          postUrl ? `Post found at: ${postUrl}` : "Marked as submitted/verified"
        );
      }

      if (isPublished === true) {
        return createCheck(
          "social_post_published",
          "Social Post Published",
          "Verify the social media post has been published",
          "pass",
          postUrl ? `Post published at: ${postUrl}` : "Post marked as published"
        );
      }

      return createCheck(
        "social_post_published",
        "Social Post Published",
        "Verify the social media post has been published",
        "pending",
        "Social post not yet published"
      );
    },
  },
  {
    id: "social_sponsor_mentioned",
    name: "Sponsor @Mentioned",
    description: "Verify the sponsor's social handle was @mentioned in the post",
    deliverableType: "social_mention",
    check: (ctx: VerificationContext): VerificationCheck => {
      const requiredHandle = extractStringField(ctx.verificationData, "requiredHandle");
      const postContent = extractStringField(ctx.verificationData, "postContent");
      const mentionDetected = extractBooleanField(ctx.verificationData, "sponsorMentioned");

      if (ctx.status === "verified") {
        return createCheck(
          "social_sponsor_mentioned",
          "Sponsor @Mentioned",
          "Verify the sponsor's social handle was @mentioned in the post",
          "pass",
          "Deliverable verified"
        );
      }

      if (mentionDetected === true) {
        return createCheck(
          "social_sponsor_mentioned",
          "Sponsor @Mentioned",
          "Verify the sponsor's social handle was @mentioned in the post",
          "pass",
          `Sponsor mention detected${requiredHandle ? `: @${requiredHandle}` : ""}`
        );
      }

      if (mentionDetected === false) {
        return createCheck(
          "social_sponsor_mentioned",
          "Sponsor @Mentioned",
          "Verify the sponsor's social handle was @mentioned in the post",
          "fail",
          `Sponsor @mention not found${requiredHandle ? ` (expected @${requiredHandle})` : ""}`
        );
      }

      if (requiredHandle && postContent) {
        const found = postContent.toLowerCase().includes(`@${requiredHandle.toLowerCase()}`);
        return createCheck(
          "social_sponsor_mentioned",
          "Sponsor @Mentioned",
          `Verify @${requiredHandle} was mentioned in the post`,
          found ? "pass" : "fail",
          found
            ? `@${requiredHandle} found in post content`
            : `@${requiredHandle} not found in post content`
        );
      }

      return createCheck(
        "social_sponsor_mentioned",
        "Sponsor @Mentioned",
        "Verify the sponsor's social handle was @mentioned in the post",
        "pending",
        "No handle or post content data available"
      );
    },
  },
  {
    id: "social_hashtags",
    name: "Required Hashtags",
    description: "Verify required hashtags are included in the post",
    deliverableType: "social_mention",
    check: (ctx: VerificationContext): VerificationCheck => {
      const requiredHashtags = ctx.verificationData?.requiredHashtags;
      const postContent = extractStringField(ctx.verificationData, "postContent");

      if (ctx.status === "verified") {
        return createCheck(
          "social_hashtags",
          "Required Hashtags",
          "Verify required hashtags are included in the post",
          "pass",
          "Deliverable verified"
        );
      }

      if (!requiredHashtags || !Array.isArray(requiredHashtags) || requiredHashtags.length === 0) {
        return createCheck(
          "social_hashtags",
          "Required Hashtags",
          "Verify required hashtags are included in the post",
          "not_applicable",
          "No specific hashtag requirements"
        );
      }

      if (postContent) {
        const contentLower = postContent.toLowerCase();
        const missing = requiredHashtags.filter(
          (tag: string) => typeof tag === "string" && !contentLower.includes(tag.toLowerCase())
        );

        if (missing.length === 0) {
          return createCheck(
            "social_hashtags",
            "Required Hashtags",
            "Verify required hashtags are included in the post",
            "pass",
            `All required hashtags found: ${requiredHashtags.join(", ")}`
          );
        }
        return createCheck(
          "social_hashtags",
          "Required Hashtags",
          "Verify required hashtags are included in the post",
          "fail",
          `Missing hashtags: ${missing.join(", ")}`
        );
      }

      return createCheck(
        "social_hashtags",
        "Required Hashtags",
        "Verify required hashtags are included in the post",
        "pending",
        "Post content not yet available for hashtag verification"
      );
    },
  },
];

export function getRulesForType(
  deliverableType: "ad_read" | "link_placement" | "social_mention"
): VerificationRule[] {
  switch (deliverableType) {
    case "ad_read":
      return adReadRules;
    case "link_placement":
      return linkPlacementRules;
    case "social_mention":
      return socialMentionRules;
  }
}

export function getAllRules(): VerificationRule[] {
  return [...adReadRules, ...linkPlacementRules, ...socialMentionRules];
}
