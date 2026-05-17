import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { updatePaymentSchema } from "@/domain/payments";
import { getPaymentById, updatePayment, deletePayment } from "@/lib/db/queries/payments";
import { z } from "zod";

const idParamSchema = z.string().uuid();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const idResult = idParamSchema.safeParse(id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: "Invalid id parameter", details: idResult.error.flatten() },
      { status: 400 }
    );
  }

  const userId = session.user.id;
  const payment = await getPaymentById(id, userId);
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }
  return NextResponse.json({ payment });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const idResult = idParamSchema.safeParse(id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: "Invalid id parameter", details: idResult.error.flatten() },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updatePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const userId = session.user.id;
  const payment = await updatePayment(id, parsed.data, userId);
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }
  return NextResponse.json({ payment });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const idResult = idParamSchema.safeParse(id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: "Invalid id parameter", details: idResult.error.flatten() },
      { status: 400 }
    );
  }

  const userId = session.user.id;
  const payment = await deletePayment(id, userId);
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true }, { status: 200 });
}
