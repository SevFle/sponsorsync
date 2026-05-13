import { differenceInDays } from "date-fns";
import type {
  DeliverableType,
  VerificationStatus,
  VerificationContext,
  DeliverableVerificationReport,
  BulkVerificationResult,
} from "./types";
import { inferDeliverableType } from "./types";
import { getRulesForType } from "./rules";

export function computeDeadlineStatus(
  dueDate: string | null,
  completedDate: string | null,
  status: string
): "on_track" | "at_risk" | "overdue" | "completed" | "no_deadline" {
  if (status === "verified" || status === "submitted" || completedDate) {
    return "completed";
  }

  if (!dueDate) {
    return "no_deadline";
  }

  const now = new Date();
  const due = new Date(dueDate);
  const daysUntilDue = differenceInDays(due, now);

  if (daysUntilDue <= 0) return "overdue";
  if (daysUntilDue <= 3) return "at_risk";
  return "on_track";
}

function computeOverallStatus(checks: { status: VerificationStatus }[]): VerificationStatus {
  const applicable = checks.filter((c) => c.status !== "not_applicable");
  if (applicable.length === 0) return "pending";

  const passed = applicable.filter((c) => c.status === "pass").length;
  const failed = applicable.filter((c) => c.status === "fail").length;

  if (failed > 0) return "fail";
  if (passed === applicable.length) return "pass";
  return "pending";
}

function generateSummary(
  overallStatus: VerificationStatus,
  deadlineStatus: string,
  deliverableTitle: string
): string {
  const statusLabel =
    overallStatus === "pass"
      ? "All checks passed"
      : overallStatus === "fail"
        ? "Some checks failed"
        : "Verification pending";

  const deadlineLabel =
    deadlineStatus === "overdue"
      ? "OVERDUE"
      : deadlineStatus === "at_risk"
        ? "at risk"
        : deadlineStatus === "completed"
          ? "completed"
          : deadlineStatus === "no_deadline"
            ? "no deadline set"
            : "on track";

  return `${deliverableTitle}: ${statusLabel} — deadline: ${deadlineLabel}`;
}

export function verifyDeliverable(
  context: VerificationContext,
  dealId: string,
  dealTitle: string,
  deliverableType?: DeliverableType
): DeliverableVerificationReport {
  const resolvedType = deliverableType ?? inferDeliverableType(context.deliverableTitle);
  const rules = getRulesForType(resolvedType);
  const checks = rules.map((rule) => rule.check(context));
  const overallStatus = computeOverallStatus(checks);
  const deadlineStatus = computeDeadlineStatus(context.dueDate, context.completedDate, context.status);

  return {
    deliverableId: context.deliverableId,
    deliverableTitle: context.deliverableTitle,
    deliverableType: resolvedType,
    dealId,
    dealTitle,
    overallStatus,
    checks,
    dueDate: context.dueDate,
    deadlineStatus,
    verifiedAt: new Date(),
    summary: generateSummary(overallStatus, deadlineStatus, context.deliverableTitle),
  };
}

export interface DeliverableRow {
  id: string;
  dealId: string;
  dealTitle: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  completedDate: string | null;
  verificationData: Record<string, unknown> | null;
  notes: string | null;
}

export function verifyBulkDeliverables(rows: DeliverableRow[]): BulkVerificationResult {
  const result: BulkVerificationResult = {
    totalChecked: 0,
    passed: 0,
    failed: 0,
    pending: 0,
    overdueAlerts: 0,
    reports: [],
    errors: [],
  };

  for (const row of rows) {
    try {
      const context: VerificationContext = {
        deliverableId: row.id,
        deliverableTitle: row.title,
        verificationData: row.verificationData,
        dueDate: row.dueDate,
        completedDate: row.completedDate,
        status: row.status,
        notes: row.notes,
      };

      const report = verifyDeliverable(context, row.dealId, row.dealTitle);
      result.reports.push(report);
      result.totalChecked++;

      if (report.overallStatus === "pass") result.passed++;
      else if (report.overallStatus === "fail") result.failed++;
      else result.pending++;

      if (report.deadlineStatus === "overdue") result.overdueAlerts++;
    } catch (error) {
      result.errors.push(
        `Error verifying deliverable ${row.id}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return result;
}
