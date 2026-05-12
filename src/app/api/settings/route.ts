import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getUserById } from "@/lib/db/queries/users";
import { getNotificationPreferencesByUserId } from "@/lib/db/queries/notification-preferences";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const [user, notificationPrefs] = await Promise.all([
    getUserById(userId),
    getNotificationPreferencesByUserId(userId),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    settings: {
      profile: {
        name: user.name,
        email: user.email,
        image: user.image,
      },
      notifications: notificationPrefs
        ? {
            deadlineReminders: notificationPrefs.deadlineReminders,
            paymentReminders: notificationPrefs.paymentReminders,
            deliverableUpdates: notificationPrefs.deliverableUpdates,
            reminderDaysBefore: notificationPrefs.reminderDaysBefore,
          }
        : null,
    },
  });
}
