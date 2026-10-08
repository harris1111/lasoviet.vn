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
  createDatabaseNotificationPreferenceStore,
  fingerprintEmail,
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
} from "./notifications/notification-preference.js";
export type { NotificationPreferenceStore } from "./notifications/notification-preference.js";

export {
  PALACE_TITLES_EN,
  PALACE_TITLES_VI,
  createVerifiedSignInNurtureService,
} from "./notifications/nurture-signin.service.js";
export type {
  NurtureScanResult,
  VerifiedSignInNurtureService,
  VerifiedSignInNurtureServiceOptions,
} from "./notifications/nurture-signin.service.js";

export { computeEngineHanMonths, type ComputedHanMonth } from "./notifications/han-month-reminder.js";

export {
  createDatabaseConsentRepository,
} from "./consent/consent.repository.js";
export type {
  ConsentRecordResult,
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
  BirthProfileWithContextWriteInput,
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
  ReconciliationMaintenance,
} from "./maintenance/phase-one-maintenance.js";
export type {
  BirthProfileNormalizationError,
  BirthProfileServiceError,
  BirthProfileServiceOptions,
  TimePrecisionError,
} from "./birth-profile/birth-profile.service.js";
export {
  createDatabaseReadingContextRepository,
} from "./birth-profile/reading-context.repository.js";
export type {
  MutationReceiptRecord,
  ReadingContextCurrentRecord,
  ReadingContextMutationOperation,
  ReadingContextRepository,
  ReadingContextRepositoryError,
  ReadingContextRevisionRecord,
} from "./birth-profile/reading-context.repository.js";
export {
  createReadingContextService,
} from "./birth-profile/reading-context.service.js";
export type {
  ReadingContextService,
  ReadingContextServiceError,
  ReadingContextServiceOptions,
} from "./birth-profile/reading-context.service.js";

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
  AnalyticsExportErrorCode,
  AnalyticsIngestErrorCode,
  AnalyticsService,
  AnalyticsServiceOptions,
  IngestAnalyticsEventInput,
} from "./analytics/analytics.service.js";
export {
  createDatabaseAnalyticsRepository,
} from "./analytics/analytics.repository.js";
export type {
  AccountBehaviorProfileRecord,
  AnalyticsEventRecord,
  AnalyticsFraudIpRecord,
  AnalyticsRepository,
  AnalyticsVisitorRecord,
  AssociateProfileResult,
  IngestEventRecordInput,
  LinkVisitorResult,
  RecordConsentResult,
  RecordEventResult,
  UpdateInterestTopicsResult,
} from "./analytics/analytics.repository.js";
export {
  createAnalyticsRetentionService,
} from "./analytics/analytics-retention.service.js";
export type {
  AnalyticsRetentionService,
  AnalyticsRetentionSummary,
} from "./analytics/analytics-retention.service.js";
export {
  isForbiddenExportKey,
  projectEventForThirdParty,
  projectEventsForAccountExport,
} from "./analytics/analytics-export.js";
export type {
  ProjectThirdPartyResult,
  ThirdPartyExportEvent,
} from "./analytics/analytics-export.js";
export {
  APPROVED_INTEREST_TOPIC_CODES,
  computeBehaviorProfileUpdateFromEvent,
  isApprovedInterestTopic,
  toAccountBehaviorProfileV1,
} from "./analytics/account-behavior-profile.js";
export type {
  ApprovedInterestTopicCode,
  BehaviorProfileUpdate,
  ExistingBehaviorProfile,
} from "./analytics/account-behavior-profile.js";
export {
  buildFreeIdentityPreview,
  buildGuardedFreeIdentityPreview,
  checkPreviewBudgetPreflight,
  PREVIEW_GUARD_LIMITS,
} from "./reports/free-identity-preview.js";
export type {
  FreeIdentityPreviewError,
  FreeIdentityPreviewInput,
  GuardedPreviewInput,
  PreviewPreflightResult,
  PreviewPreflightReservation,
  PreviewBudgetUsage,
} from "./reports/free-identity-preview.js";
export {
  createAiProductionGate,
  resolveRequestPurpose,
} from "./ai/ai-provider.js";
export type {
  AiProvider,
  AiProviderError,
  AiProviderErrorCode,
  AiProductionGate,
  AiRequestUse,
  AiStructuredOutputValue,
  GenerateStructuredRequest,
} from "./ai/ai-provider.js";
export {
  createOpenAiCompatibleAdapter,
  resolveOpenAiCompatibleProviderId,
} from "./ai/openai-compatible-adapter.js";
export type { OpenAiCompatibleAdapterOptions } from "./ai/openai-compatible-adapter.js";
export { runAiCapabilityProbe } from "./ai/capability-probe.js";
export type { AiCapabilityResult } from "./ai/capability-probe.js";
export {
  calculateTokenCostVnd,
  toSafeInteger,
  calculateTokenCostMicroVnd,
  calculateContributionMargin,
  createDatabaseAiCostService,
  createInMemoryAiCostService,
} from "./ai/ai-cost.js";
export type {
  AiCostRecorder,
  AiCostService,
  CalculateCostInput,
  BeginAttemptInput,
  BeginAttemptResult,
  CompleteAttemptInput,
  CompleteAttemptResult,
} from "./ai/ai-cost.js";
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
  createReportRecoveryService,
} from "./admin-access/report-recovery.service.js";
export type {
  ReportRecoveryCommand,
  ReportRecoveryError,
  ReportRecoveryRepository,
} from "./admin-access/report-recovery.service.js";
export {
  createDatabaseReportRecoveryRepository,
} from "./admin-access/report-recovery.repository.js";
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
export {
  REPORT_KNOWLEDGE_VERSION_V1,
  REPORT_KNOWLEDGE_VERSION_V2,
  REPORT_PROMPT_VERSION_V1,
  REPORT_PROMPT_VERSION_V2,
  REPORT_CONFIG_VERSION_V1,
  REPORT_TEMPLATE_VERSION_V1,
  REPORT_RENDER_VERSION_V1,
  REPORT_KNOWLEDGE_VERSION_V3,
  REPORT_PROMPT_VERSION_V3,
  REPORT_CONFIG_VERSION_V3,
  REPORT_TEMPLATE_VERSION_V3,
  REPORT_CONTENT_VERSION_COMPREHENSIVE_V1,
  REPORT_KNOWLEDGE_VERSION_V4,
  REPORT_PROMPT_VERSION_V4,
  REPORT_PROMPT_VERSION_V4_0_1,
  REPORT_CONFIG_VERSION_V4,
  REPORT_CONFIG_VERSION_V4_1_SECTIONED,
  REPORT_CONTENT_VERSION_COMPREHENSIVE_V2,
  REPORT_PROMPT_VERSION_V4_1_SENSITIVITY,
  REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY,
  REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY,
  REPORT_PROMPT_VERSION_V4_2_BEGINNER,
  REPORT_CONFIG_VERSION_V4_2_SECTIONED_BEGINNER,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_4_BEGINNER,
  REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
  REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V1,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_SENSITIVITY,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_1_SENSITIVITY,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_2_SENSITIVITY,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY,
  REPORT_CONTENT_VERSION_COMPREHENSIVE_V3,
  REPORT_TEMPLATE_VERSION_V4_1_SENSITIVITY,
  REPORT_RENDER_VERSION_V4_1_SENSITIVITY,
  REPORT_TIMING_RULE_VERSION_V1,
  REPORT_SENSITIVITY_RULE_VERSION_V1,
  currentReportVersions,
  v4ReportVersions,
  v4_0_1ReportVersions,
  v4SectionedReportVersions,
  v4_1SensitivityReportVersions,
  v4_1_1SensitivityReportVersions,
  v4_1_1KeyConfigSensitivityReportVersions,
  v4_1_2SensitivityReportVersions,
  v4_2BeginnerReportVersions,
  resolveReportRuntimePolicy,
  deriveReportTimingLineage,
  CURRENT_REPORT_KNOWLEDGE_VERSION,
  CURRENT_REPORT_PROMPT_VERSION,
  CURRENT_REPORT_CONFIG_VERSION,
  CURRENT_REPORT_TEMPLATE_VERSION,
  CURRENT_REPORT_RENDER_VERSION,
  CANONICAL_COMPREHENSIVE_SECTION_TITLES,
  CANONICAL_PALACE_TITLES_VI,
  CANONICAL_THEMATIC_TITLES_VI,
  CANONICAL_IDENTITY_REPORT_TITLES_VI,
  CANONICAL_IDENTITY_REPORT_TITLES_EN,
  DETERMINISTIC_CYCLES_NARRATIVE_VI,
  DETERMINISTIC_CYCLES_NARRATIVE_EN,
} from "./reports/identity-report-config.js";
export type {
  ReportTimingLineage,
  ReportVersionResolver,
  ReportVersionSelection,
  ReportVersionSelectionV2,
  ReportVersionSelectionV3,
  ReportVersionSelectionV4,
  ReportVersionSelectionV4_0_1,
  ReportVersionSelectionV4Sectioned,
  ReportVersionSelectionV4_1Sensitivity,
  ReportVersionSelectionV4_1_1Sensitivity,
  ReportVersionSelectionV4_1_1KeyConfigSensitivity,
} from "./reports/identity-report-config.js";

export {
  boundedKnowledge,
  buildLocalizedPromptFacts,
  buildSectionRetrievalQuery,
} from "./reports/identity-report-prompt-context.js";
export type {
  LocalizedPromptFacts,
} from "./reports/identity-report-prompt-context.js";
export {
  resolveIdentityReportVersionFamily,
} from "./reports/identity-report-version-family.js";
export type {
  IdentityReportVersionFamily,
} from "./reports/identity-report-version-family.js";
export {
  COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1,
  COMPREHENSIVE_REPORT_SECTION_KEYS_V4_2,
  resolveComprehensiveReportSectionKeys,
} from "./reports/comprehensive-report-section-v4.js";
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
  ReportGenerationSourceInput,
  ReportGenerationSourceRepository,
} from "./reports/report-generation.repository.js";
export {
  createDatabaseReportGenerationSourceRepository,
} from "./reports/report-generation.repository.js";
export type {
  CommitImmutableVersionInput,
  ImmutableReportVersionRecord,
  ReportGenerationAttemptRecord,
  ReportVersionConflictCode,
  ReportVersionRepository,
  StartOrReuseAttemptInput,
} from "./reports/report-version.repository.js";
export {
  createDatabaseReportVersionRepository,
} from "./reports/report-version.repository.js";
export type {
  PersistedReportSourceSnapshotRecord,
  ReportSourceSnapshotConflictCode,
  ReportSourceSnapshotRepository,
} from "./reports/report-source-snapshot.repository.js";
export {
  createDatabaseReportSourceSnapshotRepository,
} from "./reports/report-source-snapshot.repository.js";
export {
  createDatabaseReportSectionCheckpointRepository,
} from "./reports/report-section-checkpoint.repository.js";
export type {
  ReportSectionCheckpointRepository,
} from "./reports/report-section-checkpoint.repository.js";
export type {
  ReportSnapshotCalculator,
  ReportSnapshotCalculatorInput,
  ReportSourceSnapshotPreparationErrorCode,
  ReportSourceSnapshotPreparationService,
  ReportSourceSnapshotPreparationServiceDependencies,
} from "./reports/report-source-snapshot.service.js";
export {
  createReportSourceSnapshotPreparationService,
} from "./reports/report-source-snapshot.service.js";
export type {
  ApprovedKnowledgePassage,
  ComprehensiveReportSource,
  ComprehensiveReportSourceV4,
  IdentityReportSource,
} from "./reports/report-source.js";
export {
  buildComprehensiveZiweiFactsV4,
  ComprehensiveZiweiFactsV4Error,
} from "./reports/comprehensive-ziwei-facts-v4.js";
export type {
  ComprehensiveZiweiFactsV4,
  ComprehensiveZiweiFactsV4Lineage,
} from "./reports/comprehensive-ziwei-facts-v4.js";
export {
  writeComprehensiveZiweiReportV4,
} from "./reports/comprehensive-report-writer-v4.js";
export type {
  ComprehensiveReportWriterV4Input,
  ComprehensiveReportDraftV4,
  ComprehensiveReportWriterV4Result,
} from "./reports/comprehensive-report-writer-v4.js";
export {
  validateComprehensiveZiweiReportV4,
} from "./reports/comprehensive-report-validator-v4.js";
export type {
  ComprehensiveReportV4ValidationResult,
} from "./reports/comprehensive-report-validator-v4.js";
export {
  critiqueComprehensiveZiweiReportV4,
} from "./reports/comprehensive-report-critic-v4.js";
export type {
  ComprehensiveCriticV4Evaluation,
  ComprehensiveCriticV4Result,
} from "./reports/comprehensive-report-critic-v4.js";
export {
  writeComprehensiveZiweiReport,
  VIETNAMESE_COMPREHENSIVE_REPORT_SYSTEM_PROMPT,
} from "./reports/comprehensive-report-writer.js";
export type {
  ComprehensiveReportWriterInput,
  ComprehensiveReportDraft,
} from "./reports/comprehensive-report-writer.js";
export { validateComprehensiveZiweiReport } from "./reports/comprehensive-report-validator.js";
export type { ComprehensiveReportValidationResult } from "./reports/comprehensive-report-validator.js";
export { validateIdentityReport } from "./reports/report-validator.js";
export type {
  ReportValidationFinding,
  ReportValidationResult,
} from "./reports/report-validator.js";
export { critiqueIdentityReport } from "./reports/report-critic.js";
export { renderIdentityReportHtml } from "./reports/identity-report-html.js";
export { createReportGenerationService } from "./reports/report-generation.service.js";
export type {
  GenerateReportInput,
  ReportGenerationService,
  ReportGenerationServiceDependencies,
  ReportGenerationServiceError,
  ReportGenerationServiceErrorCode,
  ReportGenerationServiceResult,
} from "./reports/report-generation.service.js";

export {
  CROCKFORD_ALPHABET,
  calculatePaymentCodeChecksum,
  extractSyntacticPaymentCodes,
  extractValidPaymentCodes,
  generatePaymentCode,
  isValidPaymentCode,
  normalizePaymentCodeInput,
} from "./commerce/payment-code.js";
export {
  parseTransferredAtLocal,
  getVietnamCalendarDayBounds,
} from "./commerce/payment-claim-time.js";
export type {
  ParsedClaimTime,
  VietnamCalendarDayBounds,
} from "./commerce/payment-claim-time.js";
export { createPaymentInstructions } from "./commerce/payment-instructions.js";
export type { PaymentInstructions } from "./commerce/payment-instructions.js";
export { PRODUCT_CATALOG, createOrderService } from "./commerce/order.service.js";
export { createSePayGateway } from "./commerce/sepay-adapter.js";
export { createSePayWebhookService } from "./commerce/sepay-webhook.service.js";
export { createDatabaseCommerceRepository } from "./commerce/commerce.repository.js";
export type { CommerceRepository, CommerceRepositoryOptions, OwnedOrderProjection } from "./commerce/commerce.repository.js";
export {
  createDatabaseWalletRepository,
} from "./wallet/wallet.repository.js";
export type {
  TrustedGrantAuthority,
  WalletRepository,
  WalletRestorationCommand,
  WalletResult,
} from "./wallet/wallet.repository.js";
export { createWalletService } from "./wallet/wallet.service.js";
export {
  ensureWalletWelcomeGrant,
  WALLET_WELCOME_GRANT_PROMOTIONAL_LA,
} from "./wallet/wallet-welcome-grant.js";
export {
  isWalletTopUpOrder,
  walletTopUpCreditedLa,
  walletTopUpPackTitle,
  type WalletTopUpOrder,
} from "./commerce/wallet-topup.js";
export {
  createGuaranteeFeedbackService,
  resolveRelatedPalaceSuggestion,
} from "./commerce/guarantee-feedback.service.js";
export type {
  GuaranteeFeedbackService,
  GuaranteeFeedbackServiceOptions,
} from "./commerce/guarantee-feedback.service.js";
export { createWalletUnlockService } from "./commerce/wallet-unlock.service.js";
export type {
  WalletUnlockService,
} from "./commerce/wallet-unlock.service.js";
export { createDatabaseOutboxStore, createDatabaseReportQueuePublisher, createOutboxDispatcher, createOutboxDispatchRunner, createOutboxDispatchSchedule } from "./outbox/outbox.dispatcher.js";
export { createWalletBusinessOutboxRunner, createWalletUpgradeOutboxRunner } from "./analytics/wallet-upgrade-outbox.js";
export type { ClaimedOutboxEvent, OutboxDispatcherDependencies, OutboxDispatchRunner, QueueJob, QueueJobV1, ReportGenerationRequestedV1, ReportGenerationRequestedV2 } from "./outbox/outbox.dispatcher.js";
export type { PaymentProvider, CheckoutOrder, HostedCheckout } from "./commerce/payment-provider.js";
export {
  createTelegramAlertProvider,
} from "./commerce/telegram-alert.js";
export type {
  TelegramAlertProvider,
  TelegramAlertProviderOptions,
  TelegramAlertResult,
  StalePaymentAlertPayload,
  CircuitOpenAlertPayload,
} from "./commerce/telegram-alert.js";
export {
  createReconciliationOperations,
} from "./commerce/reconciliation-operations.js";
export type {
  ReconciliationOperations,
  ReconciliationOperationsOptions,
  CircuitEvaluationResult,
  StaleScanResult,
  MaintenanceRunResult,
  CircuitResetResult,
  CircuitResetError,
} from "./commerce/reconciliation-operations.js";


export {
  REGISTERED_QUEUES,
  resolveWorkerQueues,
} from "./jobs/queue.registry.js";
export type { RegisteredQueue, ResolveWorkerQueuesResult } from "./jobs/queue.registry.js";

export { createPdfRenderer, loadBundledPdfFonts } from "./pdf/pdf-renderer.js";
export type {
  ChromiumBrowser,
  ChromiumLauncher,
  ChromiumPage,
  PdfRenderFailureCode,
  PdfRenderResult,
} from "./pdf/pdf-renderer.js";
export { createReportPrintHtml } from "./pdf/report-print-template.js";
export { createAssetService } from "./storage/asset.service.js";
export {
  createGarageAdapter,
  probeGarageReadiness,
} from "./storage/garage-adapter.js";
export type { GarageAdapterDependencies } from "./storage/garage-adapter.js";
export {
  createAssetDownloadService,
  createDatabaseAssetDownloadRepository,
} from "./storage/asset-download.service.js";
export {
  createDatabaseAssetRepository,
} from "./storage/asset.repository.js";
export type {
  AssetRepositoryOptions,
  PdfWorkItem,
} from "./storage/asset.repository.js";
export type {
  AssetDownload,
  AssetDownloadError,
  AssetDownloadRepository,
} from "./storage/asset-download.service.js";
export type {
  ObjectStore,
  ObjectMetadata,
  SignedDownload,
} from "./storage/object-store.js";
export { createSupportCaseRepository } from "./support/support-case.repository.js";
export { createSupportCaseService } from "./support/support-case.service.js";

export {
  completeReportGeneratingHandoff,
  parseReportGenerateJob,
  transitionReportToGenerating,
} from "./reports/report-state.js";
export type { ReportStateSnapshot, TransitionReportToGeneratingResult } from "./reports/report-state.js";
export {
  createDatabaseReportQueueStore,
  createReportService,
  recoverTransientProviderFailureGenerationInTransaction,
} from "./reports/report.service.js";
export type {
  ReportJobQueueStore,
  TerminalRecoveryResult,
} from "./reports/report.service.js";

export {
  createKnowledgeIngestionService,
  validateKnowledgeManifest,
  validateKnowledgeManifestV2,
  canonicalizeKnowledgeEditorialChunks,
  canonicalizeKnowledgeProvenanceEdges,
  canonicalizeV3DispositionLedgerPayload,
  computeChunkContentHash,
  computeDispositionLedgerPayloadHash,
  computeDocumentContentHash,
  computeKnowledgeProvenanceEdgeId,
  computeKnowledgeV4CandidateHash,
} from "./knowledge/knowledge-ingestion.service.js";
export type {
  ApprovalStatus,
  IngestKnowledgeErrorCode,
  IngestKnowledgeResult,
  IngestKnowledgeSuccess,
  KnowledgeChunkManifest,
  KnowledgeManifestV1,
  KnowledgeManifestV2,
  KnowledgeProvenanceEdgeV1,
  PermittedUseBasis,
} from "./knowledge/knowledge-ingestion.service.js";

export {
  createKnowledgeRetrievalService,
  KnowledgeError,
} from "./knowledge/knowledge-retrieval.service.js";
export type {
  KnowledgeErrorCode,
  KnowledgePassageV1,
  RetrieveKnowledgeQuery,
  VectorRetrievalDependency,
  ZiweiKnowledgeQueryV3,
} from "./knowledge/knowledge-retrieval.service.js";

export {
  createDatabaseReportQueryRepository,
} from "./reports/report-query.repository.js";
export type {
  AuthorizedReportQueryRecord,
  ReportQueryRepository,
} from "./reports/report-query.repository.js";

export {
  createReportQueryService,
  ReportQueryDataError,
} from "./reports/report-query.service.js";
export type {
  ReportQueryError,
  ReportQueryService,
} from "./reports/report-query.service.js";

export {
  buildComprehensiveZiweiFacts,
} from "./reports/comprehensive-ziwei-facts.js";
export type {
  ComprehensiveZiweiFacts,
  ComprehensiveZiweiPalaceFact,
  ComprehensiveZiweiPatternFact,
} from "./reports/comprehensive-ziwei-facts.js";

export {
  buildComprehensiveKnowledgePacks,
} from "./reports/comprehensive-report-retrieval.js";
export type {
  ZiweiReportKnowledgePack,
} from "./reports/comprehensive-report-retrieval.js";

export {
  buildZiweiV4Evidence,
  ZiweiV4EvidenceError,
} from "./evidence/ziwei-v4-evidence.js";

export {
  createAccountCenterService,
} from "./accounts/account-center.service.js";
export type {
  AccountCenterService,
} from "./accounts/account-center.service.js";

export {
  createAdminBusinessMetricsService,
} from "./admin-business-metrics/business-metrics.service.js";
export type {
  AdminBusinessMetricsError,
  AdminBusinessMetricsService,
} from "./admin-business-metrics/business-metrics.service.js";
export {
  createDatabaseAdminBusinessMetricsRepository,
} from "./admin-business-metrics/business-metrics.repository.js";
export type {
  AdminBusinessMetricsRepository,
} from "./admin-business-metrics/business-metrics.repository.js";

export {
  TimeLimitedEntitlementService,
} from "./commerce/time-limited-entitlement.service.js";
export type {
  CreateLifetimeBonusEntitlementInput,
  AssertDailyReadingAccessResult,
} from "./commerce/time-limited-entitlement.service.js";

export { createPersonalDailyReadingService, createDatabaseDailyReadingAccess, type DailyReadingService, type DailyReadingGrant } from "./commerce/personal-daily-reading.service.js";

export { acknowledgeTopUpPresence, createDelayedUnlockCompletionService, DELAYED_UNLOCK_WAIT_MS } from "./notifications/delayed-unlock-completion.js";
export * from "./commerce/membership.service.js";

export * from "./notifications/membership-expiry.service.js";
export { PERIOD_READING_TUPLE, validatePeriodReading, writePeriodReading } from "./reports/period-reading-writer.js";
export {
  DEFAULT_TOPIC_DEEP_DIVE_QUALITY_CONFIG,
  TOPIC_DEEP_DIVE_QUALITY_FINDING_CODES,
  validateZiweiTopicDeepDiveQualityV4,
} from "./reports/topic-deep-dive-quality-v4.js";
export type {
  TopicDeepDiveQualityConfig,
  TopicDeepDiveQualityFinding,
  TopicDeepDiveQualityFindingCode,
  TopicDeepDiveQualityResult,
} from "./reports/topic-deep-dive-quality-v4.js";

export {
  REPORT_CONFIG_VERSION_TOPIC_DEEP_DIVE_V1,
  REPORT_PROMPT_VERSION_TOPIC_DEEP_DIVE_V1,
  REPORT_QUALITY_VERSION_TOPIC_DEEP_DIVE_V1,
  writeZiweiTopicDeepDiveV4,
  generateZiweiTopicDeepDiveWithQualityLoopV4,
} from "./reports/topic-deep-dive-writer-v4.js";
export type {
  ZiweiTopicDeepDiveWriterInput,
  ZiweiTopicDeepDiveWriterResult,
  ZiweiTopicDeepDiveWriterRewrite,
} from "./reports/topic-deep-dive-writer-v4.js";

export { createHanMonthReminderService, dueComputedHanPeriod, type LunarReminderDay } from "./notifications/han-month-reminder.service.js";

// Free one-palace gift (FD-109/109a). Library only: nothing here runs unless the worker constructs it.
export {
  FREE_AI_CHART_CEILING_MICRO_VND,
  FREE_AI_DAILY_CEILING_MICRO_VND,
  createFreeAiBudgetRepository,
} from "./ziwei/free-ai-budget.repository.js";
export type { FreePalaceReservationInput, FreePalaceReservationResult } from "./ziwei/free-ai-budget.repository.js";
export { createFreeAiDispatchService } from "./ziwei/free-ai-dispatch.service.js";
export { createFreeAiSettlementService } from "./ziwei/free-ai-settlement.service.js";
export { createFreePalaceArtifactRepository } from "./ziwei/free-palace-artifact.repository.js";
export { FREE_PALACE_GENERATION_REQUESTED_EVENT, createFreePalaceOutboxStore } from "./ziwei/free-palace-outbox.js";
export {
  createFreePalaceRunner,
  createFreePalaceSourceCheck,
  createFreePalaceTariffPort,
} from "./ziwei/free-palace-runner.js";
export type { FreePalaceRunner, FreePalaceRunnerDependencies } from "./ziwei/free-palace-runner.js";
export {
  FREE_PALACE_PROMPT_VERSION,
  FREE_PALACE_RULES_VERSION,
  FREE_PALACE_SCHEMA_VERSION,
  buildFreePalacePrompt,
  createFreePalaceWriter,
  serializeFreePalacePrompt,
} from "./ziwei/free-palace-writer.js";
export { createFreePalaceReadService, mapFreePalaceStatus } from "./ziwei/free-palace-read.service.js";
export type { FreePalaceReadService } from "./ziwei/free-palace-read.service.js";
export {
  buildFreePalaceFacts,
  createFreePalaceRequestService,
  currentFreePalaceLineageHash,
  freePalaceLineage,
} from "./ziwei/free-palace-request.service.js";
export type { FreePalaceRequestOutcome, FreePalaceRequestService } from "./ziwei/free-palace-request.service.js";
export { createFreePalaceEngagementService, FREE_PALACE_ENGAGEMENT_TABS, FREE_PALACE_ENGAGEMENT_THRESHOLD } from "./ziwei/free-palace-engagement.service.js";
export type { FreePalaceEngagementService } from "./ziwei/free-palace-engagement.service.js";

export {createReportWalletCompensationRunner} from "./reports/report-wallet-compensation.js";

export { createPendingTopUpRecoveryCaptureService, RECOVERY_CAPTURE_EVENT_TYPE, PENDING_TOPUP_RECOVERY_DELAY_MS } from "./notifications/pending-topup-recovery-capture.js";
export { createReportNotificationService, resolveReportNotificationMode, ReportNotificationError, REPORT_NOTIFICATION_CAPTURE_EVENT } from "./notifications/report-notification.service.js";

export {createRecoveryClickReceiptService,RecoveryReceiptError} from "./notifications/recovery-click-receipt.js";

export * from "./notifications/recovery-financial-attribution.js";

export { renderPendingTopUpRecoveryEmail, type PendingTopUpRecoveryEmail, type PendingTopUpRecoveryEmailInput } from "./notifications/pending-topup-recovery-email.js";

export { createPendingTopUpRecoveryRunner } from "./notifications/pending-topup-recovery-runner.js";
export type { RecoveryOutboundClaim } from "./notifications/pending-topup-recovery-runner.js";
export { createRecoveryOutboundControlTool } from "./notifications/recovery-outbound-control.js";
export { createRecoveryOutboundMaintenance } from "./notifications/recovery-outbound-maintenance.js";
