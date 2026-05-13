import { describe, it, expect } from "vitest";
import { verifyBulkDeliverables, type DeliverableRow } from "@/lib/deliverables/engine";

function makeRow(overrides: Partial<DeliverableRow> = {}): DeliverableRow {
  return {
    id: "d-1",
    dealId: "deal-1",
    dealTitle: "Test Deal",
    title: "Podcast Ad Read",
    description: null,
    status: "pending",
    dueDate: null,
    completedDate: null,
    verificationData: null,
    notes: null,
    ...overrides,
  };
}

describe("verifyBulkDeliverables", () => {
  it("returns zero counts for empty input", () => {
    const result = verifyBulkDeliverables([]);

    expect(result.totalChecked).toBe(0);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.pending).toBe(0);
    expect(result.overdueAlerts).toBe(0);
    expect(result.reports).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("counts a single pending deliverable correctly", () => {
    const result = verifyBulkDeliverables([makeRow()]);

    expect(result.totalChecked).toBe(1);
    expect(result.pending).toBe(1);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.reports).toHaveLength(1);
  });

  it("counts a verified deliverable as passed", () => {
    const result = verifyBulkDeliverables([
      makeRow({
        id: "d-verified",
        status: "verified",
        title: "Ad Read",
      }),
    ]);

    expect(result.totalChecked).toBe(1);
    expect(result.passed).toBe(1);
  });

  it("counts a failed deliverable correctly", () => {
    const result = verifyBulkDeliverables([
      makeRow({
        id: "d-failed",
        status: "in_progress",
        title: "Ad Read",
        verificationData: {
          adDurationSeconds: 10,
          requiredDurationSeconds: 30,
          sponsorMentioned: false,
        },
      }),
    ]);

    expect(result.totalChecked).toBe(1);
    expect(result.failed).toBe(1);
  });

  it("counts overdue alerts for past-due deliverables", () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);

    const result = verifyBulkDeliverables([
      makeRow({
        id: "d-overdue",
        dueDate: past.toISOString(),
        status: "pending",
      }),
    ]);

    expect(result.overdueAlerts).toBe(1);
  });

  it("handles mixed deliverable types", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);

    const result = verifyBulkDeliverables([
      makeRow({
        id: "d-ad",
        title: "Podcast Ad Read",
        status: "verified",
        dueDate: future.toISOString(),
      }),
      makeRow({
        id: "d-link",
        title: "Link Placement",
        status: "verified",
        dueDate: future.toISOString(),
      }),
      makeRow({
        id: "d-social",
        title: "Social Mention Post",
        status: "pending",
        dueDate: null,
      }),
    ]);

    expect(result.totalChecked).toBe(3);
    expect(result.passed).toBe(2);
    expect(result.pending).toBe(1);
    expect(result.reports).toHaveLength(3);

    const types = result.reports.map((r) => r.deliverableType);
    expect(types).toContain("ad_read");
    expect(types).toContain("link_placement");
    expect(types).toContain("social_mention");
  });

  it("captures errors for individual deliverable failures gracefully", () => {
    const validRow = makeRow({ id: "d-valid" });

    const result = verifyBulkDeliverables([validRow]);

    expect(result.errors).toHaveLength(0);
    expect(result.totalChecked).toBe(1);
  });

  it("produces reports with correct dealId and dealTitle", () => {
    const result = verifyBulkDeliverables([
      makeRow({ id: "d-1", dealId: "deal-a", dealTitle: "Deal A" }),
      makeRow({ id: "d-2", dealId: "deal-b", dealTitle: "Deal B" }),
    ]);

    expect(result.reports[0].dealId).toBe("deal-a");
    expect(result.reports[0].dealTitle).toBe("Deal A");
    expect(result.reports[1].dealId).toBe("deal-b");
    expect(result.reports[1].dealTitle).toBe("Deal B");
  });

  it("aggregates counts across multiple deliverables", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);

    const result = verifyBulkDeliverables([
      makeRow({ id: "d-1", status: "verified", dueDate: future.toISOString() }),
      makeRow({ id: "d-2", status: "verified", dueDate: future.toISOString() }),
      makeRow({ id: "d-3", status: "pending", dueDate: null }),
    ]);

    expect(result.totalChecked).toBe(3);
    expect(result.passed).toBe(2);
    expect(result.pending).toBe(1);
  });

  it("handles large number of deliverables", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);

    const rows = Array.from({ length: 100 }, (_, i) =>
      makeRow({ id: `d-${i}`, status: "verified", dueDate: future.toISOString() })
    );

    const result = verifyBulkDeliverables(rows);
    expect(result.totalChecked).toBe(100);
    expect(result.passed).toBe(100);
    expect(result.reports).toHaveLength(100);
  });

  it("handles deliverable with null verificationData", () => {
    const result = verifyBulkDeliverables([
      makeRow({ id: "d-1", verificationData: null }),
    ]);

    expect(result.totalChecked).toBe(1);
    expect(result.reports[0].checks.length).toBeGreaterThan(0);
  });

  it("handles deliverable with empty verificationData", () => {
    const result = verifyBulkDeliverables([
      makeRow({ id: "d-1", verificationData: {} }),
    ]);

    expect(result.totalChecked).toBe(1);
  });

  it("handles deliverable with extra fields in verificationData", () => {
    const result = verifyBulkDeliverables([
      makeRow({
        id: "d-1",
        title: "Ad Read",
        status: "in_progress",
        verificationData: { unknownField: "value", anotherField: 42 },
      }),
    ]);

    expect(result.totalChecked).toBe(1);
    expect(result.pending).toBe(1);
  });

  it("handles deliverable with all statuses represented", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);

    const result = verifyBulkDeliverables([
      makeRow({ id: "d-1", status: "verified", dueDate: future.toISOString() }),
      makeRow({
        id: "d-2",
        status: "in_progress",
        title: "Ad Read",
        verificationData: { adDurationSeconds: 10, requiredDurationSeconds: 30, sponsorMentioned: false },
        dueDate: future.toISOString(),
      }),
      makeRow({ id: "d-3", status: "pending" }),
      makeRow({ id: "d-4", status: "submitted", dueDate: future.toISOString() }),
    ]);

    expect(result.totalChecked).toBe(4);
    expect(result.passed).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBe(1);
    expect(result.pending).toBeGreaterThanOrEqual(1);
  });

  it("counts overdue correctly across mixed deadlines", () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    const future = new Date();
    future.setDate(future.getDate() + 10);

    const result = verifyBulkDeliverables([
      makeRow({ id: "d-1", status: "pending", dueDate: past.toISOString() }),
      makeRow({ id: "d-2", status: "pending", dueDate: future.toISOString() }),
      makeRow({ id: "d-3", status: "pending", dueDate: null }),
    ]);

    expect(result.overdueAlerts).toBe(1);
  });

  it("each report has a verifiedAt date", () => {
    const result = verifyBulkDeliverables([makeRow(), makeRow()]);

    for (const report of result.reports) {
      expect(report.verifiedAt).toBeInstanceOf(Date);
    }
  });

  it("each report has a non-empty summary", () => {
    const result = verifyBulkDeliverables([makeRow()]);

    expect(result.reports[0].summary).toBeTruthy();
    expect(typeof result.reports[0].summary).toBe("string");
  });
});
