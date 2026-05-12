import { z } from "zod";

export const notificationPreferencesSchema = z.object({
  deadlineReminders: z.boolean().default(true),
  paymentReminders: z.boolean().default(true),
  deliverableUpdates: z.boolean().default(true),
  reminderDaysBefore: z.number().int().min(1).max(30).default(3),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  image: z.string().url().optional().or(z.literal("")),
});

export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
