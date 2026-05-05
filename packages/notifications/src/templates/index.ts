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
export { TEMPLATE_NAMES, MILESTONE_DISPLAY_NAMES } from "./types";
export type { ShipmentEmailData, TenantBranding, EmailContent, TemplateName } from "./types";

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
import type { ShipmentEmailData, TenantBranding, EmailContent, TemplateName } from "./types";

type TemplateFn = (data: ShipmentEmailData, branding?: TenantBranding) => EmailContent;

const templates: Record<string, TemplateFn> = {
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

export function getTemplate(name: TemplateName | string): TemplateFn {
  const template = templates[name];
  if (!template) {
    throw new Error(`Unknown template: ${name}`);
  }
  return template;
}
