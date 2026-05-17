import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { z } from "zod";
import { verifyDeliverable, type VerificationContext } from "@/lib/deliverables";

const verifyRequestSchema = z.object({
  deliverableId: z.string().uuid(),
  dealId: z.string().uuid(),
  dealTitle: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.enum(["pending", "in_progress", "submitted", "verified", "missed"]),
  dueDate: z.string().nullable().optional(),
  completedDate: z.string().nullable().optional(),
  verificationData: z.record(z.unknown()).nullable().optional(),
  notes: z.string().nullable().optional(),
  deliverableType: z.enum(["ad_read", "link_placement", "social_mention"]).optional(),
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

  const parsed = verifyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const context: VerificationContext = {
    deliverableId: data.deliverableId,
    deliverableTitle: data.title,
    verificationData: data.verificationData ?? null,
    dueDate: data.dueDate ?? null,
    completedDate: data.completedDate ?? null,
    status: data.status,
    notes: data.notes ?? null,
  };

  const report = verifyDeliverable(context, data.dealId, data.dealTitle, data.deliverableType);

  return NextResponse.json({ report }, { status: 200 });
}
