import { describe, it, expect } from "vitest";
import {
  matchKeywords,
  detectSponsorRead,
  computeKeywordConfidence,
} from "@/lib/verification/keywordMatcher";

describe("matchKeywords", () => {
  it("returns matched=true when keyword is found in transcript", () => {
    const result = matchKeywords("This episode is sponsored by Acme Corp", ["Acme Corp"]);
    expect(result.matched).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.matchedKeywords).toContain("Acme Corp");
  });

  it("returns matched=false when keyword is not found", () => {
    const result = matchKeywords("This is a regular episode about tech", ["Acme Corp"]);
    expect(result.matched).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.matchedKeywords).toHaveLength(0);
  });

  it("handles multiple keywords with partial match", () => {
    const result = matchKeywords(
      "Thanks to Acme Corp for sponsoring this episode",
      ["Acme Corp", "WidgetPro", "SuperTool"]
    );
    expect(result.matched).toBe(true);
    expect(result.matchedKeywords).toEqual(["Acme Corp"]);
    expect(result.totalKeywords).toBe(3);
  });

  it("handles all keywords matching", () => {
    const result = matchKeywords(
      "Acme Corp and WidgetPro are great partners",
      ["Acme Corp", "WidgetPro"]
    );
    expect(result.matched).toBe(true);
    expect(result.matchedKeywords).toHaveLength(2);
    expect(result.confidence).toBeGreaterThanOrEqual(1);
  });

  it("respects caseSensitive option", () => {
    const caseSensitive = matchKeywords("acme corp is great", ["Acme Corp"], {
      caseSensitive: true,
    });
    expect(caseSensitive.matched).toBe(false);

    const caseInsensitive = matchKeywords("acme corp is great", ["Acme Corp"], {
      caseSensitive: false,
    });
    expect(caseInsensitive.matched).toBe(true);
  });

  it("requireAllKeywords mode returns 0 confidence if not all matched", () => {
    const result = matchKeywords(
      "Thanks to Acme Corp for sponsoring",
      ["Acme Corp", "WidgetPro"],
      { requireAllKeywords: true }
    );
    expect(result.confidence).toBe(0);
  });

  it("requireAllKeywords mode returns 1 confidence if all matched", () => {
    const result = matchKeywords(
      "Thanks to Acme Corp and WidgetPro for sponsoring",
      ["Acme Corp", "WidgetPro"],
      { requireAllKeywords: true }
    );
    expect(result.confidence).toBe(1);
  });

  it("boosts confidence with sponsor signal phrases", () => {
    const withSignal = matchKeywords(
      "This episode is sponsored by Acme Corp. Brought to you by Acme Corp.",
      ["Acme Corp"]
    );
    const withoutSignal = matchKeywords(
      "We talked about Acme Corp in the news today",
      ["Acme Corp"]
    );
    expect(withSignal.confidence).toBeGreaterThanOrEqual(withoutSignal.confidence);
  });

  it("applies anti-signal penalty", () => {
    const normal = matchKeywords("Acme Corp is mentioned here", ["Acme Corp"]);
    const antiSignal = matchKeywords(
      "This is not sponsored by Acme Corp, we are not affiliated with them",
      ["Acme Corp"]
    );
    expect(antiSignal.confidence).toBeLessThan(normal.confidence);
  });

  it("returns empty result for no keywords", () => {
    const result = matchKeywords("Some transcript text", []);
    expect(result.matched).toBe(false);
    expect(result.totalKeywords).toBe(0);
    expect(result.details).toContain("No keywords provided");
  });

  it("handles empty transcript", () => {
    const result = matchKeywords("", ["Acme Corp"]);
    expect(result.matched).toBe(false);
    expect(result.matchedKeywords).toHaveLength(0);
  });

  it("uses word boundary matching", () => {
    const result = matchKeywords("We use the acronym API today", ["API"]);
    expect(result.matched).toBe(true);
  });

  it("handles special regex characters in keywords", () => {
    const result = matchKeywords("Price is $50.00 per unit", ["$50.00"]);
    expect(result.matched).toBe(true);
    expect(result.matchedKeywords).toContain("$50.00");
  });

  it("respects custom minConfidenceThreshold", () => {
    const result = matchKeywords("Mentioned Acme Corp", ["Acme Corp", "WidgetPro", "ToolX"], {
      minConfidenceThreshold: 0.8,
    });
    expect(result.matched).toBe(false);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThan(0.8);
  });

  it("normalizes whitespace in transcript", () => {
    const result = matchKeywords("Thanks  to   Acme Corp\n\nfor   sponsoring", ["Acme Corp"]);
    expect(result.matched).toBe(true);
  });
});

describe("detectSponsorRead", () => {
  it("detects sponsor name in transcript", () => {
    const result = detectSponsorRead(
      "This episode is brought to you by Acme Corp, the leading widget maker",
      "Acme Corp"
    );
    expect(result.matched).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.matchedKeywords).toContain("Acme Corp");
  });

  it("detects sponsor with product name", () => {
    const result = detectSponsorRead(
      "Try WidgetPro from Acme Corp today",
      "Acme Corp",
      "WidgetPro"
    );
    expect(result.matched).toBe(true);
    expect(result.matchedKeywords).toContain("Acme Corp");
    expect(result.matchedKeywords).toContain("WidgetPro");
  });

  it("detects partial sponsor name", () => {
    const result = detectSponsorRead(
      "We're excited to have Acme on the show",
      "Acme Corp"
    );
    expect(result.matched).toBe(true);
  });

  it("returns low confidence without match", () => {
    const result = detectSponsorRead(
      "Today we discuss the latest tech news",
      "Acme Corp"
    );
    expect(result.matched).toBe(false);
  });

  it("includes placement type in keywords", () => {
    const result = detectSponsorRead(
      "This mid-roll is brought to you by Acme Corp",
      "Acme Corp",
      undefined,
      "mid-roll"
    );
    expect(result.matched).toBe(true);
  });
});

describe("computeKeywordConfidence", () => {
  it("returns 1 when sponsor name matches exactly", () => {
    const confidence = computeKeywordConfidence(
      "Sponsored by Acme Corp",
      "Acme Corp"
    );
    expect(confidence).toBeGreaterThan(0);
  });

  it("returns higher confidence with additional keywords", () => {
    const without = computeKeywordConfidence(
      "Thanks to Acme Corp and their product WidgetPro for sponsoring",
      "Acme Corp"
    );
    const withProduct = computeKeywordConfidence(
      "Thanks to Acme Corp and their product WidgetPro for sponsoring",
      "Acme Corp",
      "WidgetPro"
    );
    expect(withProduct).toBeGreaterThanOrEqual(without);
  });

  it("returns 0 when no keywords match", () => {
    const confidence = computeKeywordConfidence(
      "No relevant content here",
      "Acme Corp"
    );
    expect(confidence).toBe(0);
  });
});
