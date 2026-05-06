import { db } from "..";
import { integrations, integrationPlatformEnum } from "../schema";
import { eq, and } from "drizzle-orm";

type Platform = (typeof integrationPlatformEnum.enumValues)[number];

export async function getIntegrationsByUserId(userId: string) {
  return db.select().from(integrations).where(eq(integrations.userId, userId));
}

export async function getIntegrationByPlatform(platform: Platform, userId: string) {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.platform, platform), eq(integrations.userId, userId)));
  return integration;
}

export async function deleteIntegration(platform: Platform, userId: string) {
  const [integration] = await db
    .delete(integrations)
    .where(and(eq(integrations.platform, platform), eq(integrations.userId, userId)))
    .returning();
  return integration;
}
