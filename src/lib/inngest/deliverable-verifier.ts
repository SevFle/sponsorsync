import { db } from "@/lib/db";
import { deliverables, deals, users, notificationPreferences } from "@/lib/db/schema";
import { eq, and, isNotNull, not, sql } from "drizzle-orm";
import { verifyBulkDeliverables, type DeliverableRow } from "@/lib/deliverables/engine";
import type { BulkVerificationResult } from "@/lib/deliverables/types";
import { createNotification } from "@/lib/db/queries/notifications";
import { sendOverdueDeliverableReminder } from "@/lib/email/templates";

export interface VerificationRunSummary extends BulkVerificationResult {
  usersProcessed: number;
  notificationsSent: number;
  emailsSent: number;
}

export async function processDeliverableVerification(): Promise<VerificationRunSummary> {
  const summary: VerificationRunSummary = {
    usersProcessed: 0,
    notificationsSent: 0,
    emailsSent: 0,
    totalChecked: 0,
    passed: 0,
    failed: 0,
    pending: 0,
    overdueAlerts: 0,
    reports: [],
    errors: [],
  };

  const usersWithPrefs = await db
    .select({
      userId: notificationPreferences.userId,
      email: users.email,
      name: users.name,
      deliverableUpdates: notificationPreferences.deliverableUpdates,
    })
    .from(notificationPreferences)
    .innerJoin(users, eq(notificationPreferences.userId, users.id));

  for (const user of usersWithPrefs) {
    try {
      const rows = await db
        .select({
          id: deliverables.id,
          dealId: deliverables.dealId,
          dealTitle: deals.title,
          title: deliverables.title,
          description: deliverables.description,
          status: deliverables.status,
          dueDate: deliverables.dueDate,
          completedDate: deliverables.completedDate,
          verificationData: deliverables.verificationData,
          notes: deliverables.notes,
        })
        .from(deliverables)
        .innerJoin(deals, eq(deliverables.dealId, deals.id))
        .where(
          and(
            eq(deals.userId, user.userId),
            isNotNull(deliverables.dueDate),
            not(sql`${deliverables.status} IN ('verified', 'missed')`)
          )
        );

      if (rows.length === 0) {
        summary.usersProcessed++;
        continue;
      }

      const deliverableRows: DeliverableRow[] = rows.map((r) => ({
        ...r,
        description: r.description ?? null,
        dueDate: r.dueDate ?? null,
        completedDate: r.completedDate ?? null,
        verificationData: r.verificationData as Record<string, unknown> | null,
        notes: r.notes ?? null,
      }));

      const result = verifyBulkDeliverables(deliverableRows);

      summary.totalChecked += result.totalChecked;
      summary.passed += result.passed;
      summary.failed += result.failed;
      summary.pending += result.pending;
      summary.overdueAlerts += result.overdueAlerts;
      summary.reports.push(...result.reports);
      summary.errors.push(...result.errors);

      if (user.deliverableUpdates) {
        for (const report of result.reports) {
          if (report.deadlineStatus === "overdue") {
            await createNotification({
              userId: user.userId,
              type: "overdue_deliverable",
              title: "Verification: Overdue Deliverable",
              message: report.summary,
              relatedId: report.dealId,
            });
            summary.notificationsSent++;

            if (user.email) {
              try {
                await sendOverdueDeliverableReminder(
                  user.email,
                  report.dealTitle,
                  report.deliverableTitle,
                  report.dueDate ?? "unknown date"
                );
                summary.emailsSent++;
              } catch (emailError) {
                summary.errors.push(
                  `Failed to send email to ${user.email}: ${emailError instanceof Error ? emailError.message : "Unknown error"}`
                );
              }
            }
          }
        }
      }

      summary.usersProcessed++;
    } catch (error) {
      summary.errors.push(
        `Error processing user ${user.userId}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      summary.usersProcessed++;
    }
  }

  return summary;
}
