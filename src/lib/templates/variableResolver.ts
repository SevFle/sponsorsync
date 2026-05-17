import { db } from "@/lib/db";
import { sponsors, deals, deliverables, users, payments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export interface VariableContext {
  sponsorId?: string;
  dealId?: string;
  deliverableId?: string;
  paymentId?: string;
  userId: string;
}

export interface ResolvedVariables {
  variables: Record<string, string>;
  missing: string[];
}

export async function resolveVariables(
  context: VariableContext
): Promise<ResolvedVariables> {
  const variables: Record<string, string> = {};
  const missing: string[] = [];

  const [user] = await db.select().from(users).where(eq(users.id, context.userId)).limit(1);
  if (user) {
    variables.creator_name = user.name ?? "";
    variables.creator_show = "";
  } else {
    missing.push("creator_name", "creator_show");
  }

  if (context.sponsorId) {
    const [sponsor] = await db
      .select()
      .from(sponsors)
      .where(and(eq(sponsors.id, context.sponsorId), eq(sponsors.userId, context.userId)))
      .limit(1);
    if (sponsor) {
      variables.sponsor_name = sponsor.name;
      variables.sponsor_company = sponsor.company ?? "";
      variables.sponsor_email = sponsor.email ?? "";
    } else {
      missing.push("sponsor_name");
    }
  }

  if (context.dealId) {
    const [deal] = await db
      .select()
      .from(deals)
      .where(and(eq(deals.id, context.dealId), eq(deals.userId, context.userId)))
      .limit(1);
    if (deal) {
      variables.deal_title = deal.title;
      variables.deal_amount = deal.totalValue != null ? `$${deal.totalValue / 100}` : "";
      variables.deal_start_date = deal.startDate ?? "";
      variables.deal_end_date = deal.endDate ?? "";
    } else {
      missing.push("deal_title");
    }
  }

  if (context.deliverableId) {
    const [deliverable] = await db
      .select()
      .from(deliverables)
      .where(eq(deliverables.id, context.deliverableId))
      .limit(1);
    if (deliverable) {
      variables.deliverable_title = deliverable.title;
      variables.deliverable_description = deliverable.description ?? "";
      variables.due_date = deliverable.dueDate ?? "";
    } else {
      missing.push("deliverable_title");
    }
  }

  if (context.paymentId) {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, context.paymentId))
      .limit(1);
    if (payment) {
      variables.invoice_amount = payment.amount != null ? `$${payment.amount / 100}` : "";
      variables.invoice_number = `INV-${payment.id.slice(0, 8).toUpperCase()}`;
      variables.payment_due_date = payment.dueDate ?? "";
    } else {
      missing.push("invoice_amount", "invoice_number", "payment_due_date");
    }
  }

  return { variables, missing };
}

export function resolveVariablesWithDefaults(
  templateVariables: Record<string, string>,
  overrides: Record<string, string>
): Record<string, string> {
  return { ...templateVariables, ...overrides };
}
