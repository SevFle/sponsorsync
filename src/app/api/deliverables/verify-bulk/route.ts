import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { z } from "zod";
import { verifyBulkDeliverables, type DeliverableRow } from "@/lib/deliverables";
import {
  computeEnhancedBulkVerification,
  type EpisodeData,
  type DeliverableRequirement,
  type PlacementType,
} from "@/lib/verification";
import { createVerificationLog } from "@/lib/db/queries/verificationLogs";
import { db } from "@/lib/db";
import { deliverables, deals, sponsors } from "@/lib/db/schema";
import { eq, and, isNotNull, not, sql } from "drizzle-orm";

const bulkVerifySchema = z.object({
  deliverableIds: z.array(z.string().uuid()).min(1).max(100).optional(),
  episodes: z.record(z.string(), z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    publishedAt: z.string().nullable(),
    durationSeconds: z.number().nullable(),
    url: z.string().nullable(),
    transcript: z.string().nullable(),
  }))).optional(),
  autoComplete: z.boolean().default(false),
});

export async function POST(request: Request) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bulkVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { deliverableIds, episodes, autoComplete } = parsed.data;

  try {
    let whereCondition = eq(deals.userId, session.user.id);
    if (deliverableIds) {
      whereCondition = and(
        eq(deals.userId, session.user.id),
        sql`${deliverables.id} IN (${sql.join(deliverableIds.map((id) => sql`${id}`), sql`, `)})`
      )!;
    } else {
      whereCondition = and(
        eq(deals.userId, session.user.id),
        isNotNull(deliverables.dueDate),
        not(sql`${deliverables.status} IN ('verified', 'missed')`)
      )!;
    }

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
        sponsorId: deals.sponsorId,
      })
      .from(deliverables)
      .innerJoin(deals, eq(deliverables.dealId, deals.id))
      .where(whereCondition);

    if (rows.length === 0) {
      return NextResponse.json({
        totalChecked: 0,
        results: [],
        errors: [],
      });
    }

    const sponsorIds = [...new Set(rows.map((r) => r.sponsorId))];
    const sponsorRows = await db
      .select({ id: sponsors.id, name: sponsors.name })
      .from(sponsors)
      .where(sql`${sponsors.id} IN (${sql.join(sponsorIds.map((id) => sql`${id}`), sql`, `)})`);

    const sponsorMap = new Map(sponsorRows.map((s) => [s.id, s.name]));

    const deliverableRows: DeliverableRow[] = rows.map((r) => ({
      id: r.id,
      dealId: r.dealId,
      dealTitle: r.dealTitle,
      title: r.title,
      description: r.description ?? null,
      status: r.status,
      dueDate: r.dueDate ?? null,
      completedDate: r.completedDate ?? null,
      verificationData: r.verificationData as Record<string, unknown> | null,
      notes: r.notes ?? null,
    }));

    const baseResult = verifyBulkDeliverables(deliverableRows);

    const episodeDeliverablePairs = rows.map((row) => {
      const episodeData: EpisodeData[] = (episodes?.[row.id] ?? []).map((ep) => ({
        id: ep.id,
        title: ep.title,
        description: ep.description,
        publishedAt: ep.publishedAt,
        durationSeconds: ep.durationSeconds,
        url: ep.url,
        transcript: ep.transcript,
      }));

      const verificationData = row.verificationData as Record<string, unknown> | null;
      const requirement: DeliverableRequirement = {
        id: row.id,
        title: row.title,
        sponsorName: sponsorMap.get(row.sponsorId) ?? "",
        productName: (verificationData?.productName as string) ?? null,
        requiredPlacement: (verificationData?.requiredPlacement as PlacementType) ?? null,
        dueDate: row.dueDate ?? null,
        keywords: (verificationData?.keywords as string[]) ?? undefined,
      };

      return { deliverableId: row.id, episodes: episodeData, requirement };
    });

    const enhancedResult = computeEnhancedBulkVerification(
      baseResult.reports,
      episodeDeliverablePairs,
      session.user.id
    );

    if (autoComplete) {
      for (const result of enhancedResult.results) {
        if (result.recommendedAction === "auto_complete" && result.episodeCheck) {
          try {
            await db
              .update(deliverables)
              .set({
                status: "verified",
                completedDate: new Date().toISOString().split("T")[0],
                updatedAt: new Date(),
              })
              .where(eq(deliverables.id, result.baseReport.deliverableId));
          } catch {
            enhancedResult.errors.push(`Failed to auto-complete ${result.baseReport.deliverableId}`);
          }
        }

        try {
          await createVerificationLog({
            deliverableId: result.auditEntry.deliverableId,
            dealId: result.auditEntry.dealId,
            userId: session.user.id,
            episodeId: result.auditEntry.episodeId,
            action: result.auditEntry.action,
            confidence: result.auditEntry.confidence,
            placement: result.auditEntry.placement,
            keywordMatchCount: result.auditEntry.keywordMatchCount,
            keywordTotalCount: result.auditEntry.keywordTotalCount,
            previousStatus: result.auditEntry.previousStatus,
            newStatus: result.auditEntry.newStatus,
            metadata: result.auditEntry.metadata,
          });
        } catch {
          enhancedResult.errors.push(`Failed to log verification for ${result.auditEntry.deliverableId}`);
        }
      }
    }

    return NextResponse.json({
      totalChecked: enhancedResult.totalEntries,
      autoCompleted: enhancedResult.autoCompleted,
      manualReview: enhancedResult.manualReview,
      failed: enhancedResult.failed,
      overdueAlerts: enhancedResult.overdueAlerts,
      results: enhancedResult.results.map((r) => ({
        deliverableId: r.baseReport.deliverableId,
        deliverableTitle: r.baseReport.deliverableTitle,
        dealId: r.baseReport.dealId,
        dealTitle: r.baseReport.dealTitle,
        confidence: r.confidence,
        recommendedAction: r.recommendedAction,
        baseStatus: r.baseReport.overallStatus,
        deadlineStatus: r.baseReport.deadlineStatus,
        episodeId: r.episodeCheck?.episodeId ?? null,
        summary: r.episodeCheck?.summary ?? r.baseReport.summary,
        auditEntryId: r.auditEntry.id,
      })),
      errors: enhancedResult.errors,
    });
  } catch (error) {
    console.error("Bulk verification failed:", error);
    return NextResponse.json({ error: "Bulk verification failed" }, { status: 500 });
  }
}
