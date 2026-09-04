import { Module } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { loadEnvironment } from "@lasoviet/config";
import {
  createAccountDeletionService,
  createAiProductionGate,
  createAnonymousRetentionService,
  createAuthEmailDeliveryService,
  createDatabaseAnonymousRetentionRepository,
  createDatabaseAuthEmailDeliveryStore,
  createDatabaseDeletionRepository,
  createDatabaseOutboxStore,
  createDatabaseReportGenerationSourceRepository,
  createDatabaseReportQueuePublisher,
  createDatabaseReportQueueStore,
  createDatabaseReportVersionRepository,
  createKnowledgeRetrievalService,
  createReportService,
  createOutboxDispatchRunner as createBoundedOutboxDispatchRunner,
  createOutboxDispatcher,
  createPhaseOneMaintenanceRunner,
  createReportGenerationService,
  createSmtpEmailAdapter,
  resolveWorkerQueues,
  type AiProductionGate,
  type AiProvider,
} from "@lasoviet/backend";
import { createDatabase } from "@lasoviet/database";
import { createReportGenerateProcessor } from "./processors/report-generate.processor.js";

@Module({})
export class WorkerModule {}

export function createMaintenanceRunner() {
  const environment = loadEnvironment(process.env);
  if (!environment.ok || environment.value.databaseUrl === undefined) {
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
  const email = createAuthEmailDeliveryService({
    store: createDatabaseAuthEmailDeliveryStore(database),
    provider,
    recipientFingerprintSecret: environment.value.internalActorSecret ?? "",
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
    retryAuthEmail: (limit) => email.retryDue(limit),
  });
}

export function createOutboxDispatchRunner() {
  const environment = loadEnvironment(process.env);
  if (!environment.ok || environment.value.databaseUrl === undefined) {
    throw new Error("WORKER_CONFIG_INVALID");
  }
  const database = createDatabase(environment.value.databaseUrl);
  return createBoundedOutboxDispatchRunner(createOutboxDispatcher({
    ...createDatabaseOutboxStore(database, "worker-outbox"),
    ...createDatabaseReportQueuePublisher(database),
  }));
}

export function createReportGenerateRunner(options?: {
  gate?: AiProductionGate;
  provider?: AiProvider;
}) {
  const queuesResult = resolveWorkerQueues(process.env.WORKER_QUEUES);
  if (!queuesResult.ok || !queuesResult.value.includes("report.generate")) {
    return {
      async runOnce() {
        return { processed: 0 };
      },
    };
  }

  const gate = options?.gate ?? createAiProductionGate("pending");
  if (!gate.allows("production_report_generation")) {
    return {
      async runOnce() {
        return { processed: 0 };
      },
    };
  }

  const environment = loadEnvironment(process.env);
  if (!environment.ok || environment.value.databaseUrl === undefined) {
    throw new Error("WORKER_CONFIG_INVALID");
  }
  const database = createDatabase(environment.value.databaseUrl);
  const workerId = `report-worker-${randomUUID()}`;
  const knowledgeRetrieval = createKnowledgeRetrievalService({ database });
  const sourceRepository = createDatabaseReportGenerationSourceRepository({
    database,
    knowledgeRetrieval,
  });
  const versionRepository = createDatabaseReportVersionRepository(database);
  const provider = options?.provider ?? {
    async generateStructured() {
      return {
        ok: false as const,
        error: { code: "AI_CAPABILITY_UNSUPPORTED" as const, retryable: false },
      };
    },
  };
  const generationService = createReportGenerationService({
    sourceRepository,
    versionRepository,
    gate,
    provider,
  });
  const processor = createReportGenerateProcessor({
    database,
    reportService: createReportService(database),
    queueStore: createDatabaseReportQueueStore(database, workerId),
    workerId,
    generationService,
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
