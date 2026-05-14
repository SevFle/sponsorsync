import React from "react";
import { render } from "react-email";
import { sendEmail } from "./client";
import {
  EmailLayout,
  EmailHeading,
  EmailParagraph,
  EmailDivider,
  FooterNote,
  StatusBadge,
  DetailRow,
} from "@/emails/layout";

function SimpleDeadlineReminder({
  dealTitle,
  dueDate,
}: {
  dealTitle: string;
  dueDate: string;
}) {
  return (
    <EmailLayout preview={`Deadline Reminder: ${dealTitle} due ${dueDate}`}>
      <EmailHeading>Deadline Reminder</EmailHeading>
      <EmailParagraph>
        Your sponsorship deal <strong>{dealTitle}</strong> has a deliverable due on{" "}
        <strong>{dueDate}</strong>.
      </EmailParagraph>
      <EmailParagraph>
        Log in to SponsorSync to view details and update your progress.
      </EmailParagraph>
      <FooterNote>
        This reminder was sent via SponsorSync. Manage your sponsorships at sponsorsync.app.
      </FooterNote>
    </EmailLayout>
  );
}

function SimpleOverdueReminder({
  dealTitle,
  deliverableTitle,
  dueDate,
}: {
  dealTitle: string;
  deliverableTitle: string;
  dueDate: string;
}) {
  return (
    <EmailLayout preview={`Overdue Deliverable: ${deliverableTitle}`}>
      <StatusBadge status="danger">Overdue</StatusBadge>
      <EmailHeading>Overdue Deliverable</EmailHeading>
      <EmailParagraph>
        The deliverable <strong>{deliverableTitle}</strong> for sponsorship deal{" "}
        <strong>{dealTitle}</strong> was due on <strong>{dueDate}</strong> and is now overdue.
      </EmailParagraph>
      <EmailParagraph>
        Please log in to SponsorSync to update the status and take action.
      </EmailParagraph>
      <FooterNote>
        This reminder was sent via SponsorSync. Manage your sponsorships at sponsorsync.app.
      </FooterNote>
    </EmailLayout>
  );
}

function SimplePaymentFollowUp({
  dealTitle,
  amount,
  dueDate,
}: {
  dealTitle: string;
  amount: string;
  dueDate: string;
}) {
  return (
    <EmailLayout preview={`Payment Follow-Up: ${amount} for ${dealTitle}`}>
      <StatusBadge status="warning">Payment Due</StatusBadge>
      <EmailHeading>Payment Follow-Up</EmailHeading>
      <EmailParagraph>
        A payment of <strong>{amount}</strong> for sponsorship deal{" "}
        <strong>{dealTitle}</strong> was due on <strong>{dueDate}</strong> and has not been
        received.
      </EmailParagraph>
      <EmailDivider />
      <DetailRow label="Amount" value={amount} />
      <DetailRow label="Deal" value={dealTitle} />
      <DetailRow label="Due Date" value={dueDate} />
      <EmailDivider />
      <EmailParagraph>
        Log in to SponsorSync to update the payment status or send a reminder to the sponsor.
      </EmailParagraph>
      <FooterNote>
        This notice was sent via SponsorSync. Manage your sponsorships at sponsorsync.app.
      </FooterNote>
    </EmailLayout>
  );
}

function SimpleSponsorCommunication({
  body,
}: {
  body: string;
}) {
  return (
    <EmailLayout preview="Sponsor Communication">
      <div dangerouslySetInnerHTML={{ __html: body }} />
    </EmailLayout>
  );
}

export async function sendDeadlineReminder(
  to: string,
  dealTitle: string,
  dueDate: string
) {
  return sendEmail({
    to,
    subject: `Deadline Reminder: ${dealTitle}`,
    react: React.createElement(SimpleDeadlineReminder, { dealTitle, dueDate }),
  });
}

export async function sendOverdueDeliverableReminder(
  to: string,
  dealTitle: string,
  deliverableTitle: string,
  dueDate: string
) {
  return sendEmail({
    to,
    subject: `Overdue Deliverable: ${deliverableTitle}`,
    react: React.createElement(SimpleOverdueReminder, {
      dealTitle,
      deliverableTitle,
      dueDate,
    }),
  });
}

export async function sendPaymentFollowUp(
  to: string,
  dealTitle: string,
  amount: string,
  dueDate: string
) {
  return sendEmail({
    to,
    subject: `Payment Follow-Up: ${amount} for ${dealTitle}`,
    react: React.createElement(SimplePaymentFollowUp, {
      dealTitle,
      amount,
      dueDate,
    }),
  });
}

export async function sendSponsorCommunication(
  to: string,
  subject: string,
  body: string
) {
  return sendEmail({
    to,
    subject,
    react: React.createElement(SimpleSponsorCommunication, { body }),
  });
}
