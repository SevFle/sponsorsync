import { z } from "zod";

export const TEMPLATE_CATEGORIES = [
  "outreach",
  "deliverable",
  "payment",
  "renewal",
  "custom",
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const TEMPLATE_TYPE_VARIABLE_MAP: Record<TemplateCategory, string[]> = {
  outreach: ["sponsor_name", "creator_name", "creator_show", "deal_amount", "proposal_url"],
  deliverable: [
    "sponsor_name",
    "creator_name",
    "creator_show",
    "deliverable_title",
    "deliverable_description",
    "deal_title",
    "due_date",
  ],
  payment: [
    "sponsor_name",
    "creator_name",
    "creator_show",
    "deal_title",
    "invoice_amount",
    "invoice_number",
    "payment_due_date",
  ],
  renewal: [
    "sponsor_name",
    "creator_name",
    "creator_show",
    "deal_title",
    "deal_amount",
    "deal_start_date",
    "deal_end_date",
  ],
  custom: [],
};

const htmlBodyRegex = /<[^>]+>/;

export const createTemplateSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(255, "Name must be 255 characters or less")
      .transform((v) => v.trim()),
    subject: z
      .string()
      .max(500, "Subject must be 500 characters or less")
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    body: z
      .string()
      .nullable()
      .optional()
      .transform((v) => v ?? "")
      .refine((v) => v === "" || htmlBodyRegex.test(v), {
        message: "Body must contain valid HTML",
      }),
    category: z
      .enum(TEMPLATE_CATEGORIES, { message: "Invalid category" })
      .nullable()
      .optional()
      .transform((v) => v ?? null),
  })
  .strict();

export const updateTemplateSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name must be a non-empty string")
      .max(255, "Name must be 255 characters or less")
      .transform((v) => v.trim())
      .optional(),
    subject: z
      .string()
      .max(500, "Subject must be 500 characters or less")
      .nullable()
      .optional(),
    body: z
      .string()
      .min(1, "Body must be a non-empty string")
      .refine((v) => htmlBodyRegex.test(v), {
        message: "Body must contain valid HTML",
      })
      .optional(),
    category: z
      .enum(TEMPLATE_CATEGORIES, { message: "Invalid category" })
      .nullable()
      .optional(),
  })
  .strict();

export const sendTemplateSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
  cc: z
    .union([z.string().email(), z.array(z.string().email())])
    .optional(),
  bcc: z
    .union([z.string().email(), z.array(z.string().email())])
    .optional(),
  replyTo: z
    .union([z.string().email(), z.array(z.string().email())])
    .optional(),
  sponsorId: z.string().optional(),
  dealId: z.string().optional(),
  deliverableId: z.string().optional(),
  paymentId: z.string().optional(),
  variables: z.record(z.string()).optional(),
  preview: z.boolean().optional(),
});

export const duplicateTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255)
    .optional()
    .transform((v) => v?.trim()),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type SendTemplateInput = z.infer<typeof sendTemplateSchema>;
export type DuplicateTemplateInput = z.infer<typeof duplicateTemplateSchema>;

export function getRequiredVariablesForCategory(
  category: TemplateCategory | null
): string[] {
  if (!category || category === "custom") return [];
  return TEMPLATE_TYPE_VARIABLE_MAP[category] ?? [];
}
