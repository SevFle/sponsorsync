export const DEFAULT_REMINDER_SCHEDULE = [7, 3, 1] as const;

export const OVERDUE_CHECK_CRON = "0 10 * * *";

export const MAX_REMINDER_TIERS = 5;

export const MIN_REMINDER_DAYS = 1;
export const MAX_REMINDER_DAYS = 30;

export type ReminderSchedule = readonly number[];

export function validateReminderSchedule(schedule: unknown): {
  valid: boolean;
  schedule: number[];
  error?: string;
} {
  if (!Array.isArray(schedule)) {
    return { valid: false, schedule: [], error: "Schedule must be an array" };
  }

  if (schedule.length === 0) {
    return { valid: false, schedule: [], error: "Schedule cannot be empty" };
  }

  if (schedule.length > MAX_REMINDER_TIERS) {
    return {
      valid: false,
      schedule: [],
      error: `Schedule cannot have more than ${MAX_REMINDER_TIERS} tiers`,
    };
  }

  const numeric = schedule.map(Number).filter((n) => !isNaN(n));

  if (numeric.length !== schedule.length) {
    return { valid: false, schedule: [], error: "All values must be numbers" };
  }

  for (const days of numeric) {
    if (days < MIN_REMINDER_DAYS || days > MAX_REMINDER_DAYS) {
      return {
        valid: false,
        schedule: [],
        error: `Each tier must be between ${MIN_REMINDER_DAYS} and ${MAX_REMINDER_DAYS} days`,
      };
    }
  }

  const sorted = [...numeric].sort((a, b) => b - a);

  return { valid: true, schedule: sorted };
}

export function resolveReminderSchedule(
  userSchedule: number[] | null | undefined
): number[] {
  if (userSchedule && userSchedule.length > 0) {
    return [...userSchedule].sort((a, b) => b - a);
  }
  return [...DEFAULT_REMINDER_SCHEDULE].sort((a, b) => b - a);
}
