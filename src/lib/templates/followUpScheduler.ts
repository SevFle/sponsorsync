import { db } from "@/lib/db";
import { deals, sponsors, deliverables, payments, users, templates } from "@/lib/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { format, differenceInDays, addDays } from "date-fns";
import { sendTemplateEmail, checkRateLimit } from "@/lib/email/emailService";
import { interpolateTemplate, extractVariablesFromTemplate } from "@/lib/templates/templateEngine";
import { resolveVariables, type VariableContext } from "@/lib/templates/variableResolver";
import { getDefaultTemplateByCategory } from "@/lib/templates/templateDefaults";

export type FollowUpTrigger =
  | "deliverable_due_soon"
  | "deliverable_overdue"
  | "deliverable_completed"
  | "payment_due_soon"
  | "payment_overdue"
  | "deal_expiring_soon"
  | "deal_renewal_opportunity";

export interface FollowUpRule {
  trigger: FollowUpTrigger;
  templateCategory: string;
  daysOffset: number;
  description: string;
}

export const FOLLOW_UP_RULES: FollowUpRule[] = [
  {
    trigger: "deliverable_due_soon",
    templateCategory: "deliverable",
    daysOffset: -3,
    description: "Reminder 3 days before deliverable due date",
  },
  {
    trigger: "deliverable_overdue",
    templateCategory: "deliverable",
    daysOffset: 1,
    description: "Alert 1 day after deliverable was due",
  },
  {
    trigger: "deliverable_completed",
    templateCategory: "deliverable",
    daysOffset: 0,
    description: "Notification when deliverable is completed",
  },
  {
    trigger: "payment_due_soon",
    templateCategory: "payment",
    daysOffset: -3,
    description: "Reminder 3 days before payment due date",
  },
  {
    trigger: "payment_overdue",
    templateCategory: "payment",
    daysOffset: 1,
    description: "Alert 1 day after payment was due",
  },
  {
    trigger: "deal_expiring_soon",
    templateCategory: "renewal",
    daysOffset: -14,
    description: "Renewal notice 14 days before deal end date",
  },
  {
    trigger: "deal_renewal_opportunity",
    templateCategory: "renewal",
    daysOffset: -7,
    description: "Renewal opportunity 7 days before deal end date",
  },
];

export interface FollowUpEntry {
  trigger: FollowUpTrigger;
  sponsorId: string;
  sponsorEmail: string | null;
  sponsorName: string;
  dealId: string;
  dealTitle: string;
  deliverableId?: string;
  paymentId?: string;
  userId: string;
}

export interface FollowUpSummary {
  processed: number;
  sent: number;
  skipped: number;
  errors: string[];
}

export async function findPendingFollowUps(): Promise<FollowUpEntry[]> {
  const entries: FollowUpEntry[] = [];
  const now = new Date();

  const upcomingDeliverables = await db
    .select({
      deliverableId: deliverables.id,
      deliverableTitle: deliverables.title,
      dueDate: deliverables.dueDate,
      dealId: deals.id,
      dealTitle: deals.title,
      sponsorId: deals.sponsorId,
      sponsorName: sponsors.name,
      sponsorEmail: sponsors.email,
      userId: deals.userId,
    })
    .from(deliverables)
    .innerJoin(deals, eq(deliverables.dealId, deals.id))
    .innerJoin(sponsors, eq(deals.sponsorId, sponsors.id))
    .where(
      and(
        isNotNull(deliverables.dueDate),
        sql`${deliverables.status} NOT IN ('verified', 'submitted')`
      )
    );

  for (const d of upcomingDeliverables) {
    if (!d.dueDate) continue;
    const dueDate = new Date(d.dueDate);
    const diff = differenceInDays(dueDate, now);

    if (diff === 3) {
      entries.push({
        trigger: "deliverable_due_soon",
        sponsorId: d.sponsorId,
        sponsorEmail: d.sponsorEmail,
        sponsorName: d.sponsorName,
        dealId: d.dealId,
        dealTitle: d.dealTitle,
        deliverableId: d.deliverableId,
        userId: d.userId,
      });
    } else if (diff === -1) {
      entries.push({
        trigger: "deliverable_overdue",
        sponsorId: d.sponsorId,
        sponsorEmail: d.sponsorEmail,
        sponsorName: d.sponsorName,
        dealId: d.dealId,
        dealTitle: d.dealTitle,
        deliverableId: d.deliverableId,
        userId: d.userId,
      });
    }
  }

  const overduePayments = await db
    .select({
      paymentId: payments.id,
      amount: payments.amount,
      currency: payments.currency,
      dueDate: payments.dueDate,
      dealId: deals.id,
      dealTitle: deals.title,
      sponsorId: deals.sponsorId,
      sponsorName: sponsors.name,
      sponsorEmail: sponsors.email,
      userId: deals.userId,
    })
    .from(payments)
    .innerJoin(deals, eq(payments.dealId, deals.id))
    .innerJoin(sponsors, eq(deals.sponsorId, sponsors.id))
    .where(
      and(
        isNotNull(payments.dueDate),
        sql`${payments.status} IN ('pending', 'overdue')`
      )
    );

  for (const p of overduePayments) {
    if (!p.dueDate) continue;
    const dueDate = new Date(p.dueDate);
    const diff = differenceInDays(dueDate, now);

    if (diff === 3) {
      entries.push({
        trigger: "payment_due_soon",
        sponsorId: p.sponsorId,
        sponsorEmail: p.sponsorEmail,
        sponsorName: p.sponsorName,
        dealId: p.dealId,
        dealTitle: p.dealTitle,
        paymentId: p.paymentId,
        userId: p.userId,
      });
    } else if (diff === -1) {
      entries.push({
        trigger: "payment_overdue",
        sponsorId: p.sponsorId,
        sponsorEmail: p.sponsorEmail,
        sponsorName: p.sponsorName,
        dealId: p.dealId,
        dealTitle: p.dealTitle,
        paymentId: p.paymentId,
        userId: p.userId,
      });
    }
  }

  const expiringDeals = await db
    .select({
      dealId: deals.id,
      dealTitle: deals.title,
      endDate: deals.endDate,
      sponsorId: deals.sponsorId,
      sponsorName: sponsors.name,
      sponsorEmail: sponsors.email,
      userId: deals.userId,
    })
    .from(deals)
    .innerJoin(sponsors, eq(deals.sponsorId, sponsors.id))
    .where(
      and(
        isNotNull(deals.endDate),
        sql`${deals.status} = 'active'`
      )
    );

  for (const d of expiringDeals) {
    if (!d.endDate) continue;
    const endDate = new Date(d.endDate);
    const diff = differenceInDays(endDate, now);

    if (diff === 14) {
      entries.push({
        trigger: "deal_expiring_soon",
        sponsorId: d.sponsorId,
        sponsorEmail: d.sponsorEmail,
        sponsorName: d.sponsorName,
        dealId: d.dealId,
        dealTitle: d.dealTitle,
        userId: d.userId,
      });
    } else if (diff === 7) {
      entries.push({
        trigger: "deal_renewal_opportunity",
        sponsorId: d.sponsorId,
        sponsorEmail: d.sponsorEmail,
        sponsorName: d.sponsorName,
        dealId: d.dealId,
        dealTitle: d.dealTitle,
        userId: d.userId,
      });
    }
  }

  return entries;
}

async function findUserTemplateByCategory(
  userId: string,
  category: string
): Promise<{ subject: string | null; body: string } | null> {
  const [tmpl] = await db
    .select({ subject: templates.subject, body: templates.body })
    .from(templates)
    .where(and(eq(templates.userId, userId), eq(templates.category, category)))
    .limit(1);

  if (tmpl) return tmpl;

  const defaultTmpl = getDefaultTemplateByCategory(category);
  if (defaultTmpl) return { subject: defaultTmpl.subject, body: defaultTmpl.body };

  return null;
}

export async function sendFollowUp(entry: FollowUpEntry): Promise<void> {
  const rule = FOLLOW_UP_RULES.find((r) => r.trigger === entry.trigger);
  if (!rule) throw new Error(`No rule found for trigger: ${entry.trigger}`);

  if (!entry.sponsorEmail) {
    throw new Error(`No email address for sponsor: ${entry.sponsorName}`);
  }

  const rateLimit = checkRateLimit(entry.userId);
  if (!rateLimit.allowed) {
    throw new Error("Rate limit exceeded for follow-up emails");
  }

  const tmpl = await findUserTemplateByCategory(entry.userId, rule.templateCategory);
  if (!tmpl) throw new Error(`No template found for category: ${rule.templateCategory}`);

  const context: VariableContext = {
    userId: entry.userId,
    sponsorId: entry.sponsorId,
    dealId: entry.dealId,
    deliverableId: entry.deliverableId,
  };

  const resolved = await resolveVariables(context);
  const allVars = { ...resolved.variables };

  const requiredVars = extractVariablesFromTemplate(tmpl.subject, tmpl.body);
  for (const key of requiredVars) {
    if (!allVars[key]) {
      allVars[key] = `[${key}]`;
    }
  }

  await sendTemplateEmail({
    subject: tmpl.subject ?? "",
    body: tmpl.body,
    to: entry.sponsorEmail,
    variables: allVars,
  });
}

export async function processFollowUps(): Promise<FollowUpSummary> {
  const summary: FollowUpSummary = { processed: 0, sent: 0, skipped: 0, errors: [] };

  const pending = await findPendingFollowUps();

  for (const entry of pending) {
    try {
      summary.processed++;

      if (!entry.sponsorEmail) {
        summary.skipped++;
        continue;
      }

      await sendFollowUp(entry);
      summary.sent++;
    } catch (error) {
      summary.errors.push(
        `Follow-up ${entry.trigger} for deal ${entry.dealId}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return summary;
}
