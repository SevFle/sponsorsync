import { describe, it, expect } from "vitest";
import { getUpcomingDeadlines, formatDeadlineDate } from "@/domain/deadlines";

describe("getUpcomingDeadlines", () => {
  it("returns empty array when no deliverables have due dates", () => {
    const result = getUpcomingDeadlines([
      { id: "1", title: "Task", dueDate: null, status: "pending", dealId: "d1", dealTitle: "Deal" },
    ]);
    expect(result).toEqual([]);
  });

  it("excludes completed deliverables", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = getUpcomingDeadlines([
      {
        id: "1",
        title: "Task",
        dueDate: tomorrow.toISOString(),
        status: "verified",
        dealId: "d1",
        dealTitle: "Deal",
      },
    ]);
    expect(result).toEqual([]);
  });

  it("returns deadlines sorted by days remaining", () => {
    const in2Days = new Date();
    in2Days.setDate(in2Days.getDate() + 2);
    const in5Days = new Date();
    in5Days.setDate(in5Days.getDate() + 5);

    const result = getUpcomingDeadlines([
      { id: "1", title: "Task A", dueDate: in5Days.toISOString(), status: "pending", dealId: "d1", dealTitle: "Deal 1" },
      { id: "2", title: "Task B", dueDate: in2Days.toISOString(), status: "pending", dealId: "d2", dealTitle: "Deal 2" },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].daysRemaining).toBeLessThanOrEqual(result[1].daysRemaining);
  });

  it("assigns correct severity based on days remaining", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const in5Days = new Date();
    in5Days.setDate(in5Days.getDate() + 5);

    const result = getUpcomingDeadlines([
      { id: "1", title: "Critical", dueDate: tomorrow.toISOString(), status: "pending", dealId: "d1", dealTitle: "Deal" },
      { id: "2", title: "Info", dueDate: in5Days.toISOString(), status: "pending", dealId: "d1", dealTitle: "Deal" },
    ]);

    expect(result[0].severity).toBe("critical");
    expect(result[1].severity).toBe("info");
  });
});

describe("formatDeadlineDate", () => {
  it("formats date correctly", () => {
    const result = formatDeadlineDate(new Date("2025-01-15"));
    expect(result).toBe("Jan 15, 2025");
  });
});
