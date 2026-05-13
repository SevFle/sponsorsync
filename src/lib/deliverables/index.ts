export type {
  DeliverableType,
  VerificationStatus,
  VerificationCheck,
  DeliverableVerificationReport,
  VerificationRule,
  VerificationContext,
  BulkVerificationResult,
} from "./types";

export { inferDeliverableType } from "./types";

export {
  adReadRules,
  linkPlacementRules,
  socialMentionRules,
  getRulesForType,
  getAllRules,
} from "./rules";

export {
  verifyDeliverable,
  verifyBulkDeliverables,
  computeDeadlineStatus,
} from "./engine";

export type { DeliverableRow } from "./engine";
