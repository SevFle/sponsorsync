import { db } from "@/lib/db";
import { users, notificationPreferences, payments, deals } from "@/lib/db/schema";
import { eq, and, isNotNull, lt, sql } from "drizzle-orm";
import { differenceInDays, format } from "date-fns";
import { createNotification } from "@/lib/db/queries/notifications";
import { sendPaymentFollowUp } from "@/lib/email/templates";

export interface PaymentFollowUpSummary {
  usersProcessed: number;
  notificationsCreated: number;
  emailsSent: number;
  errors: string[];
}

export async function processPaymentFollowUps(): Promise<PaymentFollowUpSummary> {
  const summary: PaymentFollowUpSummary = {
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
      paymentReminders: notificationPreferences.paymentReminders,
    })
    .from(notificationPreferences)
    .innerJoin(users, eq(notificationPreferences.userId, users.id))
    .where(eq(notificationPreferences.paymentReminders, true));

  for (const user of usersWithPrefs) {
    try {
      const overduePayments = await db
        .select({
          id: payments.id,
          amount: payments.amount,
          currency: payments.currency,
          dueDate: payments.dueDate,
          status: payments.status,
          dealId: payments.dealId,
          dealTitle: deals.title,
        })
        .from(payments)
        .innerJoin(deals, eq(payments.dealId, deals.id))
        .where(
          and(
            eq(deals.userId, user.userId),
            isNotNull(payments.dueDate),
            sql`${payments.status} IN ('pending', 'overdue')`,
            sql`${payments.dueDate} < CURRENT_DATE`
          )
        );

      for (const payment of overduePayments) {
        const daysOverdue = differenceInDays(new Date(), new Date(payment.dueDate!));
        const formattedAmount = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: payment.currency ?? "USD",
        }).format(payment.amount / 100);

        await createNotification({
          userId: user.userId,
          type: "payment_follow_up",
          title: "Overdue Payment",
          message: `Payment of ${formattedAmount} for ${payment.dealTitle} was due ${format(new Date(payment.dueDate!), "MMM d, yyyy")} (${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue)`,
          relatedId: payment.dealId,
        });
        summary.notificationsCreated++;

        if (user.email) {
          try {
            await sendPaymentFollowUp(
              user.email,
              payment.dealTitle,
              formattedAmount,
              format(new Date(payment.dueDate!), "MMM d, yyyy")
            );
            summary.emailsSent++;
          } catch (emailError) {
            summary.errors.push(
              `Failed to send email to ${user.email}: ${emailError instanceof Error ? emailError.message : "Unknown error"}`
            );
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
