import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";
import { computeDeliverableMetrics, resolveDateRange, type DateRangePreset } from "@/lib/analytics";

export async function GET(request: Request) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const { searchParams } = new URL(request.url);
  const preset = (searchParams.get("range") ?? "30d") as DateRangePreset;
  const range = resolveDateRange(preset);

  const deliverables = await getDeliverablesByUserId(userId);
  const metrics = computeDeliverableMetrics(
    deliverables.map((d) => ({
      status: d.status,
      dueDate: d.dueDate,
      completedDate: d.completedDate,
    })),
    range
  );

  return NextResponse.json(metrics);
}
