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
  createOutboxDispatchRunner as createBoundedOutboxDispatchRunner,
  createOutboxDispatcher,
  createPhaseOneMaintenanceRunner,
  createSmtpEmailAdapter,
} from "@lasoviet/backend";
import { createDatabase } from "@lasoviet/database";

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
