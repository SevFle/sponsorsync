import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { z } from "zod";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from "@/lib/db/queries/settings";
import { validateReminderSchedule } from "@/lib/deadlines/config";

const notificationPreferencesSchema = z.object({
  deadlineReminders: z.boolean().optional(),
  paymentReminders: z.boolean().optional(),
  deliverableUpdates: z.boolean().optional(),
  reminderDaysBefore: z.number().int().min(1).max(30).optional(),
  reminderSchedule: z
    .array(z.number().int().min(1).max(30))
    .min(1)
    .max(5)
    .optional(),
});

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preferences = await getNotificationPreferences(session.user.id);
  if (!preferences) {
    return NextResponse.json({ preferences: null });
  }

  return NextResponse.json({ preferences });
}

export async function PUT(request: Request) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = notificationPreferencesSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      },
      { status: 400 }
    );
  }

  if (parsed.data.reminderSchedule) {
    const scheduleValidation = validateReminderSchedule(parsed.data.reminderSchedule);
    if (!scheduleValidation.valid) {
      return NextResponse.json(
        { error: scheduleValidation.error },
        { status: 400 }
      );
    }
    parsed.data.reminderSchedule = scheduleValidation.schedule;
  }

  const preferences = await upsertNotificationPreferences(
    session.user.id,
    parsed.data
  );
  return NextResponse.json({ preferences });
}
