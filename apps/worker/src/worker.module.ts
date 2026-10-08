import { createRecoveryFinancialAttributionService } from "@lasoviet/backend";
import { createMembershipExpiryReminderService, membershipReminderAllowed } from "@lasoviet/backend";
import { calculateIztroReportSnapshot, lunarReminderDay } from "@lasoviet/engine-adapters";
import { Module } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { loadEnvironment } from "@lasoviet/config";
import {
  createAccountDeletionService,
  createAnalyticsRetentionService,
  createDatabaseAnalyticsRepository,
  createAiProductionGate,
  createAnonymousRetentionService,
  createAuthEmailDeliveryService,
  createDelayedUnlockCompletionService,
  createReportNotificationService,
  resolveReportNotificationMode,
  createVerifiedSignInNurtureService,
  createPendingTopUpRecoveryCaptureService,
  createRecoveryOutboundMaintenance,
  createHanMonthReminderService,
  createDatabaseNotificationPreferenceStore,
  createDatabaseAnonymousRetentionRepository,
  createDatabaseAuthEmailDeliveryStore,
  createDatabaseAiCostService,
  createFreeAiDispatchService,
  createFreeAiSettlementService,
  createFreePalaceArtifactRepository,
  createFreePalaceOutboxStore,
  createFreePalaceRunner,
  createFreePalaceSourceCheck,
  createFreePalaceTariffPort,
  createFreePalaceWriter,
  type AiCostRecorder,
  createDatabaseDeletionRepository,
  createDatabaseOutboxStore,
  createDatabaseReportGenerationSourceRepository,
  createDatabaseReportQueuePublisher,
  createDatabaseReportQueueStore,
  createDatabaseReportVersionRepository,
  createDatabaseAssetRepository,
  createDatabaseReportSectionCheckpointRepository,
  createDatabaseReportSourceSnapshotRepository,
  createReportSourceSnapshotPreparationService,
  createKnowledgeRetrievalService,
  createOpenAiCompatibleAdapter,
  resolveOpenAiCompatibleProviderId,
  createReportService,
  createAdminAccessService,
  createDatabaseAdminAccessRepository,
  createReconciliationOperations,
  createTelegramAlertProvider,
  type TelegramAlertProvider,
  type ReconciliationMaintenance,
  createOutboxDispatchRunner as createBoundedOutboxDispatchRunner,
  createOutboxDispatcher,
  createWalletBusinessOutboxRunner,
  createReportWalletCompensationRunner,
  createPhaseOneMaintenanceRunner,
  createReportGenerationService,
  createPdfRenderer,
  createAssetService,
  createGarageAdapter,
  createSmtpEmailAdapter,
  resolveWorkerQueues,
  type AiProductionGate,
  type AiProvider,
  type ObjectStore,
} from "@lasoviet/backend";
import { createDatabase } from "@lasoviet/database";
import { createPdfRenderProcessor } from "./processors/pdf-render.processor.js";
import { createReportGenerateProcessor } from "./processors/report-generate.processor.js";
export { provisionReportKnowledge } from "./reports/provision-report-knowledge.js";

@Module({})
export class WorkerModule {}

export function createMaintenanceRunner() {
  const environment = loadEnvironment(process.env);
  if (
    !environment.ok ||
    environment.value.databaseUrl === undefined ||
    environment.value.internalActorSecret === undefined ||
    environment.value.internalActorSecret.trim() === ""
  ) {
    throw new Error("WORKER_CONFIG_INVALID");
  }
  const database = createDatabase(environment.value.databaseUrl);
  const provider = environment.value.smtp.enabled
    ? createSmtpEmailAdapter({
        host: environment.value.smtp.host,
        port: environment.value.smtp.port,
        username: environment.value.smtp.username,
        password: environment.value.smtp.password,
        from: environment.value.smtp.fromAddress,
        tlsRequired: environment.value.smtp.tlsRequired,
      })
    : { async send() { return { ok: false as const, code: "SMTP_CONFIG_INVALID" as const }; } };
  const preferenceStore = createDatabaseNotificationPreferenceStore(
    database,
    environment.value.internalActorSecret ?? "",
  );
  const recoveryCapture = createPendingTopUpRecoveryCaptureService({
    database, mode: environment.value.funnelRecoveryMode,
    tokenSecret: environment.value.internalActorSecret,
    orderTtlSeconds: environment.value.sepay.environment !== "disabled" ? environment.value.sepay.orderTtlSeconds : 86400,
  });
  const recoveryMaintenance = createRecoveryOutboundMaintenance({
    enabled: process.env.RECOVERY_OUTBOUND_ENABLED, smtpEnabled: environment.value.smtp.enabled,
    database, provider, tokenSecret: environment.value.internalActorSecret,
    orderTtlSeconds: environment.value.sepay.environment !== "disabled" ? environment.value.sepay.orderTtlSeconds : 86400,
    capture: recoveryCapture,
  });
  const recoveryFinancial = createRecoveryFinancialAttributionService({ database,
    providerEnvironment: environment.value.sepay.environment, tokenSecret: environment.value.internalActorSecret ?? "" });
  const nurture = createVerifiedSignInNurtureService({ database, preferenceStore, tokenSecret: environment.value.internalActorSecret });
  const hanReminder = createHanMonthReminderService(database, { preferenceStore, tokenSecret: environment.value.internalActorSecret, resolveLunarDay: lunarReminderDay });
  const delayedUnlock = createDelayedUnlockCompletionService(database);
  const reportNotices = createReportNotificationService(database, {mode: resolveReportNotificationMode(process.env.REPORT_READY_SUBSCRIPTION_MODE)});
  const email = createAuthEmailDeliveryService({
    store: createDatabaseAuthEmailDeliveryStore(database),
    provider,
    recipientFingerprintSecret: environment.value.internalActorSecret ?? "",
    preferenceChecker: preferenceStore,
    delayedUnlockEligibility: delayedUnlock.isEligible,
    nurtureEligibility: nurture.isEligible,
    hanReminderEligibility: hanReminder.isEligible,
    membershipReminderAllowed: (request, now) => membershipReminderAllowed(database, request, now),
  });
  const telegramAlert = createTelegramAlertProvider({
    botToken: environment.value.telegram?.botToken,
    chatId: environment.value.telegram?.chatId,
  });
  const reconciliation = createReconciliationOperations({
    database,
    telegramAlert,
    adminAccessService: createAdminAccessService({
      repository: createDatabaseAdminAccessRepository(database),
    }),
  });
  return createPhaseOneMaintenanceRunner({
    accountDeletion: createAccountDeletionService({
      repository: createDatabaseDeletionRepository(database),
    }),
    anonymousRetention: {
      purgeExpired: (limit) =>
        createAnonymousRetentionService({
          repository: createDatabaseAnonymousRetentionRepository(database),
        }).purgeExpired(new Date(), limit),
    },
    retryAuthEmail: async (limit) => {
      await recoveryMaintenance.runOnce(limit);
      await recoveryFinancial.project(limit);
      await reportNotices.captureReady(limit);
      await nurture.scanAndEnqueue(limit);
      await hanReminder.scanAndEnqueue(limit);
      await delayedUnlock.scan((request) => email.send(request), limit);
      await createMembershipExpiryReminderService({ database, preferenceStore, tokenSecret: environment.value.internalActorSecret ?? "" }).scanAndEnqueue(limit);
      return email.retryDue(limit);
    },
    reconciliation,
    analyticsRetention: createAnalyticsRetentionService({
      repository: createDatabaseAnalyticsRepository(database),
    }),
  });
}

export function createOutboxDispatchRunner() {
  const environment = loadEnvironment(process.env);
  if (!environment.ok || environment.value.databaseUrl === undefined) {
    throw new Error("WORKER_CONFIG_INVALID");
  }
  const database = createDatabase(environment.value.databaseUrl);
  const reports = createBoundedOutboxDispatchRunner(createOutboxDispatcher({
    ...createDatabaseOutboxStore(database, "worker-outbox"),
    ...createDatabaseReportQueuePublisher(database),
  }));
  const purchases = createWalletBusinessOutboxRunner(database, {workerId: "worker-wallet-business"});
  const compensation = createReportWalletCompensationRunner(database, {workerId: "worker-report-compensation"});
  return {
    async runOnce() {
      const [report, upgrade, recovered] = await Promise.all([reports.runOnce(), purchases.runOnce(), compensation.runOnce()]);
      return {dispatched: report.dispatched + upgrade.dispatched + recovered.compensated};
    },
  };
}

const AI_CONFIG_VARIABLES = [
  "AI_BASE_URL", "AI_API_KEY", "AI_MODEL", "AI_TIMEOUT",
  "AI_ALLOWED_RESOLVED_MODELS", "AI_MAX_RETRIES", "AI_FEATURE_JSON_SCHEMA", "AI_FEATURE_TOOL_CALLING", "AI_PRODUCTION_ENABLED",
] as const;

function hasAnyAiConfig(source: NodeJS.ProcessEnv): boolean {
  return AI_CONFIG_VARIABLES.some((key) => source[key] !== undefined);
}

export function createReportGenerateRunner(options?: {
  gate?: AiProductionGate;
  provider?: AiProvider;
  costRecorder?: AiCostRecorder;
  alertDispatcher?: {
    dispatchPendingAlerts(
      filterKind?: "stale_payment" | "circuit_open" | "report_terminal_failure",
    ): Promise<unknown>;
  };
  telegramAlert?: TelegramAlertProvider;
}) {
  const queuesResult = resolveWorkerQueues(process.env.WORKER_QUEUES);
  if (!queuesResult.ok || !queuesResult.value.includes("report.generate")) {
    return {
      async runOnce() {
        return { processed: 0 };
      },
    };
  }

  if (!hasAnyAiConfig(process.env)) {
    return { async runOnce() { return { processed: 0 }; } };
  }

  const environment = loadEnvironment(process.env);
  if (!environment.ok) {
    throw new Error("WORKER_CONFIG_INVALID");
  }

  const gate =
    options?.gate ??
    createAiProductionGate(
      environment.value.ai.enabled &&
        environment.value.ai.productionEnabled &&
        environment.value.ai.featureJsonSchema
        ? "approved"
        : "pending",
    );

  if (!gate.allows("production_report_generation")) {
    return {
      async runOnce() {
        return { processed: 0 };
      },
    };
  }

  if (
    environment.value.databaseUrl === undefined ||
    environment.value.betterAuthUrl === undefined ||
    environment.value.internalActorSecret === undefined
  ) {
    throw new Error("WORKER_CONFIG_INVALID");
  }
  const database = createDatabase(environment.value.databaseUrl);
  const workerId = `report-worker-${randomUUID()}`;
  const knowledgeRetrieval = createKnowledgeRetrievalService({ database });
  const sourceRepository = createDatabaseReportGenerationSourceRepository({
    database,
    knowledgeRetrieval,
  });
  const versionRepository = createDatabaseReportVersionRepository(database, {
    betterAuthUrl: environment.value.betterAuthUrl,
    recipientFingerprintSecret: environment.value.internalActorSecret,
  });
  const sourceSnapshotRepository = createDatabaseReportSourceSnapshotRepository(database);
  const sectionCheckpointRepository =
    createDatabaseReportSectionCheckpointRepository(database);
  const sourceSnapshotPreparer = createReportSourceSnapshotPreparationService({
    database,
    repository: sourceSnapshotRepository,
    calculateSnapshot: calculateIztroReportSnapshot,
  });
  const aiCostService = createDatabaseAiCostService(database);
  const costRecorder = options?.costRecorder ?? aiCostService.recorder;
  const provider =
    options?.provider ??
    (environment.value.ai.enabled
      ? createOpenAiCompatibleAdapter({
          baseUrl: environment.value.ai.baseUrl,
          apiKey: environment.value.ai.apiKey,
          modelId: environment.value.ai.model,
          allowedResolvedModelIds: environment.value.ai.allowedResolvedModels,
          providerId: resolveOpenAiCompatibleProviderId(environment.value.ai.baseUrl),
          timeoutMs: environment.value.ai.timeoutMs,
          retryCount: environment.value.ai.maxRetries,
          productionGate: gate,
          costRecorder,
        })
      : {
          async generateStructured() {
            return {
              ok: false as const,
              error: { code: "AI_CAPABILITY_UNSUPPORTED" as const, retryable: false },
            };
          },
        });
  const generationService = createReportGenerationService({
    sourceRepository,
    versionRepository,
    gate,
    provider,
    sourceSnapshotPreparer,
    sectionCheckpointRepository,
    onReviewWarnings: ({ reportVersionId, warnings }) => {
      console.warn("REPORT_REVIEW_WARNINGS", {
        reportVersionId,
        warnings: warnings.map(({ key, category }) => ({ key, category })),
      });
    },
  });
  const telegramAlert =
    options?.telegramAlert ??
    createTelegramAlertProvider({
      botToken: environment.value.telegram?.botToken,
      chatId: environment.value.telegram?.chatId,
    });
  const alertDispatcher =
    options?.alertDispatcher ??
    createReconciliationOperations({
      database,
      telegramAlert,
    });
  const processor = createReportGenerateProcessor({
    database,
    reportService: createReportService(database),
    queueStore: createDatabaseReportQueueStore(database, workerId),
    workerId,
    generationService,
    alertDispatcher,
  });

  let activeRun: Promise<{ processed: number }> | undefined;
  return {
    runOnce(): Promise<{ processed: number }> {
      if (activeRun !== undefined) return activeRun;
      activeRun = (async () => {
        const result = await processor.processNext();
        return { processed: result.processed ? 1 : 0 };
      })().finally(() => {
        activeRun = undefined;
      });
      return activeRun;
    },
  };
}

export function createPdfRenderRunner(options?: {
  objectStore?: ObjectStore;
  renderer?: {
    render(html: string, renderVersion: string): Promise<
      | { ok: true; bytes: Uint8Array }
      | {
          ok: false;
          code:
            | "PDF_RENDER_FAILED"
            | "PDF_TEMP_CLEANUP_FAILED"
            | "PDF_FONT_MISSING"
            | "PDF_RENDER_VERSION_UNSUPPORTED";
        }
    >;
  };
}) {
  const queuesResult = resolveWorkerQueues(process.env.WORKER_QUEUES);
  if (!queuesResult.ok || !queuesResult.value.includes("pdf.render")) {
    return { async runOnce() { return { processed: 0 }; } };
  }

  const environment = loadEnvironment(process.env);
  if (!environment.ok || !environment.value.garage.enabled) {
    return { async runOnce() { return { processed: 0 }; } };
  }
  if (
    environment.value.databaseUrl === undefined ||
    environment.value.betterAuthUrl === undefined ||
    environment.value.internalActorSecret === undefined
  ) {
    throw new Error("WORKER_CONFIG_INVALID");
  }

  const database = createDatabase(environment.value.databaseUrl);
  const workerId = `pdf-worker-${randomUUID()}`;
  const assetRepository = createDatabaseAssetRepository(database, {
    canonicalPublicOrigin: environment.value.betterAuthUrl,
    recipientFingerprintSecret: environment.value.internalActorSecret,
  });
  const assetService = createAssetService({
    objectStore: options?.objectStore ?? createGarageAdapter(environment.value.garage),
  });
  const renderer = options?.renderer ?? createPdfRenderer();
  const processor = createPdfRenderProcessor({
    queueStore: createDatabaseReportQueueStore(database, workerId),
    workerId,
    assetRepository,
    render: ({ html, renderVersion }) => renderer.render(html, renderVersion),
    store: ({ candidateObjectKey, objectKey, bytes }) => assetService.storePdf({
      candidateObjectKey,
      objectKey,
      bytes,
    }),
  });

  let activeRun: Promise<{ processed: number }> | undefined;
  return {
    runOnce(): Promise<{ processed: number }> {
      if (activeRun !== undefined) return activeRun;
      activeRun = processor.processNext()
        .then((result) => ({ processed: result.processed ? 1 : 0 }))
        .finally(() => {
          activeRun = undefined;
        });
      return activeRun;
    },
  };
}

// Free one-palace gift. Fails closed: with the flag off, approved production AI missing, or no
// database, NOTHING that could reach a provider is constructed and the runner is a no-op. The gift
// uses its own adapter instance with retryCount 0; the paid adapter and its retries are untouched.
export function createFreePalaceGiftRunner(options?: { fetchImpl?: typeof fetch; now?: () => Date }) {
  const noop = { async runOnce() { return { processed: 0 }; } };
  const environment = loadEnvironment(process.env);
  if (!environment.ok || environment.value.freePalaceGenerationEnabled !== true) return noop;
  const { ai, databaseUrl } = environment.value;
  if (!ai.enabled || !ai.productionEnabled || !ai.featureJsonSchema || databaseUrl === undefined) return noop;

  const database = createDatabase(databaseUrl);
  const providerId = resolveOpenAiCompatibleProviderId(ai.baseUrl);
  const aiCost = createDatabaseAiCostService(database);
  const tariff = createFreePalaceTariffPort(database);
  const gate = createAiProductionGate("approved");
  const writer = createFreePalaceWriter({
    expected: { provider: providerId, model: ai.model },
    costRecorder: aiCost.recorder,
    loadTariff: tariff.loadTariff,
    createProvider: (recorder) => createOpenAiCompatibleAdapter({
      baseUrl: ai.baseUrl, apiKey: ai.apiKey, modelId: ai.model, allowedResolvedModelIds: ai.allowedResolvedModels,
      providerId, timeoutMs: ai.timeoutMs, retryCount: 0, productionGate: gate, costRecorder: recorder, fetchImpl: options?.fetchImpl,
    }),
  });
  const runner = createFreePalaceRunner({
    store: createFreePalaceOutboxStore(database, `free-palace-${randomUUID()}`, { now: options?.now }),
    dispatch: createFreeAiDispatchService(database),
    writer,
    artifacts: createFreePalaceArtifactRepository(database),
    flagEnabled: () => true,
    isSourceAvailable: createFreePalaceSourceCheck(),
    // A frozen call for a provider/model this process is not configured for is cancelled unsent.
    activePricingSnapshotId: (tx, now, provider, model) =>
      provider === providerId && model === ai.model ? tariff.activePricingSnapshotId(tx, now, provider, model) : Promise.resolve(null),
  });
  let activeRun: Promise<{ processed: number }> | undefined;
  return {
    // Missing approved pricing at runtime claims nothing, so events wait instead of burning slots.
    runOnce(): Promise<{ processed: number }> {
      if (activeRun !== undefined) return activeRun;
      activeRun = (async () => {
        if (!(await aiCost.getEffectivePricing(providerId, ai.model, new Date()))) return { processed: 0 };
        return runner.runOnce();
      })().finally(() => { activeRun = undefined; });
      return activeRun;
    },
  };
}

// Accounting self-recovery and payload retention for the gift. Never dispatches.
export function createFreePalaceGiftMaintenanceRunner() {
  const noop = { async runOnce() { return { settled: 0, closed: 0, purged: 0 }; } };
  const environment = loadEnvironment(process.env);
  if (!environment.ok || environment.value.freePalaceGenerationEnabled !== true || environment.value.databaseUrl === undefined) return noop;
  const database = createDatabase(environment.value.databaseUrl);
  const staleAfterMs = (environment.value.ai.enabled ? environment.value.ai.timeoutMs : 120_000) + 10 * 60_000;
  const settlement = createFreeAiSettlementService(database);
  const artifacts = createFreePalaceArtifactRepository(database);
  return {
    async runOnce() {
      const settled = await settlement.settleAbandoned({ staleAfterMs, limit: 50 });
      const closed = await artifacts.closeStalePublications({ staleAfterMs, limit: 50 });
      const purged = await artifacts.purgeExpiredPayloads({ limit: 100 });
      return { settled, closed, purged };
    },
  };
}
