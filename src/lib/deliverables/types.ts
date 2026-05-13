export type DeliverableType = "ad_read" | "link_placement" | "social_mention";

export type VerificationStatus = "pass" | "fail" | "pending" | "not_applicable";

export interface VerificationCheck {
  id: string;
  name: string;
  description: string;
  status: VerificationStatus;
  evidence: string | null;
  checkedAt: Date;
}

export interface DeliverableVerificationReport {
  deliverableId: string;
  deliverableTitle: string;
  deliverableType: DeliverableType;
  dealId: string;
  dealTitle: string;
  overallStatus: VerificationStatus;
  checks: VerificationCheck[];
  dueDate: string | null;
  deadlineStatus: "on_track" | "at_risk" | "overdue" | "completed" | "no_deadline";
  verifiedAt: Date;
  summary: string;
}

export interface VerificationRule {
  id: string;
  name: string;
  description: string;
  deliverableType: DeliverableType;
  check: (context: VerificationContext) => VerificationCheck;
}

export interface VerificationContext {
  deliverableId: string;
  deliverableTitle: string;
  verificationData: Record<string, unknown> | null;
  dueDate: string | null;
  completedDate: string | null;
  status: string;
  notes: string | null;
}

export interface BulkVerificationResult {
  totalChecked: number;
  passed: number;
  failed: number;
  pending: number;
  overdueAlerts: number;
  reports: DeliverableVerificationReport[];
  errors: string[];
}

export function inferDeliverableType(title: string, description?: string | null): DeliverableType {
  const text = `${title} ${description ?? ""}`.toLowerCase();

  if (
    text.includes("ad read") ||
    text.includes("ad-read") ||
    text.includes("mid-roll") ||
    text.includes("preroll") ||
    text.includes("pre-roll") ||
    text.includes("podcast ad") ||
    text.includes("ad spot")
  ) {
    return "ad_read";
  }

  if (
    text.includes("social") ||
    text.includes("tweet") ||
    text.includes("instagram") ||
    text.includes("twitter") ||
    text.includes("linkedin") ||
    text.includes("hashtag") ||
    text.includes("social mention")
  ) {
    return "social_mention";
  }

  if (
    text.includes("link") ||
    text.includes("url") ||
    text.includes("backlink") ||
    text.includes("referral link") ||
    text.includes("affiliate link")
  ) {
    return "link_placement";
  }

  if (text.includes("mention") || text.includes("post")) {
    return "social_mention";
  }

  return "ad_read";
}
