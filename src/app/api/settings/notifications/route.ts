import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from "@/lib/db/queries/settings";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preferences = await getNotificationPreferences(session.user.id);
  if (!preferences) {
    return NextResponse.json({
      preferences: {
        deadlineReminders: true,
        paymentReminders: true,
        deliverableUpdates: true,
        reminderDaysBefore: 3,
      },
    });
  }

  return NextResponse.json({ preferences });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { deadlineReminders, paymentReminders, deliverableUpdates, reminderDaysBefore } = body;

  const preferences = await upsertNotificationPreferences(session.user.id, {
    deadlineReminders,
    paymentReminders,
    deliverableUpdates,
    reminderDaysBefore,
  });

  return NextResponse.json({ preferences });
}
