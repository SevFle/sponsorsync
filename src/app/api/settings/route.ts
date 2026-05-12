import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getUserProfile } from "@/lib/db/queries/settings";
import { getNotificationPreferences } from "@/lib/db/queries/settings";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile, notificationPreferences] = await Promise.all([
    getUserProfile(session.user.id),
    getNotificationPreferences(session.user.id),
  ]);

  return NextResponse.json({
    profile,
    notificationPreferences: notificationPreferences ?? {
      deadlineReminders: true,
      paymentReminders: true,
      deliverableUpdates: true,
      reminderDaysBefore: 3,
    },
  });
}
