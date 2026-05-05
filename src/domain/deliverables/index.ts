import { z } from "zod";

export const createDeliverableSchema = z.object({
  dealId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  dueDate: z.string().date().optional(),
});

export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>;

export type VerificationResult = {
  verified: boolean;
  platform: string;
  evidence: string;
  checkedAt: Date;
};

export function checkDeliverableStatus(
  dueDate: string,
  completedDate: string | null
): "on_track" | "at_risk" | "overdue" | "completed" {
  if (completedDate) return "completed";
  const now = new Date();
  const due = new Date(dueDate);
  const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 3) return "at_risk";
  return "on_track";
}
