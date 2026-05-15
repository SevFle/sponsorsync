import { describe, it, expect } from "vitest";
import {
  isValidStatusTransition,
  updateDealStatusSchema,
  DEAL_PIPELINE_STATUSES,
  ALL_DEAL_STATUSES,
} from "@/domain/deals";
import type { DealStatus } from "@/domain/deals";

describe("isValidStatusTransition", () => {
  describe("draft transitions", () => {
    it("allows draft → proposed", () => {
      expect(isValidStatusTransition("draft", "proposed")).toBe(true);
    });

    it("allows draft → cancelled", () => {
      expect(isValidStatusTransition("draft", "cancelled")).toBe(true);
    });

    it("rejects draft → active", () => {
      expect(isValidStatusTransition("draft", "active")).toBe(false);
    });

    it("rejects draft → completed", () => {
      expect(isValidStatusTransition("draft", "completed")).toBe(false);
    });

    it("rejects draft → draft (no-op)", () => {
      expect(isValidStatusTransition("draft", "draft")).toBe(false);
    });
  });

  describe("proposed transitions", () => {
    it("allows proposed → active", () => {
      expect(isValidStatusTransition("proposed", "active")).toBe(true);
    });

    it("allows proposed → draft (revert)", () => {
      expect(isValidStatusTransition("proposed", "draft")).toBe(true);
    });

    it("allows proposed → cancelled", () => {
      expect(isValidStatusTransition("proposed", "cancelled")).toBe(true);
    });

    it("rejects proposed → completed", () => {
      expect(isValidStatusTransition("proposed", "completed")).toBe(false);
    });

    it("rejects proposed → proposed (no-op)", () => {
      expect(isValidStatusTransition("proposed", "proposed")).toBe(false);
    });
  });

  describe("active transitions", () => {
    it("allows active → completed", () => {
      expect(isValidStatusTransition("active", "completed")).toBe(true);
    });

    it("allows active → cancelled", () => {
      expect(isValidStatusTransition("active", "cancelled")).toBe(true);
    });

    it("rejects active → draft", () => {
      expect(isValidStatusTransition("active", "draft")).toBe(false);
    });

    it("rejects active → proposed", () => {
      expect(isValidStatusTransition("active", "proposed")).toBe(false);
    });

    it("rejects active → active (no-op)", () => {
      expect(isValidStatusTransition("active", "active")).toBe(false);
    });
  });

  describe("completed transitions", () => {
    it("allows completed → active (reopen)", () => {
      expect(isValidStatusTransition("completed", "active")).toBe(true);
    });

    it("rejects completed → draft", () => {
      expect(isValidStatusTransition("completed", "draft")).toBe(false);
    });

    it("rejects completed → proposed", () => {
      expect(isValidStatusTransition("completed", "proposed")).toBe(false);
    });

    it("rejects completed → cancelled", () => {
      expect(isValidStatusTransition("completed", "cancelled")).toBe(false);
    });

    it("rejects completed → completed (no-op)", () => {
      expect(isValidStatusTransition("completed", "completed")).toBe(false);
    });
  });

  describe("cancelled transitions", () => {
    it("allows cancelled → draft (restart)", () => {
      expect(isValidStatusTransition("cancelled", "draft")).toBe(true);
    });

    it("rejects cancelled → active", () => {
      expect(isValidStatusTransition("cancelled", "active")).toBe(false);
    });

    it("rejects cancelled → proposed", () => {
      expect(isValidStatusTransition("cancelled", "proposed")).toBe(false);
    });

    it("rejects cancelled → completed", () => {
      expect(isValidStatusTransition("cancelled", "completed")).toBe(false);
    });

    it("rejects cancelled → cancelled (no-op)", () => {
      expect(isValidStatusTransition("cancelled", "cancelled")).toBe(false);
    });
  });

  it("covers all combinations for every status", () => {
    const allStatuses: DealStatus[] = ["draft", "proposed", "active", "completed", "cancelled"];
    const allowedTransitions: Record<string, string[]> = {
      draft: ["proposed", "cancelled"],
      proposed: ["active", "draft", "cancelled"],
      active: ["completed", "cancelled"],
      completed: ["active"],
      cancelled: ["draft"],
    };

    for (const from of allStatuses) {
      for (const to of allStatuses) {
        const expected = allowedTransitions[from]?.includes(to) ?? false;
        expect(isValidStatusTransition(from, to)).toBe(expected);
      }
    }
  });
});

describe("updateDealStatusSchema", () => {
  it("accepts valid status values", () => {
    for (const status of ALL_DEAL_STATUSES) {
      const result = updateDealStatusSchema.safeParse({ status });
      expect(result.success, `Expected ${status} to be valid`).toBe(true);
    }
  });

  it("rejects invalid status value", () => {
    const result = updateDealStatusSchema.safeParse({ status: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects missing status", () => {
    const result = updateDealStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-string status", () => {
    const result = updateDealStatusSchema.safeParse({ status: 123 });
    expect(result.success).toBe(false);
  });
});

describe("DEAL_PIPELINE_STATUSES", () => {
  it("contains the pipeline stages in order", () => {
    expect(DEAL_PIPELINE_STATUSES).toEqual(["draft", "proposed", "active", "completed"]);
  });
});

describe("ALL_DEAL_STATUSES", () => {
  it("contains all statuses including cancelled", () => {
    expect(ALL_DEAL_STATUSES).toEqual(["draft", "proposed", "active", "completed", "cancelled"]);
  });
});
