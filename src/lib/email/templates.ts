import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendDeadlineReminder(
  to: string,
  dealTitle: string,
  dueDate: string
) {
  return resend.emails.send({
    from: "SponsorSync <notifications@sponsorsync.app>",
    to,
    subject: `Deadline Reminder: ${dealTitle}`,
    html: `
      <h2>Deadline Reminder</h2>
      <p>Your sponsorship deal <strong>${dealTitle}</strong> has a deliverable due on <strong>${dueDate}</strong>.</p>
      <p>Log in to SponsorSync to view details and update your progress.</p>
    `,
  });
}

export async function sendSponsorCommunication(
  to: string,
  subject: string,
  body: string
) {
  return resend.emails.send({
    from: "SponsorSync <notifications@sponsorsync.app>",
    to,
    subject,
    html: body,
  });
}
