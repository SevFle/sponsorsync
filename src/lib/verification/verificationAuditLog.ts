import type { PlacementType } from "./timestampAnalyzer";
import type { VerificationAction } from "./verificationNotifier";

export interface VerificationAuditEntry {
  id: string;
  deliverableId: string;
  dealId: string | null;
  userId: string;
  episodeId: string | null;
  action: VerificationAction;
  confidence: number;
  placement: PlacementType | null;
  keywordMatchCount: number;
  keywordTotalCount: number;
  previousStatus: string | null;
  newStatus: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface BulkVerificationAuditSummary {
  totalEntries: number;
  autoCompleted: number;
  manualReview: number;
  failed: number;
  overdueAlerts: number;
  entries: VerificationAuditEntry[];
}

export function createAuditEntry(params: {
  deliverableId: string;
  dealId: string | null;
  userId: string;
  episodeId: string | null;
  action: VerificationAction;
  confidence: number;
  placement?: PlacementType | null;
  keywordMatchCount?: number;
  keywordTotalCount?: number;
  previousStatus?: string | null;
  newStatus?: string | null;
  metadata?: Record<string, unknown> | null;
}): VerificationAuditEntry {
  return {
    id: generateAuditId(),
    deliverableId: params.deliverableId,
    dealId: params.dealId,
    userId: params.userId,
    episodeId: params.episodeId ?? null,
    action: params.action,
    confidence: params.confidence,
    placement: params.placement ?? null,
    keywordMatchCount: params.keywordMatchCount ?? 0,
    keywordTotalCount: params.keywordTotalCount ?? 0,
    previousStatus: params.previousStatus ?? null,
    newStatus: params.newStatus ?? null,
    metadata: params.metadata ?? null,
    createdAt: new Date(),
  };
}

export function summarizeAuditEntries(entries: VerificationAuditEntry[]): BulkVerificationAuditSummary {
  return {
    totalEntries: entries.length,
    autoCompleted: entries.filter((e) => e.action === "auto_complete").length,
    manualReview: entries.filter((e) => e.action === "manual_review").length,
    failed: entries.filter((e) => e.action === "verification_failed").length,
    overdueAlerts: entries.filter((e) => e.action === "overdue_alert").length,
    entries,
  };
}

let auditCounter = 0;

function generateAuditId(): string {
  auditCounter++;
  const timestamp = Date.now().toString(36);
  const counter = auditCounter.toString(36).padStart(4, "0");
  const random = Math.random().toString(36).substring(2, 6);
  return `audit_${timestamp}_${counter}_${random}`;
}

export function resetAuditCounter(): void {
  auditCounter = 0;
}

export function formatAuditEntry(entry: VerificationAuditEntry): string {
  const parts = [
    `[${entry.createdAt.toISOString()}]`,
    entry.action.toUpperCase(),
    `deliverable=${entry.deliverableId}`,
    `confidence=${Math.round(entry.confidence * 100)}%`,
  ];
  if (entry.episodeId) {
    parts.push(`episode=${entry.episodeId}`);
  }
  if (entry.previousStatus && entry.newStatus) {
    parts.push(`status: ${entry.previousStatus}→${entry.newStatus}`);
  }
  return parts.join(" ");
}
