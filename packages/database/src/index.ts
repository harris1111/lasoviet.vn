export { createDatabase } from "./client.js";
export type { Database } from "./client.js";

export { MigrationError, runMigrations } from "./migrate.js";
export type { MigrationResult } from "./migrate.js";

export {
  authAccounts,
  authAnonymousActors,
  authSessions,
  authUsers,
  authVerifications,
} from "./schema/auth.js";
export {
  auditLogs,
} from "./schema/audit.js";
export {
  adminAuditLogs,
  adminCapabilityPolicies,
  adminRoleAssignments,
} from "./schema/admin-access.js";
export {
  notificationDeliveries,
  notificationDeliveryKind,
  notificationDeliveryStatus,
} from "./schema/notifications.js";
export {
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  ziweiChartVersions,
  ziweiCharts,
} from "./schema/birth-profile.js";
export { evidenceItems, evidenceSets } from "./schema/evidence.js";
export {
  deletionRequestStatus,
  deletionRequests,
  consents,
} from "./schema/privacy.js";
export {
  OutboxError,
  enqueueOutbox,
  outbox,
  outboxStatus,
} from "./schema/outbox.js";
export type { WorkflowEnvelopeV1 } from "./schema/outbox.js";
