import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  db,
  corridorMilestoneTemplates,
  tenantCorridorConfigs,
} from "@shiplens/db";
import { eq, and, asc, sql, inArray } from "drizzle-orm";

const VALID_CORRIDOR_TYPES = ["fcl", "ltl", "drayage"] as const;
type CorridorType = (typeof VALID_CORRIDOR_TYPES)[number];

interface CorridorTypeParam {
  corridorType: string;
}

interface TemplateIdParam {
  templateId: string;
}

interface CreateTemplateBody {
  corridorType: string;
  milestoneKey: string;
  milestoneLabel: string;
  description?: string;
  milestoneOrder: number;
  defaultNotificationEnabled?: boolean;
  estimatedDurationHours?: number | null;
}

interface UpdateTemplateBody {
  milestoneLabel?: string;
  description?: string;
  milestoneOrder?: number;
  defaultNotificationEnabled?: boolean;
  estimatedDurationHours?: number | null;
}

interface AssignConfigBody {
  corridorType: string;
  milestoneTemplateIds: string[];
  notificationEnabled?: boolean;
}

interface UpdateConfigBody {
  notificationEnabled?: boolean;
  isActive?: boolean;
}

interface ConfigIdParam {
  configId: string;
}

export async function corridorMilestoneTemplateRoutes(
  server: FastifyInstance
) {
  server.get(
    "/templates",
    async (
      request: FastifyRequest<{ Querystring: { corridorType?: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply
          .status(401)
          .send({ success: false, error: "Authentication required" });
      }

      const { corridorType } = request.query;

      try {
        let query = db
          .select()
          .from(corridorMilestoneTemplates)
          .orderBy(asc(corridorMilestoneTemplates.milestoneOrder))
          .$dynamic();

        if (
          corridorType &&
          VALID_CORRIDOR_TYPES.includes(corridorType)
        ) {
          query = query.where(
            eq(corridorMilestoneTemplates.corridorType, corridorType as CorridorType)
          );
        }

        const templates = await query;

        return reply.status(200).send({
          success: true,
          data: templates.map((t) => ({
            id: t.id,
            corridorType: t.corridorType,
            milestoneKey: t.milestoneKey,
            milestoneLabel: t.milestoneLabel,
            description: t.description,
            milestoneOrder: t.milestoneOrder,
            defaultNotificationEnabled: t.defaultNotificationEnabled,
            estimatedDurationHours: t.estimatedDurationHours,
            createdAt: t.createdAt.toISOString(),
          })),
        });
      } catch (err) {
        request.log.error(err, "Failed to list milestone templates");
        return reply.status(500).send({
          success: false,
          error: "Failed to retrieve milestone templates",
        });
      }
    }
  );

  server.get(
    "/templates/:templateId",
    async (
      request: FastifyRequest<{ Params: TemplateIdParam }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply
          .status(401)
          .send({ success: false, error: "Authentication required" });
      }

      const { templateId } = request.params;

      try {
        const [template] = await db
          .select()
          .from(corridorMilestoneTemplates)
          .where(eq(corridorMilestoneTemplates.id, templateId))
          .limit(1);

        if (!template) {
          return reply
            .status(404)
            .send({ success: false, error: "Template not found" });
        }

        return reply.status(200).send({
          success: true,
          data: {
            id: template.id,
            corridorType: template.corridorType,
            milestoneKey: template.milestoneKey,
            milestoneLabel: template.milestoneLabel,
            description: template.description,
            milestoneOrder: template.milestoneOrder,
            defaultNotificationEnabled: template.defaultNotificationEnabled,
            estimatedDurationHours: template.estimatedDurationHours,
            createdAt: template.createdAt.toISOString(),
          },
        });
      } catch (err) {
        request.log.error(err, "Failed to get milestone template");
        return reply.status(500).send({
          success: false,
          error: "Failed to retrieve milestone template",
        });
      }
    }
  );

  server.post(
    "/templates",
    async (
      request: FastifyRequest<{ Body: CreateTemplateBody }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply
          .status(401)
          .send({ success: false, error: "Authentication required" });
      }

      const body = request.body;
      if (!body || !body.corridorType || !body.milestoneKey || !body.milestoneLabel || body.milestoneOrder == null) {
        return reply.status(400).send({
          success: false,
          error:
            "Missing required fields: corridorType, milestoneKey, milestoneLabel, milestoneOrder",
        });
      }

      if (!VALID_CORRIDOR_TYPES.includes(body.corridorType)) {
        return reply.status(400).send({
          success: false,
          error: `Invalid corridorType. Must be one of: ${VALID_CORRIDOR_TYPES.join(", ")}`,
        });
      }

      try {
        const [created] = await db
          .insert(corridorMilestoneTemplates)
          .values({
            corridorType: body.corridorType as "fcl" | "ltl" | "drayage",
            milestoneKey: body.milestoneKey,
            milestoneLabel: body.milestoneLabel,
            description: body.description,
            milestoneOrder: body.milestoneOrder,
            defaultNotificationEnabled: body.defaultNotificationEnabled ?? true,
            estimatedDurationHours: body.estimatedDurationHours ?? null,
          })
          .returning();

        return reply.status(201).send({
          success: true,
          data: {
            id: created.id,
            corridorType: created.corridorType,
            milestoneKey: created.milestoneKey,
            milestoneLabel: created.milestoneLabel,
            description: created.description,
            milestoneOrder: created.milestoneOrder,
            defaultNotificationEnabled: created.defaultNotificationEnabled,
            estimatedDurationHours: created.estimatedDurationHours,
            createdAt: created.createdAt.toISOString(),
          },
        });
      } catch (err) {
        request.log.error(err, "Failed to create milestone template");
        return reply.status(500).send({
          success: false,
          error: "Failed to create milestone template",
        });
      }
    }
  );

  server.put(
    "/templates/:templateId",
    async (
      request: FastifyRequest<{
        Params: TemplateIdParam;
        Body: UpdateTemplateBody;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply
          .status(401)
          .send({ success: false, error: "Authentication required" });
      }

      const { templateId } = request.params;
      const body = request.body;
      if (!body || Object.keys(body).length === 0) {
        return reply
          .status(400)
          .send({ success: false, error: "No fields provided for update" });
      }

      try {
        const existing = await db
          .select()
          .from(corridorMilestoneTemplates)
          .where(eq(corridorMilestoneTemplates.id, templateId))
          .limit(1);

        if (existing.length === 0) {
          return reply
            .status(404)
            .send({ success: false, error: "Template not found" });
        }

        const updateData: Record<string, unknown> = {};
        if (body.milestoneLabel !== undefined)
          updateData.milestoneLabel = body.milestoneLabel;
        if (body.description !== undefined)
          updateData.description = body.description;
        if (body.milestoneOrder !== undefined)
          updateData.milestoneOrder = body.milestoneOrder;
        if (body.defaultNotificationEnabled !== undefined)
          updateData.defaultNotificationEnabled =
            body.defaultNotificationEnabled;
        if (body.estimatedDurationHours !== undefined)
          updateData.estimatedDurationHours = body.estimatedDurationHours;

        const [updated] = await db
          .update(corridorMilestoneTemplates)
          .set(updateData)
          .where(eq(corridorMilestoneTemplates.id, templateId))
          .returning();

        return reply.status(200).send({
          success: true,
          data: {
            id: updated.id,
            corridorType: updated.corridorType,
            milestoneKey: updated.milestoneKey,
            milestoneLabel: updated.milestoneLabel,
            description: updated.description,
            milestoneOrder: updated.milestoneOrder,
            defaultNotificationEnabled: updated.defaultNotificationEnabled,
            estimatedDurationHours: updated.estimatedDurationHours,
            createdAt: updated.createdAt.toISOString(),
          },
        });
      } catch (err) {
        request.log.error(err, "Failed to update milestone template");
        return reply.status(500).send({
          success: false,
          error: "Failed to update milestone template",
        });
      }
    }
  );

  server.delete(
    "/templates/:templateId",
    async (
      request: FastifyRequest<{ Params: TemplateIdParam }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply
          .status(401)
          .send({ success: false, error: "Authentication required" });
      }

      const { templateId } = request.params;

      try {
        const deleted = await db
          .delete(corridorMilestoneTemplates)
          .where(eq(corridorMilestoneTemplates.id, templateId))
          .returning();

        if (deleted.length === 0) {
          return reply
            .status(404)
            .send({ success: false, error: "Template not found" });
        }

        return reply
          .status(200)
          .send({ success: true, message: "Template deleted" });
      } catch (err) {
        request.log.error(err, "Failed to delete milestone template");
        return reply.status(500).send({
          success: false,
          error: "Failed to delete milestone template",
        });
      }
    }
  );

  server.get(
    "/corridor/:corridorType/milestones",
    async (
      request: FastifyRequest<{ Params: CorridorTypeParam }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply
          .status(401)
          .send({ success: false, error: "Authentication required" });
      }

      const { corridorType } = request.params;
      if (!VALID_CORRIDOR_TYPES.includes(corridorType)) {
        return reply.status(400).send({
          success: false,
          error: `Invalid corridorType. Must be one of: ${VALID_CORRIDOR_TYPES.join(", ")}`,
        });
      }

      try {
        const templates = await db
          .select()
          .from(corridorMilestoneTemplates)
          .where(
            eq(
              corridorMilestoneTemplates.corridorType,
              corridorType as "fcl" | "ltl" | "drayage"
            )
          )
          .orderBy(asc(corridorMilestoneTemplates.milestoneOrder));

        const configs = await db
          .select()
          .from(tenantCorridorConfigs)
          .where(
            and(
              eq(tenantCorridorConfigs.tenantId, tenantId),
              eq(
                tenantCorridorConfigs.corridorType,
                corridorType as "fcl" | "ltl" | "drayage"
              ),
              eq(tenantCorridorConfigs.isActive, true)
            )
          );

        const configMap = new Map(
          configs.map((c) => [c.milestoneTemplateId, c])
        );

        const data = templates.map((t) => {
          const config = configMap.get(t.id);
          return {
            id: t.id,
            corridorType: t.corridorType,
            milestoneKey: t.milestoneKey,
            milestoneLabel: t.milestoneLabel,
            description: t.description,
            milestoneOrder: t.milestoneOrder,
            defaultNotificationEnabled: t.defaultNotificationEnabled,
            estimatedDurationHours: t.estimatedDurationHours,
            notificationEnabled: config
              ? config.notificationEnabled
              : t.defaultNotificationEnabled,
            tenantConfigured: !!config,
            createdAt: t.createdAt.toISOString(),
          };
        });

        return reply.status(200).send({
          success: true,
          data,
          corridorType,
        });
      } catch (err) {
        request.log.error(
          err,
          "Failed to get corridor milestones with tenant config"
        );
        return reply.status(500).send({
          success: false,
          error: "Failed to retrieve corridor milestones",
        });
      }
    }
  );

  server.post(
    "/configs/assign",
    async (
      request: FastifyRequest<{ Body: AssignConfigBody }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply
          .status(401)
          .send({ success: false, error: "Authentication required" });
      }

      const body = request.body;
      if (
        !body ||
        !body.corridorType ||
        !body.milestoneTemplateIds ||
        !Array.isArray(body.milestoneTemplateIds) ||
        body.milestoneTemplateIds.length === 0
      ) {
        return reply.status(400).send({
          success: false,
          error:
            "Missing required fields: corridorType, milestoneTemplateIds (non-empty array)",
        });
      }

      if (!VALID_CORRIDOR_TYPES.includes(body.corridorType)) {
        return reply.status(400).send({
          success: false,
          error: `Invalid corridorType. Must be one of: ${VALID_CORRIDOR_TYPES.join(", ")}`,
        });
      }

      try {
        const templates = await db
          .select()
          .from(corridorMilestoneTemplates)
          .where(
            and(
              inArray(
                corridorMilestoneTemplates.id,
                body.milestoneTemplateIds
              ),
              eq(
                corridorMilestoneTemplates.corridorType,
                body.corridorType as "fcl" | "ltl" | "drayage"
              )
            )
          );

        if (templates.length !== body.milestoneTemplateIds.length) {
          return reply.status(400).send({
            success: false,
            error:
              "One or more template IDs not found or do not match the specified corridorType",
          });
        }

        const values = templates.map((t) => ({
          tenantId,
          corridorType: body.corridorType as "fcl" | "ltl" | "drayage",
          milestoneTemplateId: t.id,
          notificationEnabled:
            body.notificationEnabled ?? t.defaultNotificationEnabled,
          isActive: true,
        }));

        const configs = await db
          .insert(tenantCorridorConfigs)
          .values(values)
          .onConflictDoNothing()
          .returning();

        return reply.status(201).send({
          success: true,
          data: configs.map((c) => ({
            id: c.id,
            tenantId: c.tenantId,
            corridorType: c.corridorType,
            milestoneTemplateId: c.milestoneTemplateId,
            notificationEnabled: c.notificationEnabled,
            isActive: c.isActive,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
          })),
        });
      } catch (err) {
        request.log.error(err, "Failed to assign milestone templates");
        return reply.status(500).send({
          success: false,
          error: "Failed to assign milestone templates to tenant",
        });
      }
    }
  );

  server.get(
    "/configs",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply
          .status(401)
          .send({ success: false, error: "Authentication required" });
      }

      try {
        const configs = await db
          .select({
            config: tenantCorridorConfigs,
            template: corridorMilestoneTemplates,
          })
          .from(tenantCorridorConfigs)
          .innerJoin(
            corridorMilestoneTemplates,
            eq(
              tenantCorridorConfigs.milestoneTemplateId,
              corridorMilestoneTemplates.id
            )
          )
          .where(eq(tenantCorridorConfigs.tenantId, tenantId))
          .orderBy(asc(corridorMilestoneTemplates.corridorType), asc(corridorMilestoneTemplates.milestoneOrder));

        const data = configs.map(({ config, template }) => ({
          id: config.id,
          tenantId: config.tenantId,
          corridorType: config.corridorType,
          milestoneTemplateId: config.milestoneTemplateId,
          notificationEnabled: config.notificationEnabled,
          isActive: config.isActive,
          milestoneKey: template.milestoneKey,
          milestoneLabel: template.milestoneLabel,
          milestoneOrder: template.milestoneOrder,
          createdAt: config.createdAt.toISOString(),
          updatedAt: config.updatedAt.toISOString(),
        }));

        return reply.status(200).send({ success: true, data });
      } catch (err) {
        request.log.error(err, "Failed to list tenant configs");
        return reply.status(500).send({
          success: false,
          error: "Failed to retrieve tenant corridor configurations",
        });
      }
    }
  );

  server.put(
    "/configs/:configId",
    async (
      request: FastifyRequest<{
        Params: ConfigIdParam;
        Body: UpdateConfigBody;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply
          .status(401)
          .send({ success: false, error: "Authentication required" });
      }

      const { configId } = request.params;
      const body = request.body;
      if (!body || Object.keys(body).length === 0) {
        return reply
          .status(400)
          .send({ success: false, error: "No fields provided for update" });
      }

      try {
        const existing = await db
          .select()
          .from(tenantCorridorConfigs)
          .where(
            and(
              eq(tenantCorridorConfigs.id, configId),
              eq(tenantCorridorConfigs.tenantId, tenantId)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          return reply
            .status(404)
            .send({ success: false, error: "Configuration not found" });
        }

        const updateData: Record<string, unknown> = {};
        if (body.notificationEnabled !== undefined)
          updateData.notificationEnabled = body.notificationEnabled;
        if (body.isActive !== undefined) updateData.isActive = body.isActive;

        const [updated] = await db
          .update(tenantCorridorConfigs)
          .set(updateData)
          .where(
            and(
              eq(tenantCorridorConfigs.id, configId),
              eq(tenantCorridorConfigs.tenantId, tenantId)
            )
          )
          .returning();

        return reply.status(200).send({
          success: true,
          data: {
            id: updated.id,
            tenantId: updated.tenantId,
            corridorType: updated.corridorType,
            milestoneTemplateId: updated.milestoneTemplateId,
            notificationEnabled: updated.notificationEnabled,
            isActive: updated.isActive,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
          },
        });
      } catch (err) {
        request.log.error(err, "Failed to update tenant config");
        return reply.status(500).send({
          success: false,
          error: "Failed to update tenant corridor configuration",
        });
      }
    }
  );

  server.delete(
    "/configs/:configId",
    async (
      request: FastifyRequest<{ Params: ConfigIdParam }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply
          .status(401)
          .send({ success: false, error: "Authentication required" });
      }

      const { configId } = request.params;

      try {
        const deleted = await db
          .delete(tenantCorridorConfigs)
          .where(
            and(
              eq(tenantCorridorConfigs.id, configId),
              eq(tenantCorridorConfigs.tenantId, tenantId)
            )
          )
          .returning();

        if (deleted.length === 0) {
          return reply
            .status(404)
            .send({ success: false, error: "Configuration not found" });
        }

        return reply
          .status(200)
          .send({ success: true, message: "Configuration removed" });
      } catch (err) {
        request.log.error(err, "Failed to delete tenant config");
        return reply.status(500).send({
          success: false,
          error: "Failed to delete tenant corridor configuration",
        });
      }
    }
  );
}
