import { Module } from "@nestjs/common";

import {
  CONSENT_DOCUMENT_VERSIONS,
} from "@lasoviet/contracts";
import { loadEnvironment } from "@lasoviet/config";
import {
  createAuthEmailDeliveryService,
  createAccountDeletionService,
  createAnonymousRetentionService,
  createConsentService,
  createDatabaseAuthEmailDeliveryStore,
  createDatabaseAnonymousRetentionRepository,
  createDatabaseConsentRepository,
  createDatabaseDeletionRepository,
  createSmtpEmailAdapter,
  type EmailProvider,
} from "@lasoviet/backend";
import { createDatabase } from "@lasoviet/database";

import {
  AUTH_EMAIL_DELIVERY_SERVICE,
  AUTH_EMAIL_SERVICE_SECRET,
  AuthEmailController,
} from "./auth/auth-email.controller.js";
import { HealthController } from "./health/health.controller.js";
import {
  ACCOUNT_DELETION_SERVICE,
  ANONYMOUS_RETENTION_SERVICE,
  CONSENT_SERVICE,
  PRIVACY_SERVICE_SECRET,
  PrivacyController,
} from "./privacy/privacy.controller.js";

function applicationEnvironment() {
  const result = loadEnvironment(process.env);
  if (!result.ok) {
    throw new Error("API_CONFIG_INVALID");
  }
  return result.value;
}

function authEmailService() {
  const environment = applicationEnvironment();
  if (environment.databaseUrl === undefined) {
    throw new Error("API_DATABASE_CONFIG_INVALID");
  }

  const database = createDatabase(environment.databaseUrl);
  const provider: EmailProvider = environment.smtp.enabled
    ? createSmtpEmailAdapter({
        host: environment.smtp.host,
        port: environment.smtp.port,
        username: environment.smtp.username,
        password: environment.smtp.password,
        from: environment.smtp.fromAddress,
        tlsRequired: environment.smtp.tlsRequired,
      })
    : {
        async send() {
          return { ok: false, code: "SMTP_CONFIG_INVALID" as const };
        },
      };

  return createAuthEmailDeliveryService({
    store: createDatabaseAuthEmailDeliveryStore(database),
    provider,
    recipientFingerprintSecret: environment.internalActorSecret ?? "",
  });
}

function privacyDatabase() {
  const environment = applicationEnvironment();
  if (environment.databaseUrl === undefined) {
    throw new Error("API_DATABASE_CONFIG_INVALID");
  }
  return createDatabase(environment.databaseUrl);
}

@Module({
  controllers: [HealthController, AuthEmailController, PrivacyController],
  providers: [
    {
      provide: AUTH_EMAIL_DELIVERY_SERVICE,
      useFactory: authEmailService,
    },
    {
      provide: AUTH_EMAIL_SERVICE_SECRET,
      useFactory: () => {
        const environment = applicationEnvironment();
        if (environment.internalActorSecret === undefined) {
          throw new Error("API_ACTOR_SECRET_CONFIG_INVALID");
        }
        return environment.internalActorSecret;
      },
    },
    {
      provide: CONSENT_SERVICE,
      useFactory: () =>
        createConsentService({
          repository: createDatabaseConsentRepository(privacyDatabase()),
          documentVersions: CONSENT_DOCUMENT_VERSIONS,
        }),
    },
    {
      provide: ACCOUNT_DELETION_SERVICE,
      useFactory: () =>
        createAccountDeletionService({
          repository: createDatabaseDeletionRepository(privacyDatabase()),
        }),
    },
    {
      provide: ANONYMOUS_RETENTION_SERVICE,
      useFactory: () =>
        createAnonymousRetentionService({
          repository: createDatabaseAnonymousRetentionRepository(
            privacyDatabase(),
          ),
        }),
    },
    {
      provide: PRIVACY_SERVICE_SECRET,
      useFactory: () => {
        const environment = applicationEnvironment();
        if (environment.internalActorSecret === undefined) {
          throw new Error("API_ACTOR_SECRET_CONFIG_INVALID");
        }
        return environment.internalActorSecret;
      },
    },
  ],
})
export class ApiModule {}
