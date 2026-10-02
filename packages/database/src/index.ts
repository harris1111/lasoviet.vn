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
  adminReportRecoveryReceipts,
  adminRoleAssignments,
  adminRoleMutationRequests,
} from "./schema/admin-access.js";
export {
  notificationDeliveries,
  notificationDeliveryKind,
  notificationDeliveryStatus,
  notificationPreferences,
} from "./schema/notifications.js";
export {
  birthProfileReadingContextMutationReceipts,
  birthProfileReadingContextRevisions,
  birthProfileReadingContexts,
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  ziweiChartVersions,
  ziweiCharts,
} from "./schema/birth-profile.js";
export { evidenceItems, evidenceSets } from "./schema/evidence.js";
export {
  commerceEntitlements,
  commerceOrderStatus,
  commerceOrders,
  commerceAlertDeliveries,
  commercePaymentEvents,
  commerceReconciliationState,
  commerceUnmatchedPayments,
} from "./schema/commerce.js";
export {
  walletTopUpContinuations,
  dailyReadingUnlocks,
  walletAccounts,
  walletCommandReceipts,
  walletCreditLots,
  walletLedgerEntries,
  walletPurchaseIntents,
  walletRestorationAllocations,
  walletSpendAllocations,
  walletTransactions,
} from "./schema/wallet-commerce.js";
export {
  generatedPreviewRequests,
  generatedPreviewSections,
} from "./schema/generated-preview.js";
export {
  reportEntitlementLinks,
  reportGenerationAttempts,
  reportQueueJobs,
  reportReservations,
  reportSectionCheckpoints,
  reportSectionCheckpointRevisions,
  reportSectionQualityCandidates,
  reportSourceSnapshots,
  reportVersions,
} from "./schema/reports.js";
export { reportAssets } from "./schema/assets.js";
export { supportCases } from "./schema/support-cases.js";
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

export {
  knowledgeChunks,
  knowledgeChunkProvenanceEdges,
  knowledgeDocuments,
} from "./schema/knowledge.js";

export {
  aiModelPricing,
  aiCallAttempts,
  aiUsageOutcomes,
} from "./schema/ai-cost.js";
export {
  accountBehaviorProfiles,
  analyticsEvents,
  analyticsFraudIpRecords,
  analyticsVisitors,
} from "./schema/analytics.js";

export {
  partFeedbacks,
  guaranteeClaims,
} from "./schema/feedback-guarantee.js";

export { notificationVerifiedSignins } from "./schema/notifications.js";
export * from "./schema/membership.js";

export * from "./schema/free-ai.js";
