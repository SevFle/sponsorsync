import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getContactById, updateContact, deleteContact, clearPrimaryFlag } from "@/lib/db/queries/contacts";
import { getSponsorById } from "@/lib/db/queries/sponsors";
import { updateContactSchema } from "@/domain/contacts";
import { z } from "zod";

const idParamSchema = z.string().uuid();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, contactId } = await params;
  const sponsorIdResult = idParamSchema.safeParse(id);
  const contactIdResult = idParamSchema.safeParse(contactId);
  if (!sponsorIdResult.success || !contactIdResult.success) {
    return NextResponse.json({ error: "Invalid id parameters" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const userId = session.user.id;
  const sponsor = await getSponsorById(id, userId);
  if (!sponsor) {
    return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
  }

  const existing = await getContactById(contactId, id);
  if (!existing) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  try {
    if (parsed.data.isPrimary) {
      await clearPrimaryFlag(id);
    }

    const contact = await updateContact(contactId, parsed.data, id);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    return NextResponse.json({ contact });
  } catch {
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, contactId } = await params;
  const sponsorIdResult = idParamSchema.safeParse(id);
  const contactIdResult = idParamSchema.safeParse(contactId);
  if (!sponsorIdResult.success || !contactIdResult.success) {
    return NextResponse.json({ error: "Invalid id parameters" }, { status: 400 });
  }

  const userId = session.user.id;
  const sponsor = await getSponsorById(id, userId);
  if (!sponsor) {
    return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
  }

  const contact = await deleteContact(contactId, id);
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
