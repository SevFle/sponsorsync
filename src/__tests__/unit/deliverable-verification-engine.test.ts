import { describe, it, expect } from "vitest";
import { computeDeadlineStatus, verifyDeliverable } from "@/lib/deliverables/engine";
import type { VerificationContext } from "@/lib/deliverables/types";

describe("computeDeadlineStatus", () => {
  it("returns completed when status is verified", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    expect(computeDeadlineStatus(future.toISOString(), null, "verified")).toBe("completed");
  });

  it("returns completed when status is submitted", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    expect(computeDeadlineStatus(future.toISOString(), null, "submitted")).toBe("completed");
  });

  it("returns completed when completedDate is set", () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    expect(computeDeadlineStatus(past.toISOString(), "2024-01-01", "pending")).toBe("completed");
  });

  it("returns no_deadline when dueDate is null", () => {
    expect(computeDeadlineStatus(null, null, "pending")).toBe("no_deadline");
  });

  it("returns overdue when due date is in the past", () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    expect(computeDeadlineStatus(past.toISOString(), null, "pending")).toBe("overdue");
  });

  it("returns at_risk when due date is within 3 days", () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);
    expect(computeDeadlineStatus(soon.toISOString(), null, "pending")).toBe("at_risk");
  });

  it("returns on_track when due date is more than 3 days away", () => {
    const later = new Date();
    later.setDate(later.getDate() + 10);
    expect(computeDeadlineStatus(later.toISOString(), null, "pending")).toBe("on_track");
  });

  it("returns at_risk at exactly 3 days", () => {
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);
    expect(computeDeadlineStatus(in3Days.toISOString(), null, "in_progress")).toBe("at_risk");
  });

  it("returns overdue when due date is today", () => {
    const today = new Date();
    expect(computeDeadlineStatus(today.toISOString(), null, "pending")).toBe("overdue");
  });

  it("returns completed for verified status even with no completedDate", () => {
    const past = new Date();
    past.setDate(past.getDate() - 10);
    expect(computeDeadlineStatus(past.toISOString(), null, "verified")).toBe("completed");
  });
});

function makeContext(overrides: Partial<VerificationContext> = {}): VerificationContext {
  return {
    deliverableId: "d-1",
    deliverableTitle: "Ad Read",
    verificationData: null,
    dueDate: null,
    completedDate: null,
    status: "pending",
    notes: null,
    ...overrides,
  };
}

describe("verifyDeliverable", () => {
  it("returns a report with correct structure for ad_read", () => {
    const ctx = makeContext({ deliverableTitle: "Podcast Ad Read" });
    const report = verifyDeliverable(ctx, "deal-1", "Test Deal");

    expect(report.deliverableId).toBe("d-1");
    expect(report.deliverableTitle).toBe("Podcast Ad Read");
    expect(report.deliverableType).toBe("ad_read");
    expect(report.dealId).toBe("deal-1");
    expect(report.dealTitle).toBe("Test Deal");
    expect(report.overallStatus).toBe("pending");
    expect(report.checks).toHaveLength(3);
    expect(report.dueDate).toBeNull();
    expect(report.deadlineStatus).toBe("no_deadline");
    expect(report.summary).toBeDefined();
    expect(report.verifiedAt).toBeInstanceOf(Date);
  });

  it("returns a report for link_placement type", () => {
    const ctx = makeContext({ deliverableTitle: "Newsletter Link Placement" });
    const report = verifyDeliverable(ctx, "deal-1", "Test Deal");

    expect(report.deliverableType).toBe("link_placement");
    expect(report.checks).toHaveLength(3);
  });

  it("returns a report for social_mention type", () => {
    const ctx = makeContext({ deliverableTitle: "Social Mention Post" });
    const report = verifyDeliverable(ctx, "deal-1", "Test Deal");

    expect(report.deliverableType).toBe("social_mention");
    expect(report.checks).toHaveLength(3);
  });

  it("uses explicit deliverableType when provided", () => {
    const ctx = makeContext({ deliverableTitle: "Generic Item" });
    const report = verifyDeliverable(ctx, "deal-1", "Test Deal", "social_mention");

    expect(report.deliverableType).toBe("social_mention");
  });

  it("computes pass overall when all checks pass (verified status)", () => {
    const ctx = makeContext({
      deliverableTitle: "Ad Read",
      status: "verified",
    });
    const report = verifyDeliverable(ctx, "deal-1", "Test Deal");

    expect(report.overallStatus).toBe("pass");
    expect(report.checks.every((c) => c.status === "pass")).toBe(true);
  });

  it("computes fail overall when some checks fail", () => {
    const ctx = makeContext({
      deliverableTitle: "Ad Read",
      status: "in_progress",
      verificationData: {
        episodePublished: true,
        adDurationSeconds: 10,
        requiredDurationSeconds: 30,
        sponsorMentioned: false,
      },
    });
    const report = verifyDeliverable(ctx, "deal-1", "Test Deal");

    expect(report.overallStatus).toBe("fail");
  });

  it("sets deadlineStatus to overdue for past due dates", () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    const ctx = makeContext({
      deliverableTitle: "Ad Read",
      dueDate: past.toISOString(),
    });
    const report = verifyDeliverable(ctx, "deal-1", "Test Deal");

    expect(report.deadlineStatus).toBe("overdue");
    expect(report.summary).toContain("OVERDUE");
  });

  it("sets deadlineStatus to on_track for future due dates", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const ctx = makeContext({
      deliverableTitle: "Ad Read",
      dueDate: future.toISOString(),
    });
    const report = verifyDeliverable(ctx, "deal-1", "Test Deal");

    expect(report.deadlineStatus).toBe("on_track");
  });

  it("sets deadlineStatus to completed for verified status", () => {
    const ctx = makeContext({
      deliverableTitle: "Ad Read",
      status: "verified",
      dueDate: new Date().toISOString(),
    });
    const report = verifyDeliverable(ctx, "deal-1", "Test Deal");

    expect(report.deadlineStatus).toBe("completed");
  });

  it("generates meaningful summary", () => {
    const ctx = makeContext({
      deliverableTitle: "Test Ad Read",
      status: "pending",
      dueDate: null,
    });
    const report = verifyDeliverable(ctx, "deal-1", "Test Deal");

    expect(report.summary).toContain("Test Ad Read");
    expect(report.summary).toContain("pending");
  });
});

describe("verifyDeliverable - ad_read checks", () => {
  it("passes episode published check when episodePublished is true", () => {
    const ctx = makeContext({
      deliverableTitle: "Ad Read",
      status: "in_progress",
      verificationData: { episodePublished: true, episodeUrl: "https://podcast.com/ep1" },
    });
    const report = verifyDeliverable(ctx, "deal-1", "Deal");

    const epCheck = report.checks.find((c) => c.id === "ad_read_published");
    expect(epCheck?.status).toBe("pass");
    expect(epCheck?.evidence).toContain("https://podcast.com/ep1");
  });

  it("fails duration check when actual is less than required", () => {
    const ctx = makeContext({
      deliverableTitle: "Ad Read",
      status: "in_progress",
      verificationData: { adDurationSeconds: 15, requiredDurationSeconds: 30 },
    });
    const report = verifyDeliverable(ctx, "deal-1", "Deal");

    const durCheck = report.checks.find((c) => c.id === "ad_read_duration");
    expect(durCheck?.status).toBe("fail");
    expect(durCheck?.evidence).toContain("15s");
  });

  it("passes duration check when actual meets requirement", () => {
    const ctx = makeContext({
      deliverableTitle: "Ad Read",
      status: "in_progress",
      verificationData: { adDurationSeconds: 35, requiredDurationSeconds: 30 },
    });
    const report = verifyDeliverable(ctx, "deal-1", "Deal");

    const durCheck = report.checks.find((c) => c.id === "ad_read_duration");
    expect(durCheck?.status).toBe("pass");
  });

  it("passes sponsor mention check via transcript match", () => {
    const ctx = makeContext({
      deliverableTitle: "Ad Read",
      status: "in_progress",
      verificationData: {
        transcript: "This episode is sponsored by Acme Corp",
        sponsorName: "Acme Corp",
      },
    });
    const report = verifyDeliverable(ctx, "deal-1", "Deal");

    const mentionCheck = report.checks.find((c) => c.id === "ad_read_sponsor_mention");
    expect(mentionCheck?.status).toBe("pass");
  });

  it("fails sponsor mention check when sponsor not in transcript", () => {
    const ctx = makeContext({
      deliverableTitle: "Ad Read",
      status: "in_progress",
      verificationData: {
        transcript: "Thanks for listening to this episode",
        sponsorName: "Acme Corp",
      },
    });
    const report = verifyDeliverable(ctx, "deal-1", "Deal");

    const mentionCheck = report.checks.find((c) => c.id === "ad_read_sponsor_mention");
    expect(mentionCheck?.status).toBe("fail");
  });

  it("defaults required duration to 30 seconds", () => {
    const ctx = makeContext({
      deliverableTitle: "Ad Read",
      status: "in_progress",
      verificationData: { adDurationSeconds: 35 },
    });
    const report = verifyDeliverable(ctx, "deal-1", "Deal");

    const durCheck = report.checks.find((c) => c.id === "ad_read_duration");
    expect(durCheck?.description).toContain("30");
  });
});

describe("verifyDeliverable - link_placement checks", () => {
  it("passes URL present check when foundUrl contains requiredUrl", () => {
    const ctx = makeContext({
      deliverableTitle: "Link Placement",
      status: "in_progress",
      verificationData: {
        requiredUrl: "sponsor.com",
        foundUrl: "https://mysite.com/article?ref=sponsor.com",
      },
    });
    const report = verifyDeliverable(ctx, "deal-1", "Deal");

    const urlCheck = report.checks.find((c) => c.id === "link_url_present");
    expect(urlCheck?.status).toBe("pass");
  });

  it("pending URL check when foundUrl does not contain requiredUrl", () => {
    const ctx = makeContext({
      deliverableTitle: "Link Placement",
      status: "in_progress",
      verificationData: {
        requiredUrl: "sponsor.com",
        foundUrl: "https://mysite.com/article",
      },
    });
    const report = verifyDeliverable(ctx, "deal-1", "Deal");

    const urlCheck = report.checks.find((c) => c.id === "link_url_present");
    expect(urlCheck?.status).toBe("pending");
  });

  it("passes position check when positions match", () => {
    const ctx = makeContext({
      deliverableTitle: "Link Placement",
      status: "in_progress",
      verificationData: {
        requiredPosition: "body",
        actualPosition: "body",
      },
    });
    const report = verifyDeliverable(ctx, "deal-1", "Deal");

    const posCheck = report.checks.find((c) => c.id === "link_placement_position");
    expect(posCheck?.status).toBe("pass");
  });

  it("fails position check when positions do not match", () => {
    const ctx = makeContext({
      deliverableTitle: "Link Placement",
      status: "in_progress",
      verificationData: {
        requiredPosition: "body",
        actualPosition: "footer",
      },
    });
    const report = verifyDeliverable(ctx, "deal-1", "Deal");

    const posCheck = report.checks.find((c) => c.id === "link_placement_position");
    expect(posCheck?.status).toBe("fail");
  });

  it("returns not_applicable position check when no position required", () => {
    const ctx = makeContext({
      deliverableTitle: "Link Placement",
      status: "in_progress",
      verificationData: {},
    });
    const report = verifyDeliverable(ctx, "deal-1", "Deal");

    const posCheck = report.checks.find((c) => c.id === "link_placement_position");
    expect(posCheck?.status).toBe("not_applicable");
  });

  it("passes content published check when contentPublished is true", () => {
    const ctx = makeContext({
      deliverableTitle: "Link Placement",
      status: "in_progress",
      verificationData: {
        contentPublished: true,
        contentUrl: "https://newsletter.com/issue-42",
      },
    });
    const report = verifyDeliverable(ctx, "deal-1", "Deal");

    const pubCheck = report.checks.find((c) => c.id === "link_content_published");
    expect(pubCheck?.status).toBe("pass");
  });
});

describe("verifyDeliverable - social_mention checks", () => {
  it("passes post published check when postPublished is true", () => {
    const ctx = makeContext({
      deliverableTitle: "Social Mention",
      status: "in_progress",
      verificationData: {
        postPublished: true,
        postUrl: "https://twitter.com/user/status/123",
      },
    });
    const report = verifyDeliverable(ctx, "deal-1", "Deal");

    const pubCheck = report.checks.find((c) => c.id === "social_post_published");
    expect(pubCheck?.status).toBe("pass");
  });

  it("passes sponsor mention check via postContent match", () => {
    const ctx = makeContext({
      deliverableTitle: "Social Mention",
      status: "in_progress",
      verificationData: {
        requiredHandle: "acmecorp",
        postContent: "Excited to partner with @acmecorp for our new series!",
      },
    });
    const report = verifyDeliverable(ctx, "deal-1", "Deal");

    const mentionCheck = report.checks.find((c) => c.id === "social_sponsor_mentioned");
    expect(mentionCheck?.status).toBe("pass");
  });

  it("fails sponsor mention check when handle not in content", () => {
    const ctx = makeContext({
      deliverableTitle: "Social Mention",
      status: "in_progress",
      verificationData: {
        requiredHandle: "acmecorp",
        postContent: "Check out our new episode!",
      },
    });
    const report = verifyDeliverable(ctx, "deal-1", "Deal");

    const mentionCheck = report.checks.find((c) => c.id === "social_sponsor_mentioned");
    expect(mentionCheck?.status).toBe("fail");
  });

  it("passes hashtag check when all required hashtags present", () => {
    const ctx = makeContext({
      deliverableTitle: "Social Mention",
      status: "in_progress",
      verificationData: {
        requiredHashtags: ["#sponsored", "#ad"],
        postContent: "Loving the new product! #sponsored #ad",
      },
    });
    const report = verifyDeliverable(ctx, "deal-1", "Deal");

    const hashCheck = report.checks.find((c) => c.id === "social_hashtags");
    expect(hashCheck?.status).toBe("pass");
  });

  it("fails hashtag check when some hashtags missing", () => {
    const ctx = makeContext({
      deliverableTitle: "Social Mention",
      status: "in_progress",
      verificationData: {
        requiredHashtags: ["#sponsored", "#ad", "#partner"],
        postContent: "Loving the new product! #sponsored #ad",
      },
    });
    const report = verifyDeliverable(ctx, "deal-1", "Deal");

    const hashCheck = report.checks.find((c) => c.id === "social_hashtags");
    expect(hashCheck?.status).toBe("fail");
    expect(hashCheck?.evidence).toContain("#partner");
  });

  it("returns not_applicable hashtag check when no requirements", () => {
    const ctx = makeContext({
      deliverableTitle: "Social Mention",
      status: "in_progress",
      verificationData: {},
    });
    const report = verifyDeliverable(ctx, "deal-1", "Deal");

    const hashCheck = report.checks.find((c) => c.id === "social_hashtags");
    expect(hashCheck?.status).toBe("not_applicable");
  });
});
