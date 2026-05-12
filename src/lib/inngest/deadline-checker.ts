import { db } from "@/lib/db";
import { users, notificationPreferences, deliverables, deals } from "@/lib/db/schema";
import { eq, and, isNotNull, not, sql } from "drizzle-orm";
import { differenceInDays } from "date-fns";
import { getUpcomingDeadlines, formatDeadlineDate } from "@/domain/deadlines";
import { createNotification } from "@/lib/db/queries/notifications";
import { sendDeadlineReminder, sendOverdueDeliverableReminder } from "@/lib/email/templates";

export interface DeadlineCheckSummary {
  usersProcessed: number;
  notificationsCreated: number;
  emailsSent: number;
  errors: string[];
}

export async function processDeadlineChecks(): Promise<DeadlineCheckSummary> {
  const summary: DeadlineCheckSummary = {
    usersProcessed: 0,
    notificationsCreated: 0,
    emailsSent: 0,
    errors: [],
  };

  const usersWithPrefs = await db
    .select({
      userId: notificationPreferences.userId,
      email: users.email,
      name: users.name,
      deadlineReminders: notificationPreferences.deadlineReminders,
      deliverableUpdates: notificationPreferences.deliverableUpdates,
      reminderDaysBefore: notificationPreferences.reminderDaysBefore,
    })
    .from(notificationPreferences)
    .innerJoin(users, eq(notificationPreferences.userId, users.id));

  for (const user of usersWithPrefs) {
    try {
      const userDeliverables = await db
        .select({
          id: deliverables.id,
          title: deliverables.title,
          dueDate: deliverables.dueDate,
          status: deliverables.status,
          dealId: deliverables.dealId,
          dealTitle: deals.title,
        })
        .from(deliverables)
        .innerJoin(deals, eq(deliverables.dealId, deals.id))
        .where(
          and(
            eq(deals.userId, user.userId),
            isNotNull(deliverables.dueDate),
            not(sql`${deliverables.status} IN ('verified', 'submitted')`)
          )
        );

      if (user.deadlineReminders) {
        const upcoming = getUpcomingDeadlines(userDeliverables, user.reminderDaysBefore);

        for (const alert of upcoming) {
          const isOverdue = alert.daysRemaining <= 0;
          const notificationType = isOverdue ? "overdue_deliverable" as const : "deadline_reminder" as const;
          const title = isOverdue ? "Overdue Deliverable" : "Upcoming Deadline";
          const message = isOverdue
            ? `${alert.deliverableTitle} for ${alert.dealTitle} was due ${formatDeadlineDate(alert.dueDate)}`
            : `${alert.deliverableTitle} for ${alert.dealTitle} is due in ${alert.daysRemaining} day${alert.daysRemaining !== 1 ? "s" : ""}`;

          await createNotification({
            userId: user.userId,
            type: notificationType,
            title,
            message,
            relatedId: alert.dealId,
          });
          summary.notificationsCreated++;

          if (user.email) {
            try {
              if (isOverdue) {
                await sendOverdueDeliverableReminder(
                  user.email,
                  alert.dealTitle,
                  alert.deliverableTitle,
                  formatDeadlineDate(alert.dueDate)
                );
              } else {
                await sendDeadlineReminder(
                  user.email,
                  alert.dealTitle,
                  formatDeadlineDate(alert.dueDate)
                );
              }
              summary.emailsSent++;
            } catch (emailError) {
              summary.errors.push(
                `Failed to send email to ${user.email}: ${emailError instanceof Error ? emailError.message : "Unknown error"}`
              );
            }
          }
        }
      }
      summary.usersProcessed++;
    } catch (error) {
      summary.errors.push(
        `Error processing user ${user.userId}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return summary;
}
