import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { createPaymentSchema } from "@/domain/payments";
import { getEnrichedPaymentsByUserId, createPayment } from "@/lib/db/queries/payments";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const payments = await getEnrichedPaymentsByUserId(userId);
  return NextResponse.json({ payments });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payment = await createPayment({
    ...parsed.data,
    dueDate: parsed.data.dueDate ?? null,
    currency: parsed.data.currency ?? "USD",
  });
  return NextResponse.json({ payment }, { status: 201 });
}
