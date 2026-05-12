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

  try {
    const userId = session.user.id;

    const [profile, notificationPrefs] = await Promise.all([
      getUserProfile(userId),
      getNotificationPreferences(userId),
    ]);

    return NextResponse.json({
      settings: {
        profile: profile
          ? {
              name: profile.name,
              email: profile.email,
              image: profile.image,
            }
          : null,
        notifications: notificationPrefs
          ? {
              deadlineReminders: notificationPrefs.deadlineReminders,
              paymentReminders: notificationPrefs.paymentReminders,
              deliverableUpdates: notificationPrefs.deliverableUpdates,
              reminderDaysBefore: notificationPrefs.reminderDaysBefore,
            }
          : {
              deadlineReminders: true,
              paymentReminders: true,
              deliverableUpdates: true,
              reminderDaysBefore: 3,
            },
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}
