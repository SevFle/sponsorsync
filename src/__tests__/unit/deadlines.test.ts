import { describe, it, expect } from "vitest";
import {
  getUpcomingDeadlines,
  getTieredDeadlineAlerts,
  formatDeadlineDate,
  buildNotificationKey,
} from "@/domain/deadlines";

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

  it("includes deliverableId in alerts", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = getUpcomingDeadlines([
      { id: "d1", title: "Newsletter Ad", dueDate: tomorrow.toISOString(), status: "pending", dealId: "deal-1", dealTitle: "Big Sponsor" },
    ]);

    expect(result[0].deliverableId).toBe("d1");
  });
});

describe("getTieredDeadlineAlerts", () => {
  it("returns empty array for deliverables with no due dates", () => {
    const result = getTieredDeadlineAlerts(
      [{ id: "1", title: "Task", dueDate: null, status: "pending", dealId: "d1", dealTitle: "Deal" }],
      [7, 3, 1]
    );
    expect(result).toEqual([]);
  });

  it("returns alert for deliverable within the largest tier window", () => {
    const in5Days = new Date();
    in5Days.setDate(in5Days.getDate() + 5);

    const result = getTieredDeadlineAlerts(
      [{ id: "d1", title: "Ad Read", dueDate: in5Days.toISOString(), status: "pending", dealId: "deal-1", dealTitle: "Sponsor" }],
      [7, 3, 1]
    );

    expect(result).toHaveLength(1);
    expect(result[0].deliverableTitle).toBe("Ad Read");
    expect(result[0].matchedTier).toBe(7);
    expect(result[0].isOverdue).toBe(false);
  });

  it("returns alert with closest matching tier", () => {
    const in2Days = new Date();
    in2Days.setDate(in2Days.getDate() + 2);

    const result = getTieredDeadlineAlerts(
      [{ id: "d1", title: "Ad", dueDate: in2Days.toISOString(), status: "pending", dealId: "deal-1", dealTitle: "Sponsor" }],
      [7, 3, 1]
    );

    expect(result).toHaveLength(1);
    expect(result[0].matchedTier).toBe(3);
  });

  it("returns alert for 1-day tier", () => {
    const tomorrow = new Date(Date.now() + 25 * 60 * 60 * 1000);

    const result = getTieredDeadlineAlerts(
      [{ id: "d1", title: "Ad", dueDate: tomorrow.toISOString(), status: "pending", dealId: "deal-1", dealTitle: "Sponsor" }],
      [7, 3, 1]
    );

    expect(result).toHaveLength(1);
    expect(result[0].matchedTier).toBe(1);
    expect(result[0].severity).toBe("critical");
  });

  it("returns overdue alert for past-due deliverables", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = getTieredDeadlineAlerts(
      [{ id: "d1", title: "Late", dueDate: yesterday.toISOString(), status: "pending", dealId: "deal-1", dealTitle: "Sponsor" }],
      [7, 3, 1]
    );

    expect(result).toHaveLength(1);
    expect(result[0].isOverdue).toBe(true);
    expect(result[0].matchedTier).toBe(0);
    expect(result[0].severity).toBe("critical");
  });

  it("excludes verified and submitted deliverables", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = getTieredDeadlineAlerts(
      [
        { id: "1", title: "Verified", dueDate: tomorrow.toISOString(), status: "verified", dealId: "d1", dealTitle: "Deal" },
        { id: "2", title: "Submitted", dueDate: tomorrow.toISOString(), status: "submitted", dealId: "d1", dealTitle: "Deal" },
      ],
      [7, 3, 1]
    );

    expect(result).toEqual([]);
  });

  it("excludes deliverables beyond all tier windows", () => {
    const in20Days = new Date();
    in20Days.setDate(in20Days.getDate() + 20);

    const result = getTieredDeadlineAlerts(
      [{ id: "d1", title: "Far", dueDate: in20Days.toISOString(), status: "pending", dealId: "deal-1", dealTitle: "Sponsor" }],
      [7, 3, 1]
    );

    expect(result).toEqual([]);
  });

  it("uses default schedule when user schedule is null", () => {
    const in5Days = new Date();
    in5Days.setDate(in5Days.getDate() + 5);

    const result = getTieredDeadlineAlerts(
      [{ id: "d1", title: "Ad", dueDate: in5Days.toISOString(), status: "pending", dealId: "deal-1", dealTitle: "Sponsor" }],
      null
    );

    expect(result).toHaveLength(1);
    expect(result[0].matchedTier).toBe(7);
  });

  it("sorts overdue before upcoming, then by days remaining", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const in2Days = new Date();
    in2Days.setDate(in2Days.getDate() + 2);
    const in5Days = new Date();
    in5Days.setDate(in5Days.getDate() + 5);

    const result = getTieredDeadlineAlerts(
      [
        { id: "1", title: "Future B", dueDate: in5Days.toISOString(), status: "pending", dealId: "d1", dealTitle: "Deal" },
        { id: "2", title: "Overdue", dueDate: yesterday.toISOString(), status: "pending", dealId: "d2", dealTitle: "Deal" },
        { id: "3", title: "Future A", dueDate: in2Days.toISOString(), status: "pending", dealId: "d3", dealTitle: "Deal" },
      ],
      [7, 3, 1]
    );

    expect(result[0].isOverdue).toBe(true);
    expect(result[1].daysRemaining).toBeLessThanOrEqual(result[2].daysRemaining);
  });
});

describe("buildNotificationKey", () => {
  it("builds key for deadline reminder with tier", () => {
    const key = buildNotificationKey("del-123", "deadline_reminder", 3);
    expect(key).toBe("reminder:del-123:tier-3");
  });

  it("builds key for deadline reminder without tier", () => {
    const key = buildNotificationKey("del-123", "deadline_reminder");
    expect(key).toBe("reminder:del-123:tier-0");
  });

  it("builds key for overdue with today's date", () => {
    const key = buildNotificationKey("del-123", "overdue_deliverable");
    const today = new Date().toISOString().split("T")[0];
    expect(key).toBe(`overdue:del-123:${today}`);
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
});
