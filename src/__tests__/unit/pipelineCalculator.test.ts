import { describe, it, expect } from "vitest";
import {
  computePipelineStages,
  computePipelineSummary,
  getStageLabel,
  getStageColor,
} from "@/lib/analytics/pipelineCalculator";
import type { DealLike } from "@/lib/analytics/pipelineCalculator";

describe("computePipelineStages", () => {
  it("returns zero counts for empty deals", () => {
    const stages = computePipelineStages([]);

    expect(stages).toHaveLength(4);
    for (const stage of stages) {
      expect(stage.count).toBe(0);
      expect(stage.value).toBe(0);
      expect(stage.percentage).toBe(0);
    }
  });

  it("counts deals by status correctly", () => {
    const deals: DealLike[] = [
      { status: "draft", totalValue: 1000 },
      { status: "draft", totalValue: 2000 },
      { status: "active", totalValue: 5000 },
      { status: "completed", totalValue: 8000 },
      { status: "cancelled", totalValue: 3000 },
    ];

    const stages = computePipelineStages(deals);

    const draft = stages.find((s) => s.stage === "draft")!;
    const active = stages.find((s) => s.stage === "active")!;
    const completed = stages.find((s) => s.stage === "completed")!;
    const cancelled = stages.find((s) => s.stage === "cancelled")!;

    expect(draft.count).toBe(2);
    expect(draft.value).toBe(3000);
    expect(draft.percentage).toBe(40);

    expect(active.count).toBe(1);
    expect(active.value).toBe(5000);
    expect(active.percentage).toBe(20);

    expect(completed.count).toBe(1);
    expect(completed.value).toBe(8000);
    expect(completed.percentage).toBe(20);

    expect(cancelled.count).toBe(1);
    expect(cancelled.value).toBe(3000);
    expect(cancelled.percentage).toBe(20);
  });

  it("handles deals with null totalValue", () => {
    const deals: DealLike[] = [
      { status: "draft", totalValue: null },
      { status: "active", totalValue: null },
    ];

    const stages = computePipelineStages(deals);

    expect(stages.find((s) => s.stage === "draft")!.value).toBe(0);
    expect(stages.find((s) => s.stage === "active")!.value).toBe(0);
  });
});

describe("computePipelineSummary", () => {
  it("returns zero summary for empty deals", () => {
    const summary = computePipelineSummary([]);

    expect(summary.totalDeals).toBe(0);
    expect(summary.totalPipelineValue).toBe(0);
    expect(summary.weightedPipelineValue).toBe(0);
  });

  it("computes total pipeline value", () => {
    const deals: DealLike[] = [
      { status: "draft", totalValue: 1000 },
      { status: "active", totalValue: 5000 },
    ];

    expect(computePipelineSummary(deals).totalPipelineValue).toBe(6000);
  });

  it("computes weighted pipeline value", () => {
    const deals: DealLike[] = [
      { status: "draft", totalValue: 1000 },
      { status: "active", totalValue: 5000 },
      { status: "completed", totalValue: 8000 },
      { status: "cancelled", totalValue: 3000 },
    ];

    const summary = computePipelineSummary(deals);

    expect(summary.weightedPipelineValue).toBe(1000 * 0.2 + 5000 * 0.6 + 8000 * 1.0 + 3000 * 0);
    expect(summary.weightedPipelineValue).toBe(11200);
  });

  it("counts total deals correctly", () => {
    const deals: DealLike[] = [
      { status: "draft", totalValue: 1000 },
      { status: "active", totalValue: 5000 },
      { status: "active", totalValue: 3000 },
    ];

    expect(computePipelineSummary(deals).totalDeals).toBe(3);
  });
});

describe("getStageLabel", () => {
  it("returns correct labels for known stages", () => {
    expect(getStageLabel("draft")).toBe("Draft");
    expect(getStageLabel("active")).toBe("Active");
    expect(getStageLabel("completed")).toBe("Completed");
    expect(getStageLabel("cancelled")).toBe("Cancelled");
  });

  it("returns stage name for unknown stages", () => {
    expect(getStageLabel("unknown")).toBe("unknown");
  });
});

describe("getStageColor", () => {
  it("returns valid hex colors for all stages", () => {
    const stages = ["draft", "active", "completed", "cancelled", "unknown"];
    for (const stage of stages) {
      const color = getStageColor(stage);
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
