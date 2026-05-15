import { z } from "zod";

export const DEAL_PIPELINE_STATUSES = ["draft", "proposed", "active", "completed"] as const;
export type DealPipelineStatus = (typeof DEAL_PIPELINE_STATUSES)[number];

export const ALL_DEAL_STATUSES = ["draft", "proposed", "active", "completed", "cancelled"] as const;
export type DealStatus = (typeof ALL_DEAL_STATUSES)[number];

const validTransitions: Record<DealStatus, DealStatus[]> = {
  draft: ["proposed", "cancelled"],
  proposed: ["active", "draft", "cancelled"],
  active: ["completed", "cancelled"],
  completed: ["active"],
  cancelled: ["draft"],
};

export function isValidStatusTransition(from: DealStatus, to: DealStatus): boolean {
  return validTransitions[from]?.includes(to) ?? false;
}

export const updateDealStatusSchema = z.object({
  status: z.enum(["draft", "proposed", "active", "completed", "cancelled"]),
});

export type UpdateDealStatusInput = z.infer<typeof updateDealStatusSchema>;

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
