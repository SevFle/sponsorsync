import { describe, it, expect } from "vitest";
import { inferDeliverableType } from "@/lib/deliverables/types";

describe("inferDeliverableType", () => {
  describe("ad_read detection", () => {
    it("detects 'ad read' in title", () => {
      expect(inferDeliverableType("Ad Read for Sponsor")).toBe("ad_read");
    });

    it("detects 'ad-read' hyphenated", () => {
      expect(inferDeliverableType("Ad-read segment")).toBe("ad_read");
    });

    it("detects 'mid-roll' in title", () => {
      expect(inferDeliverableType("Mid-roll ad placement")).toBe("ad_read");
    });

    it("detects 'preroll'", () => {
      expect(inferDeliverableType("Preroll sponsorship")).toBe("ad_read");
    });

    it("detects 'pre-roll'", () => {
      expect(inferDeliverableType("Pre-roll mention")).toBe("ad_read");
    });

    it("detects 'podcast ad'", () => {
      expect(inferDeliverableType("Podcast ad spot")).toBe("ad_read");
    });

    it("detects 'ad spot'", () => {
      expect(inferDeliverableType("Ad spot for sponsor")).toBe("ad_read");
    });

    it("detects patterns in description", () => {
      expect(
        inferDeliverableType("Generic Title", "This is an ad read segment")
      ).toBe("ad_read");
    });

    it("detects in combined title + description", () => {
      expect(
        inferDeliverableType("Sponsor Segment", "Includes a mid-roll ad read")
      ).toBe("ad_read");
    });
  });

  describe("social_mention detection", () => {
    it("detects 'social' in title", () => {
      expect(inferDeliverableType("Social media post")).toBe("social_mention");
    });

    it("detects 'tweet' in title", () => {
      expect(inferDeliverableType("Tweet about sponsor")).toBe("social_mention");
    });

    it("detects 'instagram' in title", () => {
      expect(inferDeliverableType("Instagram story")).toBe("social_mention");
    });

    it("detects 'twitter' in title", () => {
      expect(inferDeliverableType("Twitter post")).toBe("social_mention");
    });

    it("detects 'linkedin' in title", () => {
      expect(inferDeliverableType("LinkedIn shoutout")).toBe("social_mention");
    });

    it("detects 'hashtag' in title", () => {
      expect(inferDeliverableType("Hashtag campaign")).toBe("social_mention");
    });

    it("detects 'social mention' in title", () => {
      expect(inferDeliverableType("Social mention campaign")).toBe("social_mention");
    });

    it("detects 'mention' fallback", () => {
      expect(inferDeliverableType("Brand mention")).toBe("social_mention");
    });

    it("detects 'post' fallback", () => {
      expect(inferDeliverableType("Sponsored post")).toBe("social_mention");
    });

    it("prioritizes social_mention over post/mention", () => {
      expect(inferDeliverableType("Instagram post")).toBe("social_mention");
    });
  });

  describe("link_placement detection", () => {
    it("detects 'link' in title", () => {
      expect(inferDeliverableType("Link placement in newsletter")).toBe(
        "link_placement"
      );
    });

    it("detects 'url' in title", () => {
      expect(inferDeliverableType("URL placement")).toBe("link_placement");
    });

    it("detects 'backlink'", () => {
      expect(inferDeliverableType("Backlink placement")).toBe("link_placement");
    });

    it("detects 'referral link'", () => {
      expect(inferDeliverableType("Referral link setup")).toBe("link_placement");
    });

    it("detects 'affiliate link'", () => {
      expect(inferDeliverableType("Affiliate link integration")).toBe(
        "link_placement"
      );
    });

    it("detects link patterns in description", () => {
      expect(
        inferDeliverableType("Sponsorship", "Place a backlink on our website")
      ).toBe("link_placement");
    });
  });

  describe("default fallback", () => {
    it("defaults to ad_read for unknown titles", () => {
      expect(inferDeliverableType("Sponsorship Deliverable")).toBe("ad_read");
    });

    it("defaults to ad_read for empty string", () => {
      expect(inferDeliverableType("")).toBe("ad_read");
    });

    it("defaults to ad_read for generic titles", () => {
      expect(inferDeliverableType("Deliverable 1")).toBe("ad_read");
    });
  });

  describe("case insensitivity", () => {
    it("matches case-insensitively", () => {
      expect(inferDeliverableType("AD READ")).toBe("ad_read");
      expect(inferDeliverableType("SOCIAL MENTION")).toBe("social_mention");
      expect(inferDeliverableType("LINK PLACEMENT")).toBe("link_placement");
    });

    it("matches mixed case", () => {
      expect(inferDeliverableType("Ad Read")).toBe("ad_read");
      expect(inferDeliverableType("Social Media")).toBe("social_mention");
      expect(inferDeliverableType("Link URL")).toBe("link_placement");
    });
  });

  describe("priority and precedence", () => {
    it("ad_read takes priority over social_mention patterns", () => {
      expect(inferDeliverableType("Ad read social post")).toBe("ad_read");
    });

    it("social_mention takes priority over link_placement patterns", () => {
      expect(inferDeliverableType("Social link post")).toBe("social_mention");
    });

    it("checks title before description", () => {
      expect(
        inferDeliverableType("Ad Read", "Place a link in show notes")
      ).toBe("ad_read");
    });
  });

  describe("edge cases", () => {
    it("handles null description", () => {
      expect(inferDeliverableType("Ad Read", null)).toBe("ad_read");
    });

    it("handles undefined description", () => {
      expect(inferDeliverableType("Social Post", undefined)).toBe(
        "social_mention"
      );
    });

    it("handles empty description", () => {
      expect(inferDeliverableType("Link Placement", "")).toBe("link_placement");
    });

    it("handles whitespace-only title", () => {
      expect(inferDeliverableType("   ")).toBe("ad_read");
    });

    it("handles title with special characters", () => {
      expect(inferDeliverableType("Ad-Read #1: Mid-Roll")).toBe("ad_read");
    });

    it("handles very long title", () => {
      const longTitle = "x".repeat(1000) + " ad read";
      expect(inferDeliverableType(longTitle)).toBe("ad_read");
    });
  });
});
