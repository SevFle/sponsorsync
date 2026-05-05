import type { FastifyInstance, FastifyRequest, FastifyReply, RouteGenericInterface } from "fastify";
import { NotificationDispatcher } from "../services/notification-dispatcher";

export interface MilestoneCreatePayload {
  shipmentId: string;
  type: string;
  description?: string;
  location?: string;
  occurredAt?: string;
}

interface MilestoneCreateRoute extends RouteGenericInterface {
  Body: MilestoneCreatePayload;
}

const VALID_MILESTONE_TYPES = [
  "booked",
  "picked_up",
  "departed_origin",
  "in_transit",
  "arrived_port",
  "customs_cleared",
  "departed_terminal",
  "out_for_delivery",
  "delivered",
  "exception",
];

export async function milestoneRoutes(server: FastifyInstance) {
  server.get("/shipment/:shipmentId", async (request, reply) => {
    const { shipmentId } = request.params as { shipmentId: string };
    return reply.status(200).send({ success: true, data: [], shipmentId });
  });

  server.post<MilestoneCreateRoute>(
    "/",
    async (
      request: FastifyRequest<MilestoneCreateRoute>,
      reply: FastifyReply
    ) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply
          .status(401)
          .send({ success: false, error: "Authentication required" });
      }

      const payload = request.body;
      if (!payload?.shipmentId || !payload?.type) {
        return reply
          .status(400)
          .send({ success: false, error: "shipmentId and type are required" });
      }

      if (!VALID_MILESTONE_TYPES.includes(payload.type)) {
        return reply.status(400).send({
          success: false,
          error: `Invalid milestone type. Must be one of: ${VALID_MILESTONE_TYPES.join(", ")}`,
        });
      }

      const dispatcher = server.notificationDispatcher;

      let notificationResult = null;
      try {
        notificationResult = await dispatcher.dispatch({
          milestoneType: payload.type,
          tenantId,
          shipmentId: payload.shipmentId,
          shipmentData: {
            trackingId: "unknown",
            customerName: null,
            customerEmail: null,
            origin: null,
            destination: null,
          },
          tenantData: {
            name: "ShipLens",
          },
          location: payload.location ?? null,
          description: payload.description ?? null,
        });
      } catch {
        notificationResult = {
          skipped: true,
          reason: "Notification dispatch failed",
        };
      }

      return reply.status(201).send({
        success: true,
        data: {
          shipmentId: payload.shipmentId,
          type: payload.type,
          description: payload.description ?? null,
          location: payload.location ?? null,
          occurredAt: payload.occurredAt ?? new Date().toISOString(),
        },
        notification: notificationResult
          ? {
              skipped: notificationResult.skipped,
              emailSent: notificationResult.email?.success ?? false,
            }
          : null,
        message: "Milestone created",
      });
    }
  );
}
