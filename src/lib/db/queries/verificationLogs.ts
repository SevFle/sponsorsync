import { db } from "..";
import { verificationLogs } from "../schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import type { VerificationAction } from "@/lib/verification";
import { deliverableStatusEnum } from "../schema";

type DeliverableStatus = (typeof deliverableStatusEnum.enumValues)[number];

export async function createVerificationLog(data: {
  deliverableId: string;
  dealId?: string | null;
  userId: string;
  episodeId?: string | null;
  action: VerificationAction;
  confidence: number;
  placement?: string | null;
  keywordMatchCount?: number;
  keywordTotalCount?: number;
  previousStatus?: DeliverableStatus | string | null;
  newStatus?: DeliverableStatus | string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const [log] = await db
    .insert(verificationLogs)
    .values({
      deliverableId: data.deliverableId,
      dealId: data.dealId ?? null,
      userId: data.userId,
      episodeId: data.episodeId ?? null,
      action: data.action,
      confidence: data.confidence,
      placement: data.placement ?? null,
      keywordMatchCount: data.keywordMatchCount ?? 0,
      keywordTotalCount: data.keywordTotalCount ?? 0,
      previousStatus: (data.previousStatus ?? null) as DeliverableStatus | null,
      newStatus: (data.newStatus ?? null) as DeliverableStatus | null,
      metadata: data.metadata ?? null,
    })
    .returning();
  return log;
}

export async function getVerificationLogsByDeliverable(
  deliverableId: string,
  userId: string,
  limit = 50
) {
  return db
    .select()
    .from(verificationLogs)
    .where(
      and(
        eq(verificationLogs.deliverableId, deliverableId),
        eq(verificationLogs.userId, userId)
      )
    )
    .orderBy(desc(verificationLogs.createdAt))
    .limit(limit);
}

export async function getVerificationLogsByUser(
  userId: string,
  options?: { action?: VerificationAction; limit?: number; since?: Date }
) {
  const conditions = [eq(verificationLogs.userId, userId)];

  if (options?.action) {
    conditions.push(eq(verificationLogs.action, options.action));
  }

  if (options?.since) {
    conditions.push(gte(verificationLogs.createdAt, options.since));
  }

  return db
    .select()
    .from(verificationLogs)
    .where(and(...conditions))
    .orderBy(desc(verificationLogs.createdAt))
    .limit(options?.limit ?? 100);
}

export async function getVerificationLogStats(userId: string, since?: Date) {
  const sinceCondition = since ? gte(verificationLogs.createdAt, since) : undefined;

  const conditions = [eq(verificationLogs.userId, userId)];
  if (sinceCondition) conditions.push(sinceCondition);

  const results = await db
    .select({
      action: verificationLogs.action,
      count: sql<number>`count(*)::int`,
      avgConfidence: sql<number>`round(avg(${verificationLogs.confidence})::numeric, 2)`,
    })
    .from(verificationLogs)
    .where(and(...conditions))
    .groupBy(verificationLogs.action);

  return results;
}
