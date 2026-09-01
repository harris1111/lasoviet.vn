import { Module } from "@nestjs/common";

import {
  CONSENT_DOCUMENT_VERSIONS,
} from "@lasoviet/contracts";
import { loadEnvironment } from "@lasoviet/config";
import {
  IztroAdapter,
  iztroDefaultConfig,
} from "@lasoviet/engine-adapters";
import {
  createAuthEmailDeliveryService,
  createAccountDeletionService,
  createAnonymousRetentionService,
  createBirthProfileService,
  createConsentService,
  createDatabaseAuthEmailDeliveryStore,
  createDatabaseAnonymousRetentionRepository,
  createDatabaseBirthProfileRepository,
  createDatabaseConsentRepository,
  createDatabaseDeletionRepository,
  createDatabaseZiweiCalculationRepository,
  createDatabaseZiweiQueryRepository,
  createSmtpEmailAdapter,
  createEvidenceService,
  createZiweiCalculationService,
  createZiweiQueryService,
  type EmailProvider,
} from "@lasoviet/backend";
import { createDatabase } from "@lasoviet/database";

import {
  AUTH_EMAIL_DELIVERY_SERVICE,
  AUTH_EMAIL_SERVICE_SECRET,
  AuthEmailController,
} from "./auth/auth-email.controller.js";
import {
  BIRTH_PROFILE_DATABASE,
  BIRTH_PROFILE_SERVICE,
  BIRTH_PROFILE_SERVICE_SECRET,
  BirthProfileController,
} from "./birth-profile/birth-profile.controller.js";
import { HealthController } from "./health/health.controller.js";
import {
  ACCOUNT_DELETION_SERVICE,
  ANONYMOUS_RETENTION_SERVICE,
  CONSENT_SERVICE,
  PRIVACY_DATABASE,
  PRIVACY_SERVICE_SECRET,
  PrivacyController,
} from "./privacy/privacy.controller.js";
import {
  ZIWEI_CALCULATION_DATABASE,
  ZIWEI_CALCULATION_SERVICE,
  ZIWEI_CALCULATION_SERVICE_SECRET,
  ZIWEI_QUERY_SERVICE,
  ZiweiController,
} from "./ziwei/ziwei.controller.js";

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
  controllers: [
    HealthController,
    AuthEmailController,
    PrivacyController,
    BirthProfileController,
    ZiweiController,
  ],
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
    { provide: PRIVACY_DATABASE, useFactory: privacyDatabase },
    {
      provide: BIRTH_PROFILE_SERVICE,
      useFactory: () =>
        createBirthProfileService({
          repository: createDatabaseBirthProfileRepository(privacyDatabase()),
        }),
    },
    {
      provide: BIRTH_PROFILE_SERVICE_SECRET,
      useFactory: () => {
        const environment = applicationEnvironment();
        if (environment.internalActorSecret === undefined) {
          throw new Error("API_ACTOR_SECRET_CONFIG_INVALID");
        }
        return environment.internalActorSecret;
      },
    },
    { provide: BIRTH_PROFILE_DATABASE, useFactory: privacyDatabase },
    {
      provide: ZIWEI_CALCULATION_SERVICE,
      useFactory: () =>
        createZiweiCalculationService({
          repository: createDatabaseZiweiCalculationRepository(
            privacyDatabase(),
          ),
          evidenceService: createEvidenceService(privacyDatabase()),
          engine: new IztroAdapter(),
          config: iztroDefaultConfig,
        }),
    },
    {
      provide: ZIWEI_CALCULATION_SERVICE_SECRET,
      useFactory: () => {
        const environment = applicationEnvironment();
        if (environment.internalActorSecret === undefined) {
          throw new Error("API_ACTOR_SECRET_CONFIG_INVALID");
        }
        return environment.internalActorSecret;
      },
    },
    { provide: ZIWEI_CALCULATION_DATABASE, useFactory: privacyDatabase },
    {
      provide: ZIWEI_QUERY_SERVICE,
      useFactory: () =>
        createZiweiQueryService({
          repository: createDatabaseZiweiQueryRepository(privacyDatabase()),
        }),
    },
  ],
})
export class ApiModule {}
