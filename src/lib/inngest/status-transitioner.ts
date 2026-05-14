import { db } from "@/lib/db";
import { deliverables, deals } from "@/lib/db/schema";
import { eq, and, lt, sql, isNotNull, not } from "drizzle-orm";
import { createNotification } from "@/lib/db/queries/notifications";

export interface StatusTransitionSummary {
  deliverablesChecked: number;
  overdueMarked: number;
  dealStatusUpdates: number;
  notificationsCreated: number;
  errors: string[];
}

export async function processStatusTransitions(): Promise<StatusTransitionSummary> {
  const summary: StatusTransitionSummary = {
    deliverablesChecked: 0,
    overdueMarked: 0,
    dealStatusUpdates: 0,
    notificationsCreated: 0,
    errors: [],
  };

  const overdueDeliverables = await db
    .select({
      id: deliverables.id,
      dealId: deliverables.dealId,
      title: deliverables.title,
      status: deliverables.status,
      dueDate: deliverables.dueDate,
      dealTitle: deals.title,
      dealUserId: deals.userId,
      dealStatus: deals.status,
    })
    .from(deliverables)
    .innerJoin(deals, eq(deliverables.dealId, deals.id))
    .where(
      and(
        isNotNull(deliverables.dueDate),
        sql`${deliverables.dueDate} < CURRENT_DATE`,
        not(sql`${deliverables.status} IN ('verified', 'submitted', 'missed')`)
      )
    );

  summary.deliverablesChecked = overdueDeliverables.length;

  for (const del of overdueDeliverables) {
    try {
      if (del.status === "pending" || del.status === "in_progress") {
        await db
          .update(deliverables)
          .set({ status: "missed", updatedAt: new Date() })
          .where(eq(deliverables.id, del.id));
        summary.overdueMarked++;
      }

      const incompleteCount = await getIncompleteDeliverableCount(del.dealId);

      if (incompleteCount > 0 && del.dealStatus === "active") {
        const allPastDue = await allDeliverablesPastDue(del.dealId);
        if (allPastDue) {
          await db
            .update(deals)
            .set({ status: "completed", updatedAt: new Date() })
            .where(eq(deals.id, del.dealId));
          summary.dealStatusUpdates++;
        }
      }

      await createNotification({
        userId: del.dealUserId,
        type: "overdue_deliverable",
        title: "Deliverable Marked Overdue",
        message: `"${del.title}" for deal "${del.dealTitle}" has been automatically marked as missed because it passed its due date.`,
        relatedId: del.dealId,
      });
      summary.notificationsCreated++;
    } catch (error) {
      summary.errors.push(
        `Error transitioning deliverable ${del.id}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return summary;
}

async function getIncompleteDeliverableCount(dealId: string): Promise<number> {
  const results = await db
    .select({ id: deliverables.id })
    .from(deliverables)
    .where(
      and(
        eq(deliverables.dealId, dealId),
        not(sql`${deliverables.status} IN ('verified', 'submitted')`)
      )
    );
  return results.length;
}

async function allDeliverablesPastDue(dealId: string): Promise<boolean> {
  const allDeliverables = await db
    .select({
      status: deliverables.status,
      dueDate: deliverables.dueDate,
    })
    .from(deliverables)
    .where(eq(deliverables.dealId, dealId));

  if (allDeliverables.length === 0) return false;

  return allDeliverables.every(
    (d) =>
      d.status === "verified" ||
      d.status === "submitted" ||
      d.status === "missed" ||
      (d.dueDate !== null && new Date(d.dueDate) < new Date())
  );
}
