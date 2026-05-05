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

  it("excludes submitted deliverables", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = getUpcomingDeadlines([
      {
        id: "1",
        title: "Task",
        dueDate: tomorrow.toISOString(),
        status: "submitted",
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

  it("returns empty array for empty input", () => {
    expect(getUpcomingDeadlines([])).toEqual([]);
  });

  it("excludes deliverables beyond the lookAhead window", () => {
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const result = getUpcomingDeadlines(
      [{ id: "1", title: "Far", dueDate: in30Days.toISOString(), status: "pending", dealId: "d1", dealTitle: "Deal" }],
      7
    );
    expect(result).toEqual([]);
  });

  it("respects custom lookAheadDays parameter", () => {
    const in20Days = new Date();
    in20Days.setDate(in20Days.getDate() + 20);

    const result = getUpcomingDeadlines(
      [{ id: "1", title: "Far", dueDate: in20Days.toISOString(), status: "pending", dealId: "d1", dealTitle: "Deal" }],
      30
    );
    expect(result).toHaveLength(1);
  });

  it("assigns warning severity for 2-3 days remaining", () => {
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);

    const result = getUpcomingDeadlines([
      { id: "1", title: "Warning", dueDate: in3Days.toISOString(), status: "pending", dealId: "d1", dealTitle: "Deal" },
    ]);

    expect(result[0].severity).toBe("warning");
  });

  it("includes correct deal info in alerts", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = getUpcomingDeadlines([
      { id: "d1", title: "Newsletter Ad", dueDate: tomorrow.toISOString(), status: "pending", dealId: "deal-1", dealTitle: "Big Sponsor" },
    ]);

    expect(result[0].dealId).toBe("deal-1");
    expect(result[0].dealTitle).toBe("Big Sponsor");
    expect(result[0].deliverableTitle).toBe("Newsletter Ad");
  });

  it("handles overdue deliverables (past due date)", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = getUpcomingDeadlines([
      { id: "1", title: "Overdue", dueDate: yesterday.toISOString(), status: "pending", dealId: "d1", dealTitle: "Deal" },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("critical");
  });
});

describe("formatDeadlineDate", () => {
  it("formats date correctly", () => {
    const result = formatDeadlineDate(new Date("2025-01-15"));
    expect(result).toBe("Jan 15, 2025");
  });

  it("formats different dates correctly", () => {
    expect(formatDeadlineDate(new Date("2025-12-25"))).toBe("Dec 25, 2025");
  });

  it("formats first day of year", () => {
    expect(formatDeadlineDate(new Date("2025-01-01"))).toBe("Jan 1, 2025");
  });

  it("formats last day of year", () => {
    expect(formatDeadlineDate(new Date("2025-12-31"))).toBe("Dec 31, 2025");
  });
});
