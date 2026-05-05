import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "sponsorsync",
  name: "SponsorSync",
});

export const deadlineReminderFunction = inngest.createFunction(
  { id: "deadline-reminder", name: "Deadline Reminder" },
  { cron: "0 9 * * *" },
  async ({ step }) => {
    await step.run("check-upcoming-deadlines", async () => {
      return { checked: true };
    });
  }
);

export const deliverableVerificationFunction = inngest.createFunction(
  { id: "deliverable-verification", name: "Deliverable Verification" },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    await step.run("verify-deliverables", async () => {
      return { verified: true };
    });
  }
);
