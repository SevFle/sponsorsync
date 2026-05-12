import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { updateSponsorSchema } from "@/domain/sponsors";
import { getSponsorById, updateSponsor, deleteSponsor } from "@/lib/db/queries/sponsors";
import { getDealsBySponsorId } from "@/lib/db/queries/deals";
import { calculateDealProgress } from "@/domain/deals";
import { z } from "zod";

const idParamSchema = z.string().uuid();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
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
  const sponsor = await getSponsorById(id, userId);
  if (!sponsor) {
    return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
  }

  const sponsorDeals = await getDealsBySponsorId(id, userId);
  const deals = sponsorDeals.map((deal) => ({
    id: deal.id,
    title: deal.title,
    description: deal.description,
    status: deal.status,
    totalValue: deal.totalValue,
    currency: deal.currency ?? "USD",
    startDate: deal.startDate,
    endDate: deal.endDate,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
  }));

  return NextResponse.json({ sponsor, deals });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
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

  const parsed = updateSponsorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const userId = session.user.id;
  const sponsor = await updateSponsor(id, parsed.data, userId);
  if (!sponsor) {
    return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
  }
  return NextResponse.json({ sponsor });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
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
  const sponsor = await deleteSponsor(id, userId);
  if (!sponsor) {
    return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true }, { status: 200 });
}
