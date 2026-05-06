import { z } from "zod";

export const createSponsorSchema = z.object({
  name: z.string().min(1).max(255),
  company: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export const updateSponsorSchema = createSponsorSchema.partial();

export type CreateSponsorInput = z.infer<typeof createSponsorSchema>;
export type UpdateSponsorInput = z.infer<typeof updateSponsorSchema>;
