import React from "react";
import type { PaymentFollowupProps } from "./types";
import {
  EmailLayout,
  EmailHeading,
  EmailParagraph,
  EmailButton,
  EmailDivider,
  FooterNote,
  DetailRow,
  StatusBadge,
} from "./layout";

export interface PaymentFollowupEmailProps extends PaymentFollowupProps {}

const FOLLOWUP_TONES: Record<number, { badge: "info" | "warning" | "danger"; urgency: string }> = {
  1: { badge: "info", urgency: "Friendly Reminder" },
  2: { badge: "warning", urgency: "Follow-Up" },
  3: { badge: "danger", urgency: "Final Notice" },
};

export function PaymentFollowupEmail({
  sponsorName,
  dealTitle,
  amount,
  currency,
  dueDate,
  daysOverdue,
  invoiceUrl,
  creatorName,
  creatorShow,
  followupNumber,
}: PaymentFollowupEmailProps) {
  const tone = FOLLOWUP_TONES[followupNumber] ?? FOLLOWUP_TONES[3];
  const preview = `${tone.urgency}: Payment of ${amount} ${currency} for "${dealTitle}" ${daysOverdue > 0 ? `is ${daysOverdue} days overdue` : `was due ${dueDate}`}`;

  return (
    <EmailLayout preview={preview} creatorShow={creatorShow}>
      <StatusBadge status={tone.badge}>{tone.urgency}</StatusBadge>

      <EmailHeading>Payment for {dealTitle}</EmailHeading>

      <EmailParagraph>
        Hi {sponsorName},
      </EmailParagraph>

      {followupNumber === 1 && (
        <EmailParagraph>
          This is a friendly reminder that payment of{" "}
          <strong>{amount} {currency}</strong> for the sponsorship deal{" "}
          <strong>{dealTitle}</strong> was due on <strong>{dueDate}</strong>.
          {daysOverdue > 0 && ` The payment is now ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue.`}
        </EmailParagraph>
      )}

      {followupNumber === 2 && (
        <EmailParagraph>
          We&apos;re following up on the outstanding payment of{" "}
          <strong>{amount} {currency}</strong> for <strong>{dealTitle}</strong>.
          This payment was due on <strong>{dueDate}</strong> and is now{" "}
          <strong>{daysOverdue} day{daysOverdue !== 1 ? "s" : ""} overdue</strong>.
          We kindly request that this be processed at your earliest convenience.
        </EmailParagraph>
      )}

      {followupNumber >= 3 && (
        <EmailParagraph>
          This is our final notice regarding the outstanding payment of{" "}
          <strong>{amount} {currency}</strong> for <strong>{dealTitle}</strong>.
          This payment was due on <strong>{dueDate}</strong> and is now{" "}
          <strong>{daysOverdue} day{daysOverdue !== 1 ? "s" : ""} overdue</strong>.
          Please process this payment immediately or contact us to discuss.
        </EmailParagraph>
      )}

      <EmailDivider />

      <DetailRow label="Amount Due" value={`${amount} ${currency}`} />
      <DetailRow label="Deal" value={dealTitle} />
      <DetailRow label="Original Due Date" value={dueDate} />
      {daysOverdue > 0 && (
        <DetailRow label="Days Overdue" value={`${daysOverdue} day${daysOverdue !== 1 ? "s" : ""}`} />
      )}
      <DetailRow label="Notice" value={`${followupNumber} of 3`} />

      <EmailDivider />

      {invoiceUrl && (
        <EmailButton href={invoiceUrl}>
          View Invoice & Pay
        </EmailButton>
      )}

      <EmailParagraph>
        If you&apos;ve already processed this payment, please disregard this notice
        and let us know so we can update our records. If you have any questions
        about the invoice, please don&apos;t hesitate to reach out.
      </EmailParagraph>

      <EmailParagraph>
        Best regards,
        <br />
        <strong>{creatorName}</strong>
        <br />
        {creatorShow}
      </EmailParagraph>

      <FooterNote>
        This payment notice was sent via SponsorSync. Manage all your sponsorship
        finances and invoices at sponsorsync.app.
      </FooterNote>
    </EmailLayout>
  );
}
