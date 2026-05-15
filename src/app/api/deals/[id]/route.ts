import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { updateDealSchema } from "@/domain/deals";
import { getDealById, updateDeal, deleteDeal } from "@/lib/db/queries/deals";
import { z } from "zod";

const idParamSchema = z.string().uuid();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
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
  const deal = await getDealById(id, userId);
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }
  return NextResponse.json({ deal });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
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

  const parsed = updateDealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const userId = session.user.id;
  const deal = await updateDeal(id, parsed.data, userId);
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }
  return NextResponse.json({ deal });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
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
  const deal = await deleteDeal(id, userId);
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true }, { status: 200 });
}
