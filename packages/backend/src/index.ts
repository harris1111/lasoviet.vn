export { linkAnonymousActorToAccount } from "./identity/identity.module.js";
export type {
  AnonymousLinkErrorCode,
  AnonymousLinkResult,
} from "./identity/identity.module.js";

export {
  createAuthEmailDeliveryService,
  createDatabaseAuthEmailDeliveryStore,
} from "./notifications/auth-email.js";
export type {
  AuthEmailDeliveryOutcome,
  AuthEmailDeliveryRecord,
  AuthEmailDeliveryServiceOptions,
  AuthEmailDeliveryStore,
  NewAuthEmailDelivery,
  NotificationDeliveryStatus,
} from "./notifications/auth-email.js";
export type {
  EmailMessage,
  EmailProvider,
  EmailProviderResult,
} from "./notifications/email-provider.js";
export { createSmtpEmailAdapter } from "./notifications/smtp-email-adapter.js";
export type { SmtpEmailSettings } from "./notifications/smtp-email-adapter.js";

export {
  createDatabaseConsentRepository,
} from "./consent/consent.repository.js";
export type {
  ConsentRepository,
  RecordConsentInput,
} from "./consent/consent.repository.js";
export { createConsentService } from "./consent/consent.service.js";
export type {
  ConsentDocumentVersions,
  ConsentErrorCode,
  ConsentServiceOptions,
} from "./consent/consent.service.js";

export {
  createDatabaseDeletionRepository,
} from "./privacy/deletion.repository.js";
export type {
  DeletionRepository,
  DeletionRepositoryError,
  DeletionRequestInput,
} from "./privacy/deletion.repository.js";
export { createAccountDeletionService } from "./privacy/deletion.service.js";
export type { AccountDeletionServiceOptions } from "./privacy/deletion.service.js";

export {
  createDatabaseAnonymousRetentionRepository,
} from "./privacy/anonymous-retention.repository.js";
export {
  createAnonymousRetentionService,
} from "./privacy/anonymous-retention.service.js";
export type {
  AnonymousRetentionError,
  AnonymousRetentionRepository,
} from "./privacy/anonymous-retention.service.js";

export {
  createDatabaseBirthProfileRepository,
} from "./birth-profile/birth-profile.repository.js";
export type {
  BirthProfileRecord,
  BirthProfileRepository,
  BirthProfileWriteInput,
} from "./birth-profile/birth-profile.repository.js";
export {
  createBirthProfileService,
  normalizeBirthProfile,
  resolveZiweiTimeIndex,
} from "./birth-profile/birth-profile.service.js";

export {
  createPhaseOneMaintenanceRunner,
} from "./maintenance/phase-one-maintenance.js";
export type {
  PhaseOneMaintenanceRunner,
} from "./maintenance/phase-one-maintenance.js";
export type {
  BirthProfileNormalizationError,
  BirthProfileServiceError,
  BirthProfileServiceOptions,
  TimePrecisionError,
} from "./birth-profile/birth-profile.service.js";

export {
  createDatabaseZiweiCalculationRepository,
} from "./ziwei/ziwei.repository.js";
export type {
  AuthorizedZiweiRevision,
  CreateZiweiCalculationInput,
  ZiweiCalculationRepository,
} from "./ziwei/ziwei.repository.js";
export {
  createZiweiCalculationService,
} from "./ziwei/ziwei.service.js";
export type {
  ZiweiCalculationError,
  ZiweiCalculationServiceOptions,
} from "./ziwei/ziwei.service.js";
export {
  createDatabaseZiweiQueryRepository,
} from "./ziwei/ziwei-query.repository.js";
export type {
  AuthorizedZiweiChartRecord,
  ZiweiQueryRepository,
} from "./ziwei/ziwei-query.repository.js";
export {
  createZiweiQueryService,
  ZiweiQueryDataError,
} from "./ziwei/ziwei-query.service.js";
export type {
  ZiweiQueryError,
  ZiweiQueryServiceOptions,
} from "./ziwei/ziwei-query.service.js";
export { getCapability, listCapabilities } from "./capabilities/capability.registry.js";
export { createEvidenceService } from "./evidence/evidence.service.js";
export { buildZiweiIdentityEvidence } from "./evidence/ziwei-identity-rules.js";
export type { EvidenceServiceError } from "./evidence/evidence.service.js";
export type { ZiweiIdentityEvidenceError } from "./evidence/ziwei-identity-rules.js";
export {
  createAnalyticsService,
} from "./analytics/analytics.service.js";
export type {
  AnalyticsService,
  AnalyticsSink,
} from "./analytics/analytics.service.js";
export {
  buildFreeIdentityPreview,
} from "./reports/free-identity-preview.js";
export type {
  FreeIdentityPreviewError,
  FreeIdentityPreviewInput,
} from "./reports/free-identity-preview.js";
export {
  createAiProductionGate,
} from "./ai/ai-provider.js";
export type {
  AiProvider,
  AiProviderError,
  AiProviderErrorCode,
  AiProductionGate,
  AiRequestUse,
  GenerateStructuredRequest,
} from "./ai/ai-provider.js";
export { createOpenAiCompatibleAdapter } from "./ai/openai-compatible-adapter.js";
export type { OpenAiCompatibleAdapterOptions } from "./ai/openai-compatible-adapter.js";
export { runAiCapabilityProbe } from "./ai/capability-probe.js";
export type { AiCapabilityResult } from "./ai/capability-probe.js";
export {
  createAdminAccessService,
  createDatabaseAdminAccessRepository,
} from "./admin-access/capability.service.js";
export type {
  AdminAccessError,
  AdminAccessRepository,
} from "./admin-access/capability.service.js";
export {
  createAdminAuditService,
  createDatabaseAdminAuditRepository,
} from "./admin-access/audit.service.js";
export type {
  AdminAuditEntry,
  AdminAuditRepository,
} from "./admin-access/audit.service.js";
export {
  createRoleAssignmentService,
} from "./admin-access/role-assignment.service.js";
export type {
  RoleAssignmentError,
  RoleAssignmentRepository,
  RoleMutation,
} from "./admin-access/role-assignment.service.js";
export {
  createDatabaseRoleAssignmentRepository,
} from "./admin-access/role-assignment.repository.js";
export {
  createAuditQueryService,
} from "./admin-access/audit-query.service.js";
export type { AuditQueryRepository } from "./admin-access/audit-query.service.js";
export {
  createDatabaseAuditQueryRepository,
} from "./admin-access/audit-query.repository.js";
export {
  createAdminHealthService,
  createDatabaseAdminHealthService,
} from "./admin-overview/admin-health.service.js";
export type { AdminHealthDependencies, AdminHealthProbe } from "./admin-overview/admin-health.service.js";
export {
  createAdminOverviewService,
} from "./admin-overview/admin-overview.service.js";
export type {
  AdminHealthReader,
  AdminOverviewError,
  AdminOverviewRepository,
} from "./admin-overview/admin-overview.service.js";
export {
  createDatabaseAdminOverviewRepository,
} from "./admin-overview/admin-overview.repository.js";
export { identityReportOutline } from "./reports/identity-report-outline.js";
export { buildFrozenIdentityReportFacts } from "./reports/frozen-identity-report-facts.js";
export type {
  FrozenIdentityReportFactsError,
} from "./reports/frozen-identity-report-facts.js";
export { writeIdentityReportDraft } from "./reports/identity-report-writer.js";
export type {
  IdentityReportWriterInput,
} from "./reports/identity-report-writer.js";
export type {
  ApprovedKnowledgePassage,
  IdentityReportSource,
} from "./reports/report-source.js";
export { validateIdentityReport } from "./reports/report-validator.js";
export type {
  ReportValidationFinding,
  ReportValidationResult,
} from "./reports/report-validator.js";
export { critiqueIdentityReport } from "./reports/report-critic.js";

export { PRODUCT_CATALOG, createOrderService } from "./commerce/order.service.js";
export { createSePayGateway } from "./commerce/sepay-adapter.js";
export { createSePayWebhookService } from "./commerce/sepay-webhook.service.js";
export { createDatabaseCommerceRepository } from "./commerce/commerce.repository.js";
export { createDatabaseOutboxStore, createOutboxDispatcher } from "./outbox/outbox.dispatcher.js";
export type { ClaimedOutboxEvent, OutboxDispatcherDependencies } from "./outbox/outbox.dispatcher.js";
export type { PaymentProvider, CheckoutOrder, HostedCheckout } from "./commerce/payment-provider.js";
