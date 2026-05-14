import React from "react";
import type { DealConfirmationProps } from "./types";
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

export interface DealConfirmationEmailProps extends DealConfirmationProps {}

export function DealConfirmationEmail({
  sponsorName,
  dealTitle,
  dealAmount,
  currency,
  startDate,
  endDate,
  deliverablesCount,
  creatorName,
  creatorShow,
  dashboardUrl,
}: DealConfirmationEmailProps) {
  const preview = `Your sponsorship deal "${dealTitle}" has been confirmed — ${dealAmount} ${currency}`;

  return (
    <EmailLayout preview={preview} creatorShow={creatorShow}>
      <StatusBadge status="success">Deal Confirmed</StatusBadge>

      <EmailHeading>{dealTitle}</EmailHeading>

      <EmailParagraph>
        Hi {sponsorName},
      </EmailParagraph>

      <EmailParagraph>
        Great news! Your sponsorship deal for <strong>{dealTitle}</strong> has been
        confirmed. Here are the details:
      </EmailParagraph>

      <EmailDivider />

      <DetailRow label="Deal Amount" value={`${dealAmount} ${currency}`} />
      <DetailRow label="Campaign Period" value={`${startDate} — ${endDate}`} />
      <DetailRow label="Total Deliverables" value={`${deliverablesCount} item${deliverablesCount !== 1 ? "s" : ""}`} />
      <DetailRow label="Show" value={creatorShow} />

      <EmailDivider />

      <EmailParagraph>
        We&apos;re excited to kick off this partnership! You&apos;ll receive updates as
        each deliverable is completed. If you have any questions about the campaign
        timeline or deliverable specifications, don&apos;t hesitate to reach out.
      </EmailParagraph>

      {dashboardUrl && (
        <EmailButton href={dashboardUrl}>
          View Deal Dashboard
        </EmailButton>
      )}

      <EmailParagraph>
        Best regards,
        <br />
        <strong>{creatorName}</strong>
        <br />
        {creatorShow}
      </EmailParagraph>

      <FooterNote>
        This deal confirmation was sent via SponsorSync. Track deliverables,
        payments, and communications all in one place at sponsorsync.app.
      </FooterNote>
    </EmailLayout>
  );
}
