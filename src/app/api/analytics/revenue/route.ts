import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { getPaymentsByUserId } from "@/lib/db/queries/payments";
import { computeRevenueSummary, resolveDateRange, type DateRangePreset } from "@/lib/analytics";

export async function GET(request: Request) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const { searchParams } = new URL(request.url);
  const preset = (searchParams.get("range") ?? "30d") as DateRangePreset;
  const range = resolveDateRange(preset);

  const payments = await getPaymentsByUserId(userId);
  const summary = computeRevenueSummary(
    payments.map((p) => ({
      amount: p.amount,
      status: p.status,
      paidDate: p.paidDate,
      dueDate: p.dueDate,
      currency: p.currency ?? null,
    })),
    range
  );

  return NextResponse.json(summary);
}
