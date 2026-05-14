import { db } from "@/lib/db";
import { users, notificationPreferences, deliverables, deals, sponsors } from "@/lib/db/schema";
import { eq, and, isNotNull, not, sql } from "drizzle-orm";
import { format, differenceInDays } from "date-fns";
import {
  getTieredDeadlineAlerts,
  formatDeadlineDate,
  buildNotificationKey,
} from "@/domain/deadlines";
import {
  createNotification,
  notificationKeyExists,
} from "@/lib/db/queries/notifications";
import { sendTemplatedEmail } from "@/lib/email/client";

export interface DeadlineCheckSummary {
  usersProcessed: number;
  notificationsCreated: number;
  notificationsSkipped: number;
  emailsSent: number;
  errors: string[];
}

interface UserWithPrefs {
  userId: string;
  email: string | null;
  name: string | null;
  deadlineReminders: boolean;
  deliverableUpdates: boolean;
  reminderDaysBefore: number;
  reminderSchedule: number[] | null;
}

interface DeliverableRow {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  dealId: string;
  dealTitle: string;
}

export async function processDeadlineChecks(): Promise<DeadlineCheckSummary> {
  const summary: DeadlineCheckSummary = {
    usersProcessed: 0,
    notificationsCreated: 0,
    notificationsSkipped: 0,
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
      reminderSchedule: notificationPreferences.reminderSchedule,
    })
    .from(notificationPreferences)
    .innerJoin(users, eq(notificationPreferences.userId, users.id));

  for (const user of usersWithPrefs) {
    try {
      const userDeliverables = await fetchUserDeliverables(user.userId);
      const alerts = getTieredDeadlineAlerts(
        userDeliverables,
        user.reminderSchedule
      );

      if (alerts.length === 0) {
        summary.usersProcessed++;
        continue;
      }

      if (user.deadlineReminders) {
        for (const alert of alerts) {
          await processAlert(alert, user, summary);
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

async function fetchUserDeliverables(userId: string): Promise<DeliverableRow[]> {
  return db
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
        eq(deals.userId, userId),
        isNotNull(deliverables.dueDate),
        not(sql`${deliverables.status} IN ('verified', 'submitted')`)
      )
    );
}

async function processAlert(
  alert: ReturnType<typeof getTieredDeadlineAlerts>[0],
  user: UserWithPrefs,
  summary: DeadlineCheckSummary
): Promise<void> {
  const notificationType = alert.isOverdue
    ? "overdue_deliverable" as const
    : "deadline_reminder" as const;
  const notifKey = buildNotificationKey(
    alert.deliverableId,
    notificationType,
    alert.isOverdue ? undefined : alert.matchedTier
  );

  const alreadySent = await notificationKeyExists(notifKey);
  if (alreadySent) {
    summary.notificationsSkipped++;
    return;
  }

  const title = alert.isOverdue
    ? "Overdue Deliverable"
    : `Deadline in ${alert.daysRemaining} day${alert.daysRemaining !== 1 ? "s" : ""}`;
  const message = alert.isOverdue
    ? `${alert.deliverableTitle} for ${alert.dealTitle} was due ${formatDeadlineDate(alert.dueDate)}`
    : `${alert.deliverableTitle} for ${alert.dealTitle} is due in ${alert.daysRemaining} day${alert.daysRemaining !== 1 ? "s" : ""} (${formatDeadlineDate(alert.dueDate)})`;

  await createNotification({
    userId: user.userId,
    type: notificationType,
    title,
    message,
    relatedId: alert.dealId,
    notificationKey: notifKey,
  });
  summary.notificationsCreated++;

  if (user.email) {
    try {
      const sponsorInfo = await fetchSponsorForDeal(alert.dealId);

      await sendTemplatedEmail(
        "deliverable-reminder",
        {
          sponsorName: sponsorInfo?.name ?? "Sponsor",
          dealTitle: alert.dealTitle,
          deliverableTitle: alert.deliverableTitle,
          dueDate: formatDeadlineDate(alert.dueDate),
          daysRemaining: alert.daysRemaining,
          isOverdue: alert.isOverdue,
          creatorName: user.name ?? "Creator",
          creatorShow: user.name ?? "SponsorSync",
          dashboardUrl: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/dashboard/deliverables`,
        },
        { to: user.email }
      );
      summary.emailsSent++;
    } catch (emailError) {
      summary.errors.push(
        `Failed to send email to ${user.email}: ${emailError instanceof Error ? emailError.message : "Unknown error"}`
      );
    }
  }
}

async function fetchSponsorForDeal(dealId: string): Promise<{ name: string } | null> {
  const rows = await db
    .select({ name: sponsors.name })
    .from(deals)
    .innerJoin(sponsors, eq(deals.sponsorId, sponsors.id))
    .where(eq(deals.id, dealId))
    .limit(1);
  return rows[0] ?? null;
}
