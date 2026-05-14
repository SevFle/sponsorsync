import { db } from "..";
import { templates } from "../schema";
import { eq, and, ilike, or, sql } from "drizzle-orm";

export async function getTemplatesByUserId(userId: string) {
  return db.select().from(templates).where(eq(templates.userId, userId)).orderBy(templates.createdAt);
}

export async function getTemplatesByUserIdFiltered(
  userId: string,
  options?: { search?: string; category?: string }
) {
  const conditions = [eq(templates.userId, userId)];

  if (options?.category) {
    conditions.push(eq(templates.category, options.category));
  }

  if (options?.search) {
    const term = `%${options.search}%`;
    conditions.push(
      sql`(${templates.name} ILIKE ${term} OR ${templates.subject} ILIKE ${term} OR ${templates.category} ILIKE ${term})`
    );
  }

  return db.select().from(templates).where(and(...conditions)).orderBy(templates.createdAt);
}

export async function getTemplateById(id: string, userId: string) {
  const [template] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, id), eq(templates.userId, userId)));
  return template;
}

export async function createTemplate(data: typeof templates.$inferInsert) {
  const [template] = await db.insert(templates).values(data).returning();
  return template;
}

export async function updateTemplate(
  id: string,
  data: Partial<typeof templates.$inferInsert>,
  userId: string
) {
  const [template] = await db
    .update(templates)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(templates.id, id), eq(templates.userId, userId)))
    .returning();
  return template;
}

export async function deleteTemplate(id: string, userId: string) {
  const [template] = await db
    .delete(templates)
    .where(and(eq(templates.id, id), eq(templates.userId, userId)))
    .returning();
  return template;
}

export async function getDefaultTemplates(userId: string) {
  return db
    .select()
    .from(templates)
    .where(and(eq(templates.userId, userId), eq(templates.isDefault, true)));
}
