import { z } from "zod";

export const createPaymentSchema = z.object({
  dealId: z.string().uuid(),
  amount: z.number().int().positive(),
  currency: z.string().length(3).optional(),
  dueDate: z.string().date().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

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
