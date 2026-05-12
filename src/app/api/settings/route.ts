import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getNotificationPreferences } from "@/lib/db/queries/notification-preferences";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const notificationPreferences = await getNotificationPreferences(userId);

  return NextResponse.json({
    profile: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
    },
    notificationPreferences: notificationPreferences ?? {
      deadlineReminders: true,
      paymentReminders: true,
      deliverableUpdates: true,
      reminderDaysBefore: 3,
    },
  });
}
