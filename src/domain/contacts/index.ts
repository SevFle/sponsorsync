import { z } from "zod";

export const createContactSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  role: z.string().max(100).optional(),
  phone: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export const updateContactSchema = createContactSchema.partial();

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
