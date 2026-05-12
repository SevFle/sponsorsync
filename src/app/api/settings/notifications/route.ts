import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from "@/lib/db/queries/settings";
import { notificationPreferencesSchema } from "@/domain/settings";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const prefs = await getNotificationPreferences(session.user.id);

    if (!prefs) {
      return NextResponse.json({
        notifications: {
          deadlineReminders: true,
          paymentReminders: true,
          deliverableUpdates: true,
          reminderDaysBefore: 3,
        },
      });
    }

    return NextResponse.json({
      notifications: {
        deadlineReminders: prefs.deadlineReminders,
        paymentReminders: prefs.paymentReminders,
        deliverableUpdates: prefs.deliverableUpdates,
        reminderDaysBefore: prefs.reminderDaysBefore,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch notification preferences" },
      { status: 500 }
    );
  }
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
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  try {
    const updated = await upsertNotificationPreferences(
      session.user.id,
      parsed.data
    );
    return NextResponse.json({ notifications: updated });
  } catch {
    return NextResponse.json(
      { error: "Failed to update notification preferences" },
      { status: 500 }
    );
  }
}
