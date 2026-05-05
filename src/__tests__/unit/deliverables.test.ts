import { describe, it, expect } from "vitest";
import { checkDeliverableStatus, createDeliverableSchema } from "@/domain/deliverables";

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

  it("returns completed even when overdue but has completedDate", () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    expect(checkDeliverableStatus(past.toISOString(), "2024-12-01")).toBe("completed");
  });

  it("returns at_risk when exactly 3 days until due", () => {
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);
    expect(checkDeliverableStatus(in3Days.toISOString(), null)).toBe("at_risk");
  });

  it("returns at_risk when exactly 1 day until due", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(checkDeliverableStatus(tomorrow.toISOString(), null)).toBe("at_risk");
  });

  it("returns overdue when due date is today (0 days)", () => {
    const today = new Date();
    expect(checkDeliverableStatus(today.toISOString(), null)).toBe("overdue");
  });
});

describe("createDeliverableSchema", () => {
  it("validates valid input with required fields", () => {
    const result = createDeliverableSchema.safeParse({
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Newsletter Mention",
    });
    expect(result.success).toBe(true);
  });

  it("validates with all optional fields", () => {
    const result = createDeliverableSchema.safeParse({
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Podcast Ad",
      description: "A 60-second ad read",
      dueDate: "2025-06-15",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid dealId", () => {
    const result = createDeliverableSchema.safeParse({
      dealId: "not-a-uuid",
      title: "Task",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing dealId", () => {
    const result = createDeliverableSchema.safeParse({
      title: "Task",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing title", () => {
    const result = createDeliverableSchema.safeParse({
      dealId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = createDeliverableSchema.safeParse({
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title exceeding 255 characters", () => {
    const result = createDeliverableSchema.safeParse({
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      title: "a".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("accepts title at exactly 255 characters", () => {
    const result = createDeliverableSchema.safeParse({
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      title: "a".repeat(255),
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid date format for dueDate", () => {
    const result = createDeliverableSchema.safeParse({
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Task",
      dueDate: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});
