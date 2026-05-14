import React from "react";
import type { SponsorOutreachProps } from "./types";
import {
  EmailLayout,
  EmailHeading,
  EmailParagraph,
  EmailButton,
  EmailDivider,
  FooterNote,
  DetailRow,
} from "./layout";

export interface SponsorOutreachEmailProps extends SponsorOutreachProps {}

export function SponsorOutreachEmail({
  sponsorName,
  sponsorCompany,
  creatorName,
  creatorShow,
  proposalSummary,
  dealAmount,
  proposalUrl,
}: SponsorOutreachEmailProps) {
  const preview = `${creatorName} from ${creatorShow} would love to partner with ${sponsorCompany ?? sponsorName}`;

  return (
    <EmailLayout preview={preview} creatorShow={creatorShow}>
      <EmailHeading>Sponsorship Opportunity</EmailHeading>

      <EmailParagraph>
        Hi {sponsorName},
      </EmailParagraph>

      <EmailParagraph>
        {creatorName} here from <strong>{creatorShow}</strong>. We&apos;re reaching out
        because we believe there&apos;s a great fit for a sponsorship partnership between
        our show and {sponsorCompany ?? sponsorName}.
      </EmailParagraph>

      <EmailDivider />

      <EmailParagraph style={{ fontWeight: 600, marginBottom: 8 }}>
        Partnership Overview
      </EmailParagraph>
      <EmailParagraph>{proposalSummary}</EmailParagraph>

      {dealAmount && (
        <>
          <EmailDivider />
          <DetailRow label="Proposed Investment" value={dealAmount} />
        </>
      )}

      {proposalUrl && (
        <EmailButton href={proposalUrl}>
          View Full Proposal
        </EmailButton>
      )}

      <EmailDivider />

      <EmailParagraph>
        We&apos;d love to discuss this opportunity further. Please reply to this email
        or use the link above to review our full media kit and proposal details.
      </EmailParagraph>

      <EmailParagraph>
        Looking forward to hearing from you!
      </EmailParagraph>

      <EmailParagraph>
        Best regards,
        <br />
        <strong>{creatorName}</strong>
        <br />
        {creatorShow}
      </EmailParagraph>

      <FooterNote>
        This sponsorship outreach was sent via SponsorSync. You can manage all your
        sponsor communications in one place at sponsorsync.app.
      </FooterNote>
    </EmailLayout>
  );
}
