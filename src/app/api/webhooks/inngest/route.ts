import { serve } from "inngest/next";
import {
  inngest,
  deadlineReminderFunction,
  deliverableVerificationFunction,
  paymentFollowUpFunction,
  statusTransitionFunction,
} from "@/lib/inngest/client";

const handler = serve({
  client: inngest,
  functions: [
    deadlineReminderFunction,
    deliverableVerificationFunction,
    paymentFollowUpFunction,
    statusTransitionFunction,
  ],
} as unknown as Parameters<typeof serve>[0]);

export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;
