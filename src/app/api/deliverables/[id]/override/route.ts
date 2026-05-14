import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { z } from "zod";
import { verifyDeliverable, verifyBulkDeliverables, type DeliverableRow } from "@/lib/deliverables";
import { computeEnhancedBulkVerification, type EpisodeData, type DeliverableRequirement } from "@/lib/verification";
import { createVerificationLog } from "@/lib/db/queries/verificationLogs";
import { db } from "@/lib/db";
import { deliverables, deals } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const overrideSchema = z.object({
  deliverableId: z.string().uuid(),
  verified: z.boolean(),
  reason: z.string().min(1).max(500),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = overrideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { deliverableId, verified, reason } = parsed.data;

  try {
    const [deliverable] = await db
      .select({
        id: deliverables.id,
        dealId: deliverables.dealId,
        title: deliverables.title,
        status: deliverables.status,
        userId: deals.userId,
      })
      .from(deliverables)
      .innerJoin(deals, eq(deliverables.dealId, deals.id))
      .where(eq(deliverables.id, deliverableId))
      .limit(1);

    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    if (deliverable.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const newStatus = verified ? "verified" : "pending";
    const previousStatus = deliverable.status;

    await db
      .update(deliverables)
      .set({
        status: newStatus,
        completedDate: verified ? new Date().toISOString().split("T")[0] : null,
        updatedAt: new Date(),
      })
      .where(eq(deliverables.id, deliverableId));

    await createVerificationLog({
      deliverableId,
      dealId: deliverable.dealId,
      userId: session.user.id,
      action: verified ? "verification_passed" : "verification_failed",
      confidence: verified ? 1.0 : 0,
      previousStatus,
      newStatus,
      metadata: { manualOverride: true, reason },
    });

    return NextResponse.json({
      success: true,
      deliverableId,
      previousStatus,
      newStatus,
      verified,
    });
  } catch (error) {
    console.error("Failed to override deliverable:", error);
    return NextResponse.json({ error: "Failed to override deliverable" }, { status: 500 });
  }
}
