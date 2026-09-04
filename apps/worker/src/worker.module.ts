import { Module } from "@nestjs/common";
import { loadEnvironment } from "@lasoviet/config";
import {
  createAccountDeletionService,
  createAnonymousRetentionService,
  createAuthEmailDeliveryService,
  createDatabaseAnonymousRetentionRepository,
  createDatabaseAuthEmailDeliveryStore,
  createDatabaseDeletionRepository,
  createDatabaseOutboxStore,
  createDatabaseReportQueuePublisher,
  createDatabaseReportQueueStore,
  createReportService,
  createOutboxDispatchRunner as createBoundedOutboxDispatchRunner,
  createOutboxDispatcher,
  createPhaseOneMaintenanceRunner,
  createSmtpEmailAdapter,
  resolveWorkerQueues,
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

export function createReportGenerateRunner() {
  const queuesResult = resolveWorkerQueues(process.env.WORKER_QUEUES);
  if (!queuesResult.ok || !queuesResult.value.includes("report.generate")) {
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
  const processor = createReportGenerateProcessor({
    database,
    reportService: createReportService(database),
    queueStore: createDatabaseReportQueueStore(database, "report-worker"),
    workerId: "report-worker",
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
