import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { z } from "zod";
import { verifyBulkDeliverables, type DeliverableRow } from "@/lib/deliverables";
import { db } from "@/lib/db";
import { deliverables, deals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

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
    .where(eq(deals.userId, userId));

  const deliverableRows: DeliverableRow[] = rows.map((r) => ({
    ...r,
    description: r.description ?? null,
    dueDate: r.dueDate ?? null,
    completedDate: r.completedDate ?? null,
    verificationData: r.verificationData as Record<string, unknown> | null,
    notes: r.notes ?? null,
  }));

  const result = verifyBulkDeliverables(deliverableRows);

  return NextResponse.json(result, { status: 200 });
}
