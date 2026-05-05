export { bookedTemplate } from "./booked";
export { pickedUpTemplate } from "./picked-up";
export { departedOriginTemplate } from "./departed-origin";
export { inTransitTemplate } from "./in-transit";
export { arrivedPortTemplate } from "./arrived-port";
export { customsClearedTemplate } from "./customs-cleared";
export { departedTerminalTemplate } from "./departed-terminal";
export { outForDeliveryTemplate } from "./out-for-delivery";
export { deliveredTemplate } from "./delivered";
export { exceptionTemplate } from "./exception";

import { bookedTemplate } from "./booked";
import { pickedUpTemplate } from "./picked-up";
import { departedOriginTemplate } from "./departed-origin";
import { inTransitTemplate } from "./in-transit";
import { arrivedPortTemplate } from "./arrived-port";
import { customsClearedTemplate } from "./customs-cleared";
import { departedTerminalTemplate } from "./departed-terminal";
import { outForDeliveryTemplate } from "./out-for-delivery";
import { deliveredTemplate } from "./delivered";
import { exceptionTemplate } from "./exception";
import type { EmailTemplate, ShipmentEmailData, TemplateName } from "./types";
export type { EmailTemplate, ShipmentEmailData, TemplateName, EmailResult, SmsResult, SmsTemplateData, MilestoneType } from "./types";
export { TEMPLATE_NAMES, MILESTONE_DISPLAY_NAMES } from "./types";

type TemplateFn = (data: ShipmentEmailData) => EmailTemplate;

const templates: Record<TemplateName, TemplateFn> = {
  booked: bookedTemplate,
  picked_up: pickedUpTemplate,
  departed_origin: departedOriginTemplate,
  in_transit: inTransitTemplate,
  arrived_port: arrivedPortTemplate,
  customs_cleared: customsClearedTemplate,
  departed_terminal: departedTerminalTemplate,
  out_for_delivery: outForDeliveryTemplate,
  delivered: deliveredTemplate,
  exception: exceptionTemplate,
};

export function getTemplate(name: TemplateName): TemplateFn {
  const template = templates[name];
  if (!template) {
    throw new Error(`Unknown template: ${name}`);
  }
  return template;
}
