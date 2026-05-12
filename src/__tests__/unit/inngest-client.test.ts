import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/inngest/deadline-checker", () => ({
  processDeadlineChecks: vi.fn().mockResolvedValue({
    usersProcessed: 0,
    notificationsCreated: 0,
    emailsSent: 0,
    errors: [],
  }),
}));

vi.mock("@/lib/inngest/payment-follower", () => ({
  processPaymentFollowUps: vi.fn().mockResolvedValue({
    usersProcessed: 0,
    notificationsCreated: 0,
    emailsSent: 0,
    errors: [],
  }),
}));

import {
  inngest,
  deadlineReminderFunction,
  deliverableVerificationFunction,
  paymentFollowUpFunction,
} from "@/lib/inngest/client";
import { processDeadlineChecks } from "@/lib/inngest/deadline-checker";
import { processPaymentFollowUps } from "@/lib/inngest/payment-follower";

describe("inngest client", () => {
  it("creates inngest client with correct id", () => {
    expect(inngest).toBeDefined();
    expect((inngest as any).id).toBe("sponsorsync");
  });

  it("exports deadline reminder function", () => {
    expect(deadlineReminderFunction).toBeDefined();
  });

  it("exports deliverable verification function", () => {
    expect(deliverableVerificationFunction).toBeDefined();
  });

  it("exports payment follow-up function", () => {
    expect(paymentFollowUpFunction).toBeDefined();
  });
});

describe("deadlineReminderFunction", () => {
  it("has deadline-reminder as id", () => {
    expect((deadlineReminderFunction as any).id()).toBe("deadline-reminder");
  });

  it("has a name property", () => {
    expect((deadlineReminderFunction as any).name).toBe("Deadline Reminder");
  });

  it("has opts configured", () => {
    const opts = (deadlineReminderFunction as any).opts;
    expect(opts).toBeDefined();
  });

  it("step.run calls processDeadlineChecks", async () => {
    const mockResult = {
      usersProcessed: 5,
      notificationsCreated: 10,
      emailsSent: 8,
      errors: [],
    };
    (processDeadlineChecks as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

    const handler = (deadlineReminderFunction as any).fn;
    const stepRunMock = vi.fn((_name: string, fn: () => Promise<any>) => fn());
    await handler({ step: { run: stepRunMock }, event: {} });

    expect(stepRunMock).toHaveBeenCalledWith(
      "check-upcoming-deadlines",
      expect.any(Function)
    );
    expect(processDeadlineChecks).toHaveBeenCalled();
    const result = await stepRunMock.mock.results[0].value;
    expect(result).toEqual(mockResult);
  });
});

describe("deliverableVerificationFunction", () => {
  it("has deliverable-verification as id", () => {
    expect((deliverableVerificationFunction as any).id()).toBe("deliverable-verification");
  });

  it("has a name property", () => {
    expect((deliverableVerificationFunction as any).name).toBe("Deliverable Verification");
  });

  it("has opts configured", () => {
    const opts = (deliverableVerificationFunction as any).opts;
    expect(opts).toBeDefined();
  });

  it("step.run calls processDeadlineChecks", async () => {
    (processDeadlineChecks as ReturnType<typeof vi.fn>).mockResolvedValue({
      usersProcessed: 0,
      notificationsCreated: 0,
      emailsSent: 0,
      errors: [],
    });

    const handler = (deliverableVerificationFunction as any).fn;
    const stepRunMock = vi.fn((_name: string, fn: () => Promise<any>) => fn());
    await handler({ step: { run: stepRunMock }, event: {} });

    expect(stepRunMock).toHaveBeenCalledWith(
      "verify-deliverables",
      expect.any(Function)
    );
  });
});

describe("paymentFollowUpFunction", () => {
  it("has payment-follow-up as id", () => {
    expect((paymentFollowUpFunction as any).id()).toBe("payment-follow-up");
  });

  it("has a name property", () => {
    expect((paymentFollowUpFunction as any).name).toBe("Payment Follow-Up");
  });

  it("has opts configured", () => {
    const opts = (paymentFollowUpFunction as any).opts;
    expect(opts).toBeDefined();
  });

  it("step.run calls processPaymentFollowUps", async () => {
    const mockResult = {
      usersProcessed: 3,
      notificationsCreated: 5,
      emailsSent: 4,
      errors: [],
    };
    (processPaymentFollowUps as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

    const handler = (paymentFollowUpFunction as any).fn;
    const stepRunMock = vi.fn((_name: string, fn: () => Promise<any>) => fn());
    await handler({ step: { run: stepRunMock }, event: {} });

    expect(stepRunMock).toHaveBeenCalledWith(
      "check-overdue-payments",
      expect.any(Function)
    );
    expect(processPaymentFollowUps).toHaveBeenCalled();
    const result = await stepRunMock.mock.results[0].value;
    expect(result).toEqual(mockResult);
  });
});
