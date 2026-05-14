import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { DEFAULT_TEMPLATES } from "./templateDefaults";
import { getDefaultTemplates, createTemplate } from "@/lib/db/queries/templates";

export interface SeedResult {
  created: number;
  skipped: number;
  errors: string[];
}

export async function seedDefaultTemplates(userId: string): Promise<SeedResult> {
  const result: SeedResult = { created: 0, skipped: 0, errors: [] };

  const existing = await getDefaultTemplates(userId);
  const existingCategories = new Set(existing.map((t) => t.category));

  for (const tmpl of DEFAULT_TEMPLATES) {
    if (existingCategories.has(tmpl.category)) {
      result.skipped++;
      continue;
    }

    try {
      await createTemplate({
        userId,
        name: tmpl.name,
        subject: tmpl.subject,
        body: tmpl.body,
        category: tmpl.category,
        isDefault: true,
      });
      result.created++;
    } catch (error) {
      result.errors.push(
        `Failed to seed "${tmpl.name}": ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return result;
}

export async function ensureDefaultTemplates(userId: string): Promise<void> {
  const existing = await getDefaultTemplates(userId);
  if (existing.length >= DEFAULT_TEMPLATES.length) return;
  await seedDefaultTemplates(userId);
}

export async function resetDefaultTemplates(userId: string): Promise<SeedResult> {
  const result: SeedResult = { created: 0, skipped: 0, errors: [] };

  try {
    await db
      .delete(templates)
      .where(and(eq(templates.userId, userId), eq(templates.isDefault, true)));
  } catch (error) {
    result.errors.push(
      `Failed to clear defaults: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return result;
  }

  const seedResult = await seedDefaultTemplates(userId);
  return seedResult;
}
