import { describe, it, expect } from "vitest";
import {
  matchKeywords,
  detectSponsorRead,
  computeKeywordConfidence,
  type KeywordMatchOptions,
} from "@/lib/verification/keywordMatcher";

describe("matchKeywords", () => {
  it("returns matched=true when all keywords found", () => {
    const result = matchKeywords("Acme Corp is great", ["Acme", "great"]);
    expect(result.matched).toBe(true);
    expect(result.matchedKeywords).toEqual(["Acme", "great"]);
    expect(result.totalKeywords).toBe(2);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("returns matched=false when no keywords found", () => {
    const result = matchKeywords("Hello world", ["Acme", "Widget"]);
    expect(result.matched).toBe(false);
    expect(result.matchedKeywords).toEqual([]);
    expect(result.confidence).toBe(0);
  });

  it("returns partial match with some keywords matched", () => {
    const result = matchKeywords("Acme Corp mentioned", ["Acme", "Widget"]);
    expect(result.matchedKeywords).toEqual(["Acme"]);
    expect(result.totalKeywords).toBe(2);
    expect(result.details).toContain("1/2");
  });

  it("handles empty keywords array", () => {
    const result = matchKeywords("Some transcript", []);
    expect(result.matchedKeywords).toEqual([]);
    expect(result.totalKeywords).toBe(0);
    expect(result.details).toContain("No keywords provided");
  });

  it("handles empty transcript", () => {
    const result = matchKeywords("", ["Acme"]);
    expect(result.matched).toBe(false);
    expect(result.matchedKeywords).toEqual([]);
  });

  it("is case insensitive by default", () => {
    const result = matchKeywords("ACME CORP is here", ["acme corp"]);
    expect(result.matched).toBe(true);
    expect(result.matchedKeywords).toContain("acme corp");
  });

  it("respects caseSensitive option", () => {
    const caseSensitive = matchKeywords("ACME CORP", ["acme"], {
      caseSensitive: true,
    });
    expect(caseSensitive.matchedKeywords).toEqual([]);

    const caseInsensitive = matchKeywords("ACME CORP", ["acme"], {
      caseSensitive: false,
    });
    expect(caseInsensitive.matchedKeywords).toContain("acme");
  });

  it("requires all keywords when requireAllKeywords is true and all match", () => {
    const result = matchKeywords("Acme Corp Widget", ["Acme", "Widget"], {
      requireAllKeywords: true,
    });
    expect(result.matched).toBe(true);
    expect(result.confidence).toBe(1);
  });

  it("fails when requireAllKeywords is true and some missing", () => {
    const result = matchKeywords("Acme Corp", ["Acme", "Widget"], {
      requireAllKeywords: true,
    });
    expect(result.matched).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.details).toContain("requireAllKeywords");
  });

  it("boosts confidence with sponsor signal phrases", () => {
    const plain = matchKeywords("Acme Corp is a company", ["Acme", "Widget", "Tech"]);
    const withSignal = matchKeywords(
      "This episode is sponsored by Acme Corp",
      ["Acme", "Widget", "Tech"]
    );
    expect(withSignal.confidence).toBeGreaterThan(plain.confidence);
    expect(withSignal.details).toContain("sponsor signal phrase");
  });

  it("detects multiple signal phrases and caps boost", () => {
    const result = matchKeywords(
      "This episode is sponsored by Acme. Brought to you by Acme. Made possible by Acme.",
      ["Acme"]
    );
    expect(result.details).toContain("sponsor signal phrase");
  });

  it("applies anti-signal penalty", () => {
    const normal = matchKeywords("Acme Corp is great", ["Acme"]);
    const withAnti = matchKeywords(
      "Acme Corp is great but this is not sponsored by Acme Corp",
      ["Acme"]
    );
    expect(withAnti.confidence).toBeLessThan(normal.confidence);
    expect(withAnti.details).toContain("anti-signal");
  });

  it("applies multiple anti-signal penalties", () => {
    const result = matchKeywords(
      "Not sponsored by Acme. Not affiliated with Acme. No sponsorship from Acme. Not a sponsor Acme.",
      ["Acme"]
    );
    expect(result.confidence).toBe(0);
  });

  it("confidence is clamped to [0, 1]", () => {
    const result = matchKeywords(
      "Not sponsored by Acme. Not affiliated with Acme. No sponsorship. Not a sponsor.",
      ["Acme"]
    );
    expect(result.confidence).toBe(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("confidence is rounded to 2 decimal places", () => {
    const result = matchKeywords("Acme Corp", ["Acme"]);
    const decimals = result.confidence.toString().split(".")[1]?.length ?? 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });

  it("respects custom minConfidenceThreshold", () => {
    const result = matchKeywords("Mentioned Acme briefly", ["Acme", "Widget", "Sponsor", "Product"], {
      minConfidenceThreshold: 0.5,
    });
    expect(result.matched).toBe(false);
    expect(result.confidence).toBeLessThan(0.5);
  });

  it("minConfidenceThreshold of 0 always matches if any keyword found", () => {
    const result = matchKeywords("Acme Corp", ["Acme"], {
      minConfidenceThreshold: 0,
    });
    expect(result.matched).toBe(true);
  });

  it("handles keywords with regex special characters", () => {
    const result = matchKeywords("Price is $50.00 (USD)", ["$50.00", "(USD)"]);
    expect(result.matchedKeywords).toContain("$50.00");
    expect(result.matchedKeywords).toContain("(USD)");
  });

  it("handles multiline transcripts", () => {
    const transcript = "Line one\nLine two with Acme\nLine three";
    const result = matchKeywords(transcript, ["Acme"]);
    expect(result.matchedKeywords).toContain("Acme");
  });

  it("handles tabs and extra whitespace", () => {
    const transcript = "  Acme   Corp\tis\there  ";
    const result = matchKeywords(transcript, ["Acme"]);
    expect(result.matchedKeywords).toContain("Acme");
  });

  it("provides correct details for all matched", () => {
    const result = matchKeywords("Acme Widget", ["Acme", "Widget"]);
    expect(result.details).toContain("All 2 keyword(s) matched");
  });

  it("provides correct details for none matched", () => {
    const result = matchKeywords("Hello world", ["Acme", "Widget"]);
    expect(result.details).toContain("None of 2 keyword(s) found");
  });

  it("provides correct details for partial match", () => {
    const result = matchKeywords("Acme is here", ["Acme", "Widget"]);
    expect(result.details).toContain("1/2 keyword(s) matched");
  });

  it("handles single-character keywords", () => {
    const result = matchKeywords("A B C", ["A", "B"]);
    expect(result.matchedKeywords).toContain("A");
    expect(result.matchedKeywords).toContain("B");
  });

  it("handles keyword that starts with non-word character", () => {
    const result = matchKeywords("Use code #SPONSOR", ["#SPONSOR"]);
    expect(result.matchedKeywords).toContain("#SPONSOR");
  });

  it("handles very long transcript", () => {
    const transcript = "Word ".repeat(10000) + "Acme Corp";
    const result = matchKeywords(transcript, ["Acme"]);
    expect(result.matchedKeywords).toContain("Acme");
  });
});

describe("detectSponsorRead", () => {
  it("detects sponsor name in transcript", () => {
    const result = detectSponsorRead(
      "This episode is sponsored by Acme Corp",
      "Acme Corp"
    );
    expect(result.matched).toBe(true);
    expect(result.matchedKeywords).toContain("Acme Corp");
  });

  it("detects sponsor first name as partial match", () => {
    const result = detectSponsorRead("Thanks Acme for sponsoring", "Acme Corp");
    expect(result.matchedKeywords).toContain("Acme");
  });

  it("detects product name", () => {
    const result = detectSponsorRead(
      "Check out WidgetPro today",
      "Acme Corp",
      "WidgetPro"
    );
    expect(result.matchedKeywords).toContain("WidgetPro");
  });

  it("detects both sponsor and product", () => {
    const result = detectSponsorRead(
      "Acme Corp presents WidgetPro",
      "Acme Corp",
      "WidgetPro"
    );
    expect(result.matchedKeywords).toContain("Acme Corp");
    expect(result.matchedKeywords).toContain("WidgetPro");
  });

  it("includes placement type as keyword", () => {
    const result = detectSponsorRead(
      "This is a mid-roll brought to you by Acme",
      "Acme",
      undefined,
      "mid-roll"
    );
    expect(result.matchedKeywords).toContain("mid-roll");
  });

  it("handles empty sponsor name gracefully", () => {
    const result = detectSponsorRead("Some transcript text", "");
    expect(result.totalKeywords).toBe(0);
  });

  it("handles single-word sponsor name", () => {
    const result = detectSponsorRead("Thanks to Acme for sponsoring", "Acme");
    expect(result.matchedKeywords).toContain("Acme");
  });

  it("handles multi-word sponsor name producing partial keyword", () => {
    const result = detectSponsorRead("Acme Corp mentioned here", "Acme Corp Holdings");
    expect(result.matchedKeywords).toContain("Acme");
  });

  it("returns non-matched when sponsor not in transcript", () => {
    const result = detectSponsorRead("No sponsors here", "Acme Corp");
    expect(result.matched).toBe(false);
  });

  it("uses case-insensitive matching by default", () => {
    const result = detectSponsorRead("acme corp IS GREAT", "Acme Corp");
    expect(result.matched).toBe(true);
  });
});

describe("computeKeywordConfidence", () => {
  it("returns confidence score for sponsor name match", () => {
    const confidence = computeKeywordConfidence(
      "Sponsored by Acme Corp",
      "Acme Corp"
    );
    expect(confidence).toBeGreaterThan(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it("returns 0 when no keywords match", () => {
    const confidence = computeKeywordConfidence("Hello world", "Acme Corp");
    expect(confidence).toBe(0);
  });

  it("includes product name in matching", () => {
    const withoutProduct = computeKeywordConfidence(
      "WidgetPro is great",
      "Acme Corp"
    );
    const withProduct = computeKeywordConfidence(
      "WidgetPro is great",
      "Acme Corp",
      "WidgetPro"
    );
    expect(withProduct).toBeGreaterThan(withoutProduct);
  });

  it("includes additional keywords", () => {
    const without = computeKeywordConfidence("Tech podcast", "Acme Corp");
    const withExtra = computeKeywordConfidence("Tech podcast", "Acme Corp", null, [
      "Tech",
    ]);
    expect(withExtra).toBeGreaterThan(without);
  });

  it("handles all matching criteria", () => {
    const confidence = computeKeywordConfidence(
      "Acme Corp presents WidgetPro - a tech innovation",
      "Acme Corp",
      "WidgetPro",
      ["innovation"]
    );
    expect(confidence).toBeGreaterThan(0);
  });

  it("returns number rounded to 2 decimals", () => {
    const confidence = computeKeywordConfidence(
      "Sponsored by Acme",
      "Acme"
    );
    const decimals = confidence.toString().split(".")[1]?.length ?? 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });
});
