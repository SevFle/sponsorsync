import { db } from "..";
import { users } from "../schema";
import { eq } from "drizzle-orm";

export async function getUserById(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId));
  return user;
}

export async function updateUserName(userId: string, name: string) {
  const [user] = await db
    .update(users)
    .set({ name, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
    });
  return user;
}
