import { Inngest } from "inngest";
import { processDeadlineChecks } from "./deadline-checker";
import { processPaymentFollowUps } from "./payment-follower";

export const inngest: Inngest = new Inngest({
  id: "sponsorsync",
  name: "SponsorSync",
});

export const deadlineReminderFunction = inngest.createFunction(
  { id: "deadline-reminder", name: "Deadline Reminder" },
  { cron: "0 9 * * *" },
  async ({ step }) => {
    await step.run("check-upcoming-deadlines", async () => {
      return processDeadlineChecks();
    });
  }
);

export const deliverableVerificationFunction = inngest.createFunction(
  { id: "deliverable-verification", name: "Deliverable Verification" },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    await step.run("verify-deliverables", async () => {
      return processDeadlineChecks();
    });
  }
);

export const paymentFollowUpFunction = inngest.createFunction(
  { id: "payment-follow-up", name: "Payment Follow-Up" },
  { cron: "0 10 * * *" },
  async ({ step }) => {
    await step.run("check-overdue-payments", async () => {
      return processPaymentFollowUps();
    });
  }
);
