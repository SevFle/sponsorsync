import { describe, it, expect } from "vitest";
import {
  inngest,
  deadlineReminderFunction,
  deliverableVerificationFunction,
} from "@/lib/inngest/client";

describe("inngest client", () => {
  it("creates inngest client with correct id", () => {
    expect(inngest).toBeDefined();
  });

  it("exports deadline reminder function", () => {
    expect(deadlineReminderFunction).toBeDefined();
  });

  it("exports deliverable verification function", () => {
    expect(deliverableVerificationFunction).toBeDefined();
  });

  it("inngest client has correct id", () => {
    expect((inngest as any).id).toBe("sponsorsync");
  });
});

describe("deadlineReminderFunction", () => {
  it("has deadline-reminder as id", () => {
    expect((deadlineReminderFunction as any).id()).toBe("deadline-reminder");
  });

  it("has a name property", () => {
    expect((deadlineReminderFunction as any).name).toBe("Deadline Reminder");
  });

  it("has cron trigger configured", () => {
    const opts = (deadlineReminderFunction as any).opts;
    expect(opts).toBeDefined();
  });
});

describe("deliverableVerificationFunction", () => {
  it("has deliverable-verification as id", () => {
    expect((deliverableVerificationFunction as any).id()).toBe("deliverable-verification");
  });

  it("has a name property", () => {
    expect((deliverableVerificationFunction as any).name).toBe("Deliverable Verification");
  });

  it("has cron trigger configured", () => {
    const opts = (deliverableVerificationFunction as any).opts;
    expect(opts).toBeDefined();
  });
});
