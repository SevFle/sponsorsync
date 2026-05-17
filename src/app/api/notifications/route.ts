import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import {
  getNotificationsByUserId,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/db/queries/notifications";

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const [notifications, unreadCount] = await Promise.all([
    getNotificationsByUserId(userId),
    getUnreadNotificationCount(userId),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PUT(request: Request) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json();

  if (body.markAllRead) {
    const count = await markAllNotificationsRead(userId);
    return NextResponse.json({ markedRead: count });
  }

  if (body.notificationId) {
    const notification = await markNotificationRead(body.notificationId, userId);
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    return NextResponse.json({ notification });
  }

  return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
}
