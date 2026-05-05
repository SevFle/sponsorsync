import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db, notificationRules, notificationSettings, notifications, milestoneTypeEnum, notificationChannelEnum } from "@shiplens/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

const VALID_MILESTONE_TYPES = milestoneTypeEnum.enumValues;
const VALID_CHANNELS = notificationChannelEnum.enumValues;

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function notificationRoutes(server: FastifyInstance) {
  server.get("/rules", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ success: false, error: "Authentication required" });
    }

    try {
      const rules = await db
        .select()
        .from(notificationRules)
        .where(eq(notificationRules.tenantId, tenantId))
        .orderBy(desc(notificationRules.createdAt));

      return reply.status(200).send({ success: true, data: rules });
    } catch (err) {
      request.log.error(err, "Failed to list notification rules");
      return reply.status(500).send({ success: false, error: "Failed to retrieve notification rules" });
    }
  });

  server.post("/rules", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ success: false, error: "Authentication required" });
    }

    const body = request.body as Record<string, unknown>;
    const { milestoneType, channel, templateId, enabled } = body;

    if (!milestoneType || typeof milestoneType !== "string") {
      return reply.status(400).send({ success: false, error: "milestoneType is required" });
    }

    if (!VALID_MILESTONE_TYPES.includes(milestoneType as typeof VALID_MILESTONE_TYPES[number])) {
      return reply.status(400).send({ success: false, error: `Invalid milestoneType. Must be one of: ${VALID_MILESTONE_TYPES.join(", ")}` });
    }

    if (channel && !VALID_CHANNELS.includes(channel as typeof VALID_CHANNELS[number])) {
      return reply.status(400).send({ success: false, error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(", ")}` });
    }

    try {
      const [rule] = await db
        .insert(notificationRules)
        .values({
          tenantId,
          milestoneType: milestoneType as typeof notificationRules.$inferInsert.milestoneType,
          channel: (channel ?? "email") as typeof notificationRules.$inferInsert.channel,
          templateId: templateId as string | undefined,
          enabled: enabled !== undefined ? Boolean(enabled) : true,
        })
        .returning();

      return reply.status(201).send({ success: true, data: rule, message: "Notification rule created" });
    } catch (err) {
      request.log.error(err, "Failed to create notification rule");
      return reply.status(500).send({ success: false, error: "Failed to create notification rule" });
    }
  });

  server.patch("/rules/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ success: false, error: "Authentication required" });
    }

    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    try {
      const existing = await db
        .select()
        .from(notificationRules)
        .where(and(eq(notificationRules.id, id), eq(notificationRules.tenantId, tenantId)))
        .limit(1);

      if (existing.length === 0) {
        return reply.status(404).send({ success: false, error: "Notification rule not found" });
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (body.milestoneType !== undefined) updates.milestoneType = body.milestoneType;
      if (body.channel !== undefined) updates.channel = body.channel;
      if (body.templateId !== undefined) updates.templateId = body.templateId;
      if (body.enabled !== undefined) updates.enabled = body.enabled;

      const [updated] = await db
        .update(notificationRules)
        .set(updates)
        .where(and(eq(notificationRules.id, id), eq(notificationRules.tenantId, tenantId)))
        .returning();

      return reply.status(200).send({ success: true, data: updated });
    } catch (err) {
      request.log.error(err, "Failed to update notification rule");
      return reply.status(500).send({ success: false, error: "Failed to update notification rule" });
    }
  });

  server.delete("/rules/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ success: false, error: "Authentication required" });
    }

    const { id } = request.params as { id: string };

    try {
      const existing = await db
        .select()
        .from(notificationRules)
        .where(and(eq(notificationRules.id, id), eq(notificationRules.tenantId, tenantId)))
        .limit(1);

      if (existing.length === 0) {
        return reply.status(404).send({ success: false, error: "Notification rule not found" });
      }

      await db
        .delete(notificationRules)
        .where(and(eq(notificationRules.id, id), eq(notificationRules.tenantId, tenantId)));

      return reply.status(200).send({ success: true, message: "Notification rule deleted" });
    } catch (err) {
      request.log.error(err, "Failed to delete notification rule");
      return reply.status(500).send({ success: false, error: "Failed to delete notification rule" });
    }
  });

  server.get("/settings", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ success: false, error: "Authentication required" });
    }

    try {
      const rows = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.tenantId, tenantId))
        .limit(1);

      if (rows.length === 0) {
        return reply.status(200).send({
          success: true,
          data: {
            id: null,
            tenantId,
            emailEnabled: true,
            smsEnabled: false,
            defaultFromEmail: null,
            defaultFromPhone: null,
            replyToEmail: null,
            includeTrackingLink: true,
            trackingBaseUrl: null,
            quietHoursStart: null,
            quietHoursEnd: null,
            quietHoursTimezone: null,
            batchSize: 50,
            retryAttempts: 3,
            retryDelayMinutes: 5,
          },
        });
      }

      return reply.status(200).send({ success: true, data: rows[0] });
    } catch (err) {
      request.log.error(err, "Failed to get notification settings");
      return reply.status(500).send({ success: false, error: "Failed to retrieve notification settings" });
    }
  });

  server.patch("/settings", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ success: false, error: "Authentication required" });
    }

    const body = request.body as Record<string, unknown>;

    try {
      const existing = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.tenantId, tenantId))
        .limit(1);

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (body.emailEnabled !== undefined) updates.emailEnabled = Boolean(body.emailEnabled);
      if (body.smsEnabled !== undefined) updates.smsEnabled = Boolean(body.smsEnabled);
      if (body.defaultFromEmail !== undefined) updates.defaultFromEmail = body.defaultFromEmail;
      if (body.defaultFromPhone !== undefined) updates.defaultFromPhone = body.defaultFromPhone;
      if (body.replyToEmail !== undefined) updates.replyToEmail = body.replyToEmail;
      if (body.includeTrackingLink !== undefined) updates.includeTrackingLink = Boolean(body.includeTrackingLink);
      if (body.trackingBaseUrl !== undefined) updates.trackingBaseUrl = body.trackingBaseUrl;
      if (body.quietHoursStart !== undefined) updates.quietHoursStart = body.quietHoursStart;
      if (body.quietHoursEnd !== undefined) updates.quietHoursEnd = body.quietHoursEnd;
      if (body.quietHoursTimezone !== undefined) updates.quietHoursTimezone = body.quietHoursTimezone;
      if (body.batchSize !== undefined) updates.batchSize = Number(body.batchSize);
      if (body.retryAttempts !== undefined) updates.retryAttempts = Number(body.retryAttempts);
      if (body.retryDelayMinutes !== undefined) updates.retryDelayMinutes = Number(body.retryDelayMinutes);

      let result;
      if (existing.length > 0) {
        [result] = await db
          .update(notificationSettings)
          .set(updates)
          .where(eq(notificationSettings.tenantId, tenantId))
          .returning();
      } else {
        [result] = await db
          .insert(notificationSettings)
          .values({
            tenantId,
            ...updates,
          })
          .returning();
      }

      return reply.status(200).send({ success: true, data: result });
    } catch (err) {
      request.log.error(err, "Failed to update notification settings");
      return reply.status(500).send({ success: false, error: "Failed to update notification settings" });
    }
  });

  interface HistoryQuerystring {
    page?: string;
    pageSize?: string;
    status?: string;
    channel?: string;
    shipmentId?: string;
  }

  server.get("/history", async (
    request: FastifyRequest<{ Querystring: HistoryQuerystring }>,
    reply: FastifyReply
  ) => {
    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ success: false, error: "Authentication required" });
    }

    const {
      page: rawPage,
      pageSize: rawPageSize,
      status: rawStatus,
      channel: rawChannel,
      shipmentId: rawShipmentId,
    } = request.query;

    const page = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(rawPageSize ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
    );

    try {
      const conditions = [eq(notifications.tenantId, tenantId)];

      if (rawStatus) {
        conditions.push(eq(notifications.status, rawStatus));
      }

      if (rawChannel && VALID_CHANNELS.includes(rawChannel as typeof VALID_CHANNELS[number])) {
        conditions.push(eq(notifications.channel, rawChannel as typeof notifications.$inferInsert.channel));
      }

      if (rawShipmentId) {
        conditions.push(eq(notifications.shipmentId, rawShipmentId));
      }

      const where = and(...conditions);

      const [{ count: totalStr }] = await db
        .select({ count: sql<string>`count(*)::int` })
        .from(notifications)
        .where(where);
      const total = Number(totalStr);

      const offset = (page - 1) * pageSize;
      const data = await db
        .select()
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.createdAt))
        .limit(pageSize)
        .offset(offset);

      return reply.status(200).send({
        success: true,
        data,
        total,
        page,
        pageSize,
      });
    } catch (err) {
      request.log.error(err, "Failed to list notification history");
      return reply.status(500).send({ success: false, error: "Failed to retrieve notification history" });
    }
  });
}
