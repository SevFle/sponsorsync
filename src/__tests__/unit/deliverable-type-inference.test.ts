import { describe, it, expect } from "vitest";
import { inferDeliverableType } from "@/lib/deliverables/types";

describe("inferDeliverableType", () => {
  describe("ad_read detection", () => {
    it("detects 'ad read' in title", () => {
      expect(inferDeliverableType("Podcast Ad Read")).toBe("ad_read");
    });

    it("detects 'ad-read' hyphenated", () => {
      expect(inferDeliverableType("Mid-Show Ad-Read")).toBe("ad_read");
    });

    it("detects 'mid-roll'", () => {
      expect(inferDeliverableType("Mid-roll Sponsorship")).toBe("ad_read");
    });

    it("detects 'preroll'", () => {
      expect(inferDeliverableType("Pre-roll Ad")).toBe("ad_read");
    });

    it("detects 'pre-roll'", () => {
      expect(inferDeliverableType("Pre-roll mention")).toBe("ad_read");
    });

    it("detects 'podcast ad'", () => {
      expect(inferDeliverableType("Podcast ad for sponsor")).toBe("ad_read");
    });

    it("detects 'ad spot'", () => {
      expect(inferDeliverableType("60s Ad Spot")).toBe("ad_read");
    });

    it("detects in description", () => {
      expect(inferDeliverableType("Sponsorship", "This is an ad read for the sponsor")).toBe(
        "ad_read"
      );
    });
  });

  describe("link_placement detection", () => {
    it("detects 'link' in title", () => {
      expect(inferDeliverableType("Newsletter Link")).toBe("link_placement");
    });

    it("detects 'url' in title", () => {
      expect(inferDeliverableType("URL placement in article")).toBe("link_placement");
    });

    it("detects 'backlink'", () => {
      expect(inferDeliverableType("Backlink in show notes")).toBe("link_placement");
    });

    it("detects 'referral link'", () => {
      expect(inferDeliverableType("Referral link placement")).toBe("link_placement");
    });

    it("detects 'affiliate link'", () => {
      expect(inferDeliverableType("Affiliate link in bio")).toBe("link_placement");
    });

    it("detects in description", () => {
      expect(inferDeliverableType("Content", "Place the link in the newsletter")).toBe(
        "link_placement"
      );
    });
  });

  describe("social_mention detection", () => {
    it("detects 'social' in title", () => {
      expect(inferDeliverableType("Social Media Post")).toBe("social_mention");
    });

    it("detects 'mention' in title", () => {
      expect(inferDeliverableType("Sponsor Mention")).toBe("social_mention");
    });

    it("detects 'tweet'", () => {
      expect(inferDeliverableType("Sponsored Tweet")).toBe("social_mention");
    });

    it("detects 'post'", () => {
      expect(inferDeliverableType("Instagram Post")).toBe("social_mention");
    });

    it("detects 'instagram'", () => {
      expect(inferDeliverableType("Instagram story")).toBe("social_mention");
    });

    it("detects 'twitter'", () => {
      expect(inferDeliverableType("Twitter thread")).toBe("social_mention");
    });

    it("detects 'linkedin'", () => {
      expect(inferDeliverableType("LinkedIn shoutout")).toBe("social_mention");
    });

    it("detects 'hashtag'", () => {
      expect(inferDeliverableType("Hashtag campaign")).toBe("social_mention");
    });
  });

  describe("default fallback", () => {
    it("defaults to ad_read for generic titles", () => {
      expect(inferDeliverableType("Generic sponsorship item")).toBe("ad_read");
    });

    it("defaults to ad_read when title is empty", () => {
      expect(inferDeliverableType("")).toBe("ad_read");
    });
  });

  describe("priority", () => {
    it("social detection takes priority when social keyword present", () => {
      expect(inferDeliverableType("Link in social post")).toBe("social_mention");
    });

    it("link detected when no social keyword", () => {
      expect(inferDeliverableType("Newsletter link placement")).toBe("link_placement");
    });

    it("ad_read is detected before link for ambiguous title", () => {
      expect(inferDeliverableType("Ad read with link")).toBe("ad_read");
    });
  });
});
