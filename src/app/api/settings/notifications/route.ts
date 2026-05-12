import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { updateNotificationPreferencesSchema } from "@/domain/settings";
import { getNotificationPreferences, upsertNotificationPreferences } from "@/lib/db/queries/settings";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const preferences = await getNotificationPreferences(session.user.id);
    if (!preferences) {
      return NextResponse.json({ error: "Notification preferences not found" }, { status: 404 });
    }
    return NextResponse.json({ preferences });
  } catch {
    return NextResponse.json({ error: "Failed to fetch notification preferences" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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

  const parsed = updateNotificationPreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const preferences = await upsertNotificationPreferences(session.user.id, parsed.data);
    return NextResponse.json({ preferences });
  } catch {
    return NextResponse.json({ error: "Failed to update notification preferences" }, { status: 500 });
  }
}
