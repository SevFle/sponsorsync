import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import {
  createNotification,
  markNotificationRead,
  deleteNotificationsByUserId,
} from "@/lib/db/queries/notifications";

const isTestEnv =
  process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development";

export async function POST(request: Request) {
  if (!isTestEnv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { notifications } = body;

  if (!Array.isArray(notifications)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await deleteNotificationsByUserId(session.user.id);

  const created = [];
  for (const n of notifications) {
    const notification = await createNotification({
      userId: session.user.id,
      type: n.type,
      title: n.title,
      message: n.message,
      relatedId: n.relatedId,
    });
    if (notification) {
      if (n.read) {
        const updated = await markNotificationRead(
          notification.id,
          session.user.id
        );
        created.push(updated ?? { ...notification, read: true });
      } else {
        created.push(notification);
      }
    }
  }

  return NextResponse.json({ notifications: created });
}

export async function DELETE() {
  if (!isTestEnv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await deleteNotificationsByUserId(session.user.id);
  return NextResponse.json({ deleted: count });
}
