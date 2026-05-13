import { describe, it, expect } from "vitest";
import {
  adReadRules,
  linkPlacementRules,
  socialMentionRules,
  getRulesForType,
  getAllRules,
} from "@/lib/deliverables/rules";
import type { VerificationContext } from "@/lib/deliverables/types";

function makeCtx(overrides: Partial<VerificationContext> = {}): VerificationContext {
  return {
    deliverableId: "d-1",
    deliverableTitle: "Test Deliverable",
    verificationData: null,
    dueDate: null,
    completedDate: null,
    status: "pending",
    notes: null,
    ...overrides,
  };
}

describe("getRulesForType", () => {
  it("returns ad_read rules for ad_read type", () => {
    const rules = getRulesForType("ad_read");
    expect(rules).toBe(adReadRules);
    expect(rules).toHaveLength(3);
  });

  it("returns link_placement rules for link_placement type", () => {
    const rules = getRulesForType("link_placement");
    expect(rules).toBe(linkPlacementRules);
    expect(rules).toHaveLength(3);
  });

  it("returns social_mention rules for social_mention type", () => {
    const rules = getRulesForType("social_mention");
    expect(rules).toBe(socialMentionRules);
    expect(rules).toHaveLength(3);
  });
});

describe("getAllRules", () => {
  it("returns all rules combined", () => {
    const all = getAllRules();
    expect(all).toHaveLength(9);
    expect(all).toEqual([...adReadRules, ...linkPlacementRules, ...socialMentionRules]);
  });

  it("every rule has required properties", () => {
    const all = getAllRules();
    for (const rule of all) {
      expect(rule.id).toBeTruthy();
      expect(rule.name).toBeTruthy();
      expect(rule.description).toBeTruthy();
      expect(rule.deliverableType).toBeTruthy();
      expect(typeof rule.check).toBe("function");
    }
  });

  it("every rule check returns a valid VerificationCheck", () => {
    const ctx = makeCtx();
    const all = getAllRules();
    for (const rule of all) {
      const result = rule.check(ctx);
      expect(result.id).toBe(rule.id);
      expect(result.name).toBe(rule.name);
      expect(result.description).toContain(rule.description.split("(")[0].trim());
      expect(["pass", "fail", "pending", "not_applicable"]).toContain(result.status);
      expect(result.checkedAt).toBeInstanceOf(Date);
    }
  });
});

describe("ad_read rules - Episode Published", () => {
  const rule = adReadRules[0];

  it("passes for verified status without verificationData", () => {
    const result = rule.check(makeCtx({ status: "verified" }));
    expect(result.status).toBe("pass");
    expect(result.evidence).toBe("Marked as submitted/verified");
  });

  it("passes for submitted status without verificationData", () => {
    const result = rule.check(makeCtx({ status: "submitted" }));
    expect(result.status).toBe("pass");
  });

  it("passes for verified status with episodeUrl", () => {
    const result = rule.check(
      makeCtx({
        status: "verified",
        verificationData: { episodeUrl: "https://podcast.com/ep1" },
      })
    );
    expect(result.status).toBe("pass");
    expect(result.evidence).toContain("https://podcast.com/ep1");
  });

  it("passes when episodePublished is true", () => {
    const result = rule.check(
      makeCtx({
        status: "pending",
        verificationData: { episodePublished: true },
      })
    );
    expect(result.status).toBe("pass");
    expect(result.evidence).toBe("Episode marked as published");
  });

  it("passes when episodePublished is true with url", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { episodePublished: true, episodeUrl: "https://pod.com/ep" },
      })
    );
    expect(result.status).toBe("pass");
    expect(result.evidence).toContain("https://pod.com/ep");
  });

  it("returns pending when not published and no data", () => {
    const result = rule.check(makeCtx({ status: "pending" }));
    expect(result.status).toBe("pending");
    expect(result.evidence).toContain("Awaiting");
  });

  it("returns pending when episodePublished is false", () => {
    const result = rule.check(
      makeCtx({ status: "in_progress", verificationData: { episodePublished: false } })
    );
    expect(result.status).toBe("pending");
  });
});

describe("ad_read rules - Ad Duration", () => {
  const rule = adReadRules[1];

  it("passes for verified status regardless of data", () => {
    const result = rule.check(makeCtx({ status: "verified" }));
    expect(result.status).toBe("pass");
    expect(result.evidence).toBe("Deliverable verified");
  });

  it("passes when duration meets requirement exactly", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { adDurationSeconds: 30, requiredDurationSeconds: 30 },
      })
    );
    expect(result.status).toBe("pass");
  });

  it("fails when duration is below requirement", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { adDurationSeconds: 29, requiredDurationSeconds: 30 },
      })
    );
    expect(result.status).toBe("fail");
  });

  it("defaults required duration to 30 when not specified", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { adDurationSeconds: 35 },
      })
    );
    expect(result.status).toBe("pass");
    expect(result.description).toContain("30s");
  });

  it("returns pending when no duration data", () => {
    const result = rule.check(makeCtx({ status: "in_progress" }));
    expect(result.status).toBe("pending");
  });

  it("handles custom required duration", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { adDurationSeconds: 55, requiredDurationSeconds: 60 },
      })
    );
    expect(result.status).toBe("fail");
    expect(result.description).toContain("60s");
  });
});

describe("ad_read rules - Sponsor Mention", () => {
  const rule = adReadRules[2];

  it("passes for verified status", () => {
    const result = rule.check(makeCtx({ status: "verified" }));
    expect(result.status).toBe("pass");
  });

  it("passes when sponsorMentioned is true", () => {
    const result = rule.check(
      makeCtx({ status: "in_progress", verificationData: { sponsorMentioned: true } })
    );
    expect(result.status).toBe("pass");
    expect(result.evidence).toContain("detected");
  });

  it("fails when sponsorMentioned is false", () => {
    const result = rule.check(
      makeCtx({ status: "in_progress", verificationData: { sponsorMentioned: false } })
    );
    expect(result.status).toBe("fail");
  });

  it("passes when sponsor name found in transcript (case insensitive)", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { transcript: "Sponsored by ACME CORP", sponsorName: "acme corp" },
      })
    );
    expect(result.status).toBe("pass");
    expect(result.evidence).toContain("acme corp");
  });

  it("fails when sponsor name not found in transcript", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { transcript: "Hello everyone", sponsorName: "Acme" },
      })
    );
    expect(result.status).toBe("fail");
    expect(result.evidence).toContain("not found");
  });

  it("returns pending when no transcript or sponsor data", () => {
    const result = rule.check(makeCtx({ status: "in_progress" }));
    expect(result.status).toBe("pending");
  });

  it("returns pending when only transcript is provided without sponsorName", () => {
    const result = rule.check(
      makeCtx({ status: "in_progress", verificationData: { transcript: "Some text" } })
    );
    expect(result.status).toBe("pending");
  });

  it("returns pending when only sponsorName is provided without transcript", () => {
    const result = rule.check(
      makeCtx({ status: "in_progress", verificationData: { sponsorName: "Acme" } })
    );
    expect(result.status).toBe("pending");
  });
});

describe("link_placement rules - URL Present", () => {
  const rule = linkPlacementRules[0];

  it("passes for verified status", () => {
    const result = rule.check(makeCtx({ status: "verified" }));
    expect(result.status).toBe("pass");
  });

  it("returns pending when no requiredUrl", () => {
    const result = rule.check(makeCtx({ status: "in_progress", verificationData: {} }));
    expect(result.status).toBe("pending");
    expect(result.evidence).toContain("No required URL");
  });

  it("passes when foundUrl contains requiredUrl", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { requiredUrl: "sponsor.com", foundUrl: "https://site.com/sponsor.com/page" },
      })
    );
    expect(result.status).toBe("pass");
  });

  it("passes for submitted status even without matching url", () => {
    const result = rule.check(
      makeCtx({
        status: "submitted",
        verificationData: { requiredUrl: "sponsor.com" },
      })
    );
    expect(result.status).toBe("pass");
    expect(result.evidence).toContain("submitted");
  });

  it("returns pending when requiredUrl not found and not submitted", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { requiredUrl: "sponsor.com", foundUrl: "https://other.com" },
      })
    );
    expect(result.status).toBe("pending");
  });

  it("returns pending when requiredUrl set but no foundUrl", () => {
    const result = rule.check(
      makeCtx({ status: "in_progress", verificationData: { requiredUrl: "sponsor.com" } })
    );
    expect(result.status).toBe("pending");
  });
});

describe("link_placement rules - Position", () => {
  const rule = linkPlacementRules[1];

  it("passes for verified status", () => {
    const result = rule.check(makeCtx({ status: "verified" }));
    expect(result.status).toBe("pass");
  });

  it("returns not_applicable when no requiredPosition", () => {
    const result = rule.check(makeCtx({ status: "in_progress", verificationData: {} }));
    expect(result.status).toBe("not_applicable");
  });

  it("passes when positions match (case insensitive)", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { requiredPosition: "Body", actualPosition: "body" },
      })
    );
    expect(result.status).toBe("pass");
    expect(result.evidence).toContain("Body");
  });

  it("fails when positions do not match", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { requiredPosition: "body", actualPosition: "sidebar" },
      })
    );
    expect(result.status).toBe("fail");
    expect(result.evidence).toContain("sidebar");
    expect(result.evidence).toContain("body");
  });

  it("returns pending when requiredPosition set but no actualPosition", () => {
    const result = rule.check(
      makeCtx({ status: "in_progress", verificationData: { requiredPosition: "body" } })
    );
    expect(result.status).toBe("pending");
  });
});

describe("link_placement rules - Content Published", () => {
  const rule = linkPlacementRules[2];

  it("passes for verified status with contentUrl", () => {
    const result = rule.check(
      makeCtx({
        status: "verified",
        verificationData: { contentUrl: "https://newsletter.com/42" },
      })
    );
    expect(result.status).toBe("pass");
    expect(result.evidence).toContain("https://newsletter.com/42");
  });

  it("passes for submitted status", () => {
    const result = rule.check(makeCtx({ status: "submitted" }));
    expect(result.status).toBe("pass");
  });

  it("passes when contentPublished is true with url", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { contentPublished: true, contentUrl: "https://site.com/art" },
      })
    );
    expect(result.status).toBe("pass");
    expect(result.evidence).toContain("https://site.com/art");
  });

  it("passes when contentPublished is true without url", () => {
    const result = rule.check(
      makeCtx({ status: "in_progress", verificationData: { contentPublished: true } })
    );
    expect(result.status).toBe("pass");
    expect(result.evidence).toContain("marked as published");
  });

  it("returns pending when not published", () => {
    const result = rule.check(makeCtx({ status: "in_progress" }));
    expect(result.status).toBe("pending");
    expect(result.evidence).toContain("not yet published");
  });
});

describe("social_mention rules - Post Published", () => {
  const rule = socialMentionRules[0];

  it("passes for verified status with postUrl", () => {
    const result = rule.check(
      makeCtx({ status: "verified", verificationData: { postUrl: "https://x.com/123" } })
    );
    expect(result.status).toBe("pass");
    expect(result.evidence).toContain("https://x.com/123");
  });

  it("passes for submitted status", () => {
    const result = rule.check(makeCtx({ status: "submitted" }));
    expect(result.status).toBe("pass");
  });

  it("passes when postPublished is true with url", () => {
    const result = rule.check(
      makeCtx({ status: "in_progress", verificationData: { postPublished: true, postUrl: "https://x.com/s" } })
    );
    expect(result.status).toBe("pass");
    expect(result.evidence).toContain("https://x.com/s");
  });

  it("passes when postPublished is true without url", () => {
    const result = rule.check(
      makeCtx({ status: "in_progress", verificationData: { postPublished: true } })
    );
    expect(result.status).toBe("pass");
    expect(result.evidence).toContain("marked as published");
  });

  it("returns pending when not published", () => {
    const result = rule.check(makeCtx({ status: "in_progress" }));
    expect(result.status).toBe("pending");
  });
});

describe("social_mention rules - Sponsor @Mentioned", () => {
  const rule = socialMentionRules[1];

  it("passes for verified status", () => {
    const result = rule.check(makeCtx({ status: "verified" }));
    expect(result.status).toBe("pass");
  });

  it("passes when sponsorMentioned is true without requiredHandle", () => {
    const result = rule.check(
      makeCtx({ status: "in_progress", verificationData: { sponsorMentioned: true } })
    );
    expect(result.status).toBe("pass");
    expect(result.evidence).toBe("Sponsor mention detected");
  });

  it("passes when sponsorMentioned is true with requiredHandle", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { sponsorMentioned: true, requiredHandle: "acme" },
      })
    );
    expect(result.status).toBe("pass");
    expect(result.evidence).toContain("@acme");
  });

  it("fails when sponsorMentioned is false without requiredHandle", () => {
    const result = rule.check(
      makeCtx({ status: "in_progress", verificationData: { sponsorMentioned: false } })
    );
    expect(result.status).toBe("fail");
    expect(result.evidence).toContain("not found");
  });

  it("fails when sponsorMentioned is false with requiredHandle", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { sponsorMentioned: false, requiredHandle: "acme" },
      })
    );
    expect(result.status).toBe("fail");
    expect(result.evidence).toContain("@acme");
  });

  it("passes when handle found in postContent (case insensitive)", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { requiredHandle: "AcmeCorp", postContent: "Thanks @acmecorp!" },
      })
    );
    expect(result.status).toBe("pass");
    expect(result.evidence).toContain("AcmeCorp");
  });

  it("fails when handle not found in postContent", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { requiredHandle: "acme", postContent: "Check out our episode" },
      })
    );
    expect(result.status).toBe("fail");
  });

  it("returns pending when no handle or post content", () => {
    const result = rule.check(makeCtx({ status: "in_progress" }));
    expect(result.status).toBe("pending");
  });

  it("returns pending when only handle provided without postContent", () => {
    const result = rule.check(
      makeCtx({ status: "in_progress", verificationData: { requiredHandle: "acme" } })
    );
    expect(result.status).toBe("pending");
  });
});

describe("social_mention rules - Hashtags", () => {
  const rule = socialMentionRules[2];

  it("passes for verified status", () => {
    const result = rule.check(makeCtx({ status: "verified" }));
    expect(result.status).toBe("pass");
  });

  it("returns not_applicable when no requiredHashtags", () => {
    const result = rule.check(makeCtx({ status: "in_progress", verificationData: {} }));
    expect(result.status).toBe("not_applicable");
  });

  it("returns not_applicable when requiredHashtags is empty array", () => {
    const result = rule.check(
      makeCtx({ status: "in_progress", verificationData: { requiredHashtags: [] } })
    );
    expect(result.status).toBe("not_applicable");
  });

  it("returns not_applicable when requiredHashtags is not an array", () => {
    const result = rule.check(
      makeCtx({ status: "in_progress", verificationData: { requiredHashtags: "not-array" } })
    );
    expect(result.status).toBe("not_applicable");
  });

  it("passes when all required hashtags found in postContent", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { requiredHashtags: ["#ad", "#sponsored"], postContent: "Great product #ad #sponsored" },
      })
    );
    expect(result.status).toBe("pass");
    expect(result.evidence).toContain("#ad");
    expect(result.evidence).toContain("#sponsored");
  });

  it("fails when some hashtags missing", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { requiredHashtags: ["#ad", "#partner"], postContent: "Check this #ad out" },
      })
    );
    expect(result.status).toBe("fail");
    expect(result.evidence).toContain("#partner");
  });

  it("handles case-insensitive hashtag matching", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { requiredHashtags: ["#SPONSORED"], postContent: "Love it #sponsored" },
      })
    );
    expect(result.status).toBe("pass");
  });

  it("filters out non-string items in hashtag array", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { requiredHashtags: ["#ad", 123, null, "#partner"], postContent: "#ad #partner" },
      })
    );
    expect(result.status).toBe("pass");
  });

  it("returns pending when requiredHashtags set but no postContent", () => {
    const result = rule.check(
      makeCtx({
        status: "in_progress",
        verificationData: { requiredHashtags: ["#ad"] },
      })
    );
    expect(result.status).toBe("pending");
    expect(result.evidence).toContain("not yet available");
  });
});
