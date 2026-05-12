import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  image: z.string().url().nullable().optional(),
});

export const updateNotificationPreferencesSchema = z.object({
  deadlineReminders: z.boolean().optional(),
  paymentReminders: z.boolean().optional(),
  deliverableUpdates: z.boolean().optional(),
  reminderDaysBefore: z.number().int().min(1).max(30).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
