import { describe, it, expect, vi } from "vitest";
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

  it("step.run callback returns checked true", async () => {
    const handler = (deadlineReminderFunction as any).fn;
    const stepRunMock = vi.fn((_name: string, fn: () => Promise<any>) => fn());
    await handler({
      step: { run: stepRunMock },
      event: {},
    });
    expect(stepRunMock).toHaveBeenCalledWith(
      "check-upcoming-deadlines",
      expect.any(Function)
    );
    const cbResult = await stepRunMock.mock.results[0].value;
    expect(cbResult).toEqual({ checked: true });
  });

  it("step.run 'check-upcoming-deadlines' resolves correctly", async () => {
    const stepRunMock = vi.fn((_name: string, fn: () => Promise<any>) => fn());
    const handler = (deadlineReminderFunction as any).fn;
    await handler({ step: { run: stepRunMock }, event: {} });
    expect(stepRunMock).toHaveBeenCalledWith(
      "check-upcoming-deadlines",
      expect.any(Function)
    );
    const result = await stepRunMock.mock.calls[0][1]();
    expect(result).toEqual({ checked: true });
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

  it("step.run callback returns verified true", async () => {
    const handler = (deliverableVerificationFunction as any).fn;
    const stepRunMock = vi.fn((_name: string, fn: () => Promise<any>) => fn());
    await handler({
      step: { run: stepRunMock },
      event: {},
    });
    expect(stepRunMock).toHaveBeenCalledWith(
      "verify-deliverables",
      expect.any(Function)
    );
    const cbResult = await stepRunMock.mock.results[0].value;
    expect(cbResult).toEqual({ verified: true });
  });

  it("step.run 'verify-deliverables' resolves correctly", async () => {
    const stepRunMock = vi.fn((_name: string, fn: () => Promise<any>) => fn());
    const handler = (deliverableVerificationFunction as any).fn;
    await handler({ step: { run: stepRunMock }, event: {} });
    expect(stepRunMock).toHaveBeenCalledWith(
      "verify-deliverables",
      expect.any(Function)
    );
    const result = await stepRunMock.mock.calls[0][1]();
    expect(result).toEqual({ verified: true });
  });
});
