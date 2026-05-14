import React from "react";
import type { DeliverableReminderProps } from "./types";
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

export interface DeliverableReminderEmailProps extends DeliverableReminderProps {}

export function DeliverableReminderEmail({
  sponsorName,
  dealTitle,
  deliverableTitle,
  dueDate,
  daysRemaining,
  isOverdue,
  creatorName,
  creatorShow,
  dashboardUrl,
}: DeliverableReminderEmailProps) {
  const preview = isOverdue
    ? `OVERDUE: "${deliverableTitle}" for ${dealTitle} was due ${dueDate}`
    : `Reminder: "${deliverableTitle}" for ${dealTitle} is due in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`;

  return (
    <EmailLayout preview={preview} creatorShow={creatorShow}>
      <StatusBadge status={isOverdue ? "danger" : daysRemaining <= 3 ? "warning" : "info"}>
        {isOverdue ? "Overdue" : daysRemaining <= 3 ? "Due Soon" : "Upcoming"}
      </StatusBadge>

      <EmailHeading>{deliverableTitle}</EmailHeading>

      <EmailParagraph>
        Hi {sponsorName},
      </EmailParagraph>

      {isOverdue ? (
        <EmailParagraph>
          This is a reminder that the deliverable <strong>{deliverableTitle}</strong>{" "}
          for the sponsorship deal <strong>{dealTitle}</strong> was due on{" "}
          <strong>{dueDate}</strong> and is now overdue.
        </EmailParagraph>
      ) : (
        <EmailParagraph>
          This is a friendly reminder that the deliverable{" "}
          <strong>{deliverableTitle}</strong> for the sponsorship deal{" "}
          <strong>{dealTitle}</strong> is due in{" "}
          <strong>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""}</strong> ({dueDate}).
        </EmailParagraph>
      )}

      <EmailDivider />

      <DetailRow label="Deliverable" value={deliverableTitle} />
      <DetailRow label="Deal" value={dealTitle} />
      <DetailRow label="Due Date" value={dueDate} />
      <DetailRow
        label="Status"
        value={isOverdue ? `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? "s" : ""}` : `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining`}
      />

      <EmailDivider />

      {isOverdue ? (
        <EmailParagraph>
          Please let us know the updated timeline for this deliverable. We want to
          ensure the campaign stays on track and can discuss any adjustments needed.
        </EmailParagraph>
      ) : (
        <EmailParagraph>
          Please confirm that everything is on track for this deliverable. If you
          anticipate any delays, please reach out so we can plan accordingly.
        </EmailParagraph>
      )}

      {dashboardUrl && (
        <EmailButton href={dashboardUrl}>
          View Deliverable Details
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
        This reminder was sent via SponsorSync. Manage all your sponsorship
        deliverables and deadlines at sponsorsync.app.
      </FooterNote>
    </EmailLayout>
  );
}
