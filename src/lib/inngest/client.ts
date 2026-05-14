import { Inngest } from "inngest";
import { processDeadlineChecks } from "./deadline-checker";
import { processPaymentFollowUps } from "./payment-follower";
import { processDeliverableVerification } from "./deliverable-verifier";
import { processStatusTransitions } from "./status-transitioner";
import { processFollowUps } from "@/lib/templates/followUpScheduler";

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
      return processDeliverableVerification();
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

export const statusTransitionFunction = inngest.createFunction(
  { id: "status-transitioner", name: "Status Transitioner" },
  { cron: "0 11 * * *" },
  async ({ step }) => {
    await step.run("transition-overdue-statuses", async () => {
      return processStatusTransitions();
    });
  }
);

export const templateFollowUpFunction = inngest.createFunction(
  { id: "template-follow-ups", name: "Template Follow-Up Scheduler" },
  { cron: "0 8 * * *" },
  async ({ step }) => {
    await step.run("process-follow-ups", async () => {
      return processFollowUps();
    });
  }
);
