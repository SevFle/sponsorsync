import { z } from "zod";
import { differenceInDays } from "date-fns";

export const createPaymentSchema = z.object({
  dealId: z.string().uuid(),
  amount: z.number().int().positive(),
  currency: z.string().length(3).optional(),
  dueDate: z.string().date().optional(),
});

export const updatePaymentSchema = z.object({
  dealId: z.string().uuid().optional(),
  amount: z.number().int().positive().optional(),
  currency: z.string().length(3).optional(),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
  dueDate: z.string().date().optional(),
  paidDate: z.string().date().nullable().optional(),
  invoiceUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

export function calculateTotalPaid(payments: { amount: number; status: string }[]): number {
  return payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
}

export function calculateTotalOutstanding(
  payments: { amount: number; status: string }[]
): number {
  return payments
    .filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((sum, p) => sum + p.amount, 0);
}

export function calculateTotalOverdue(
  payments: { amount: number; status: string }[]
): number {
  return payments
    .filter((p) => p.status === "overdue")
    .reduce((sum, p) => sum + p.amount, 0);
}

export function calculateTotalPending(
  payments: { amount: number; status: string }[]
): number {
  return payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);
}

export type DueDateStatus = "overdue" | "due_soon" | "upcoming" | "no_due_date" | "paid";

export function getDaysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  return differenceInDays(new Date(dueDate), new Date());
}

export function getDueDateStatus(
  dueDate: string | null,
  status: string
): DueDateStatus {
  if (status === "paid" || status === "cancelled") return "paid";
  if (!dueDate) return "no_due_date";

  const days = differenceInDays(new Date(dueDate), new Date());
  if (days < 0) return "overdue";
  if (days <= 7) return "due_soon";
  return "upcoming";
}
