import { describe, it, expect } from "vitest";
import { checkDeliverableStatus } from "@/domain/deliverables";

describe("checkDeliverableStatus", () => {
  it("returns completed when completedDate is set", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    expect(checkDeliverableStatus(future.toISOString(), "2024-01-01")).toBe("completed");
  });

  it("returns overdue when due date is in the past", () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    expect(checkDeliverableStatus(past.toISOString(), null)).toBe("overdue");
  });

  it("returns at_risk when due date is within 3 days", () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);
    expect(checkDeliverableStatus(soon.toISOString(), null)).toBe("at_risk");
  });

  it("returns on_track when due date is more than 3 days away", () => {
    const later = new Date();
    later.setDate(later.getDate() + 10);
    expect(checkDeliverableStatus(later.toISOString(), null)).toBe("on_track");
  });
});
