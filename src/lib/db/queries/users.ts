import { db } from "..";
import { users } from "../schema";
import { eq } from "drizzle-orm";

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function updateUser(id: string, data: Partial<Pick<typeof users.$inferInsert, "name" | "image">>) {
  const [user] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
  return user;
}
