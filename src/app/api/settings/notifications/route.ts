import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from "@/lib/db/queries/notifications";
import { z } from "zod";

const notificationSchema = z.object({
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

  const prefs = await getNotificationPreferences(session.user.id);
  if (!prefs) {
    return NextResponse.json({
      preferences: {
        deadlineReminders: true,
        paymentReminders: true,
        deliverableUpdates: true,
        reminderDaysBefore: 3,
      },
    });
  }

  return NextResponse.json({ preferences: prefs });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = notificationSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const prefs = await upsertNotificationPreferences(session.user.id, result.data);
  return NextResponse.json({ preferences: prefs });
}
