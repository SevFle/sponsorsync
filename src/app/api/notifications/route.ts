import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import {
  getNotificationsByUserId,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
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

const VALID_NOTIFICATION_TYPES = new Set([
  "deadline_reminder",
  "overdue_deliverable",
  "payment_follow_up",
]);

export async function POST(request: Request) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, title, message, relatedId } = body;

  if (!type || !title || !message) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!VALID_NOTIFICATION_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
  }

  const notification = await createNotification({
    userId: session.user.id,
    type,
    title,
    message,
    relatedId: relatedId || undefined,
  });

  return NextResponse.json({ notification }, { status: 201 });
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
