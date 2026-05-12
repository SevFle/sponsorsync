import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from "@/lib/db/queries/notification-preferences";
import { z } from "zod";

const notificationPreferencesSchema = z.object({
  deadlineReminders: z.boolean().optional(),
  paymentReminders: z.boolean().optional(),
  deliverableUpdates: z.boolean().optional(),
  reminderDaysBefore: z.number().int().min(1).max(30).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const prefs = await getNotificationPreferences(userId);

  return NextResponse.json({
    notificationPreferences: prefs ?? {
      deadlineReminders: true,
      paymentReminders: true,
      deliverableUpdates: true,
      reminderDaysBefore: 3,
    },
  });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = notificationPreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const userId = session.user.id;
  const updated = await upsertNotificationPreferences(userId, parsed.data);

  return NextResponse.json({ notificationPreferences: updated ?? parsed.data });
}
