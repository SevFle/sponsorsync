import { describe, it, expect } from "vitest";
import {
  analyzeTimestamps,
  isPlacementCorrect,
  type TimestampAnalysisInput,
  type PlacementType,
} from "@/lib/verification/timestampAnalyzer";

function makeInput(overrides: Partial<TimestampAnalysisInput> = {}): TimestampAnalysisInput {
  return {
    adTimestampSeconds: null,
    episodeDurationSeconds: null,
    requiredPlacement: null,
    episodeTotalSegments: null,
    adSegmentIndex: null,
    ...overrides,
  };
}

describe("analyzeTimestamps", () => {
  it("detects pre-roll placement at start of episode", () => {
    const result = analyzeTimestamps(makeInput({
      adTimestampSeconds: 30,
      episodeDurationSeconds: 1800,
    }));
    expect(result.placement).toBe("pre_roll");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.positionPercent).toBeCloseTo(30 / 1800, 3);
  });

  it("detects mid-roll placement in middle of episode", () => {
    const result = analyzeTimestamps(makeInput({
      adTimestampSeconds: 900,
      episodeDurationSeconds: 1800,
    }));
    expect(result.placement).toBe("mid_roll");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.details).toContain("mid-roll");
  });

  it("detects post-roll placement near end of episode", () => {
    const result = analyzeTimestamps(makeInput({
      adTimestampSeconds: 1650,
      episodeDurationSeconds: 1800,
    }));
    expect(result.placement).toBe("post_roll");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("returns unknown when no timestamp data", () => {
    const result = analyzeTimestamps(makeInput());
    expect(result.placement).toBe("unknown");
    expect(result.confidence).toBe(0);
    expect(result.timestampSeconds).toBeNull();
    expect(result.positionPercent).toBeNull();
  });

  it("uses segment-based classification when available", () => {
    const result = analyzeTimestamps(makeInput({
      adSegmentIndex: 0,
      episodeTotalSegments: 5,
    }));
    expect(result.placement).toBe("pre_roll");
    expect(result.confidence).toBe(0.95);
  });

  it("classifies last segment as post-roll", () => {
    const result = analyzeTimestamps(makeInput({
      adSegmentIndex: 4,
      episodeTotalSegments: 5,
    }));
    expect(result.placement).toBe("post_roll");
    expect(result.confidence).toBe(0.9);
  });

  it("classifies middle segments as mid-roll", () => {
    const result = analyzeTimestamps(makeInput({
      adSegmentIndex: 2,
      episodeTotalSegments: 5,
    }));
    expect(result.placement).toBe("mid_roll");
    expect(result.confidence).toBe(0.9);
  });

  it("verifies placement match when required placement matches", () => {
    const result = analyzeTimestamps(makeInput({
      adTimestampSeconds: 30,
      episodeDurationSeconds: 1800,
      requiredPlacement: "pre_roll",
    }));
    expect(result.placement).toBe("pre_roll");
    expect(result.details).toContain("matches");
    expect(result.details).toContain("pre-roll");
  });

  it("detects placement mismatch", () => {
    const result = analyzeTimestamps(makeInput({
      adTimestampSeconds: 30,
      episodeDurationSeconds: 1800,
      requiredPlacement: "mid_roll",
    }));
    expect(result.placement).toBe("pre_roll");
    expect(result.details).toContain("mismatch");
    expect(result.details).toContain("PLACEMENT MISMATCH");
  });

  it("boosts confidence when placement matches requirement", () => {
    const matching = analyzeTimestamps(makeInput({
      adTimestampSeconds: 30,
      episodeDurationSeconds: 1800,
      requiredPlacement: "pre_roll",
    }));
    const nonMatching = analyzeTimestamps(makeInput({
      adTimestampSeconds: 30,
      episodeDurationSeconds: 1800,
      requiredPlacement: "post_roll",
    }));
    expect(matching.confidence).toBeGreaterThan(nonMatching.confidence);
  });

  it("formats timestamps correctly in details", () => {
    const result = analyzeTimestamps(makeInput({
      adTimestampSeconds: 90,
      episodeDurationSeconds: 3600,
    }));
    expect(result.details).toContain("1:30");
    expect(result.details).toContain("60:00");
  });

  it("handles zero episode duration", () => {
    const result = analyzeTimestamps(makeInput({
      adTimestampSeconds: 0,
      episodeDurationSeconds: 0,
    }));
    expect(result.positionPercent).toBeNull();
    expect(result.placement).toBe("unknown");
  });

  it("handles timestamp at exactly 15% boundary for pre-roll", () => {
    const result = analyzeTimestamps(makeInput({
      adTimestampSeconds: 270,
      episodeDurationSeconds: 1800,
    }));
    expect(result.placement).toBe("pre_roll");
    expect(result.positionPercent).toBe(0.15);
  });

  it("handles timestamp at exactly 85% boundary for post-roll", () => {
    const result = analyzeTimestamps(makeInput({
      adTimestampSeconds: 1530,
      episodeDurationSeconds: 1800,
    }));
    expect(result.placement).toBe("post_roll");
  });

  it("rounds confidence to 2 decimal places", () => {
    const result = analyzeTimestamps(makeInput({
      adTimestampSeconds: 30,
      episodeDurationSeconds: 1800,
    }));
    const decimals = result.confidence.toString().split(".")[1]?.length ?? 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });

  it("skips placement match when required is unknown", () => {
    const result = analyzeTimestamps(makeInput({
      adTimestampSeconds: 30,
      episodeDurationSeconds: 1800,
      requiredPlacement: "unknown",
    }));
    expect(result.details).not.toContain("mismatch");
  });
});

describe("isPlacementCorrect", () => {
  it("returns true when placements match", () => {
    expect(isPlacementCorrect("pre_roll", "pre_roll")).toBe(true);
    expect(isPlacementCorrect("mid_roll", "mid_roll")).toBe(true);
    expect(isPlacementCorrect("post_roll", "post_roll")).toBe(true);
  });

  it("returns false when placements do not match", () => {
    expect(isPlacementCorrect("pre_roll", "mid_roll")).toBe(false);
    expect(isPlacementCorrect("post_roll", "pre_roll")).toBe(false);
  });

  it("returns true when either is unknown", () => {
    expect(isPlacementCorrect("unknown", "pre_roll")).toBe(true);
    expect(isPlacementCorrect("mid_roll", "unknown")).toBe(true);
    expect(isPlacementCorrect("unknown", "unknown")).toBe(true);
  });
});
