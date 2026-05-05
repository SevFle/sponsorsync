import { z } from "zod";

export const createDealSchema = z.object({
  sponsorId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  totalValue: z.number().int().positive().optional(),
  currency: z.string().length(3).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

export const updateDealSchema = createDealSchema.partial();

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;

export function calculateDealProgress(
  totalDeliverables: number,
  completedDeliverables: number
): number {
  if (totalDeliverables === 0) return 0;
  return Math.round((completedDeliverables / totalDeliverables) * 100);
}
