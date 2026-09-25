import { Module } from "@nestjs/common";

import {
  CONSENT_DOCUMENT_VERSIONS,
} from "@lasoviet/contracts";
import { loadEnvironment } from "@lasoviet/config";
import {
  IztroAdapter,
  iztroDefaultConfig,
  calculateZiweiHoroscope,
} from "@lasoviet/engine-adapters";
import {
  createAuthEmailDeliveryService,
  createAnalyticsService,
  createDatabaseAnalyticsRepository,
  createAccountDeletionService,
  createAnonymousRetentionService,
  createAdminAccessService,
  createAdminAuditService,
  createAuditQueryService,
  createDatabaseAuditQueryRepository,
  createDatabaseAdminHealthService,
  createDatabaseAdminAccessRepository,
  createDatabaseAdminAuditRepository,
  createDatabaseRoleAssignmentRepository,
  createDatabaseReportRecoveryRepository,
  createDatabaseAdminOverviewRepository,
  createBirthProfileService,
  createConsentService,
  createDatabaseAuthEmailDeliveryStore,
  createDatabaseAnonymousRetentionRepository,
  createDatabaseBirthProfileRepository,
  createDatabaseReadingContextRepository,
  createDatabaseConsentRepository,
  createDatabaseDeletionRepository,
  createDatabaseZiweiCalculationRepository,
  createDatabaseZiweiQueryRepository,
  createDatabaseCommerceRepository,
  createSmtpEmailAdapter,
  createAdminOverviewService,
  createAdminBusinessMetricsService,
  createDatabaseAdminBusinessMetricsRepository,
  createRoleAssignmentService,
  createReportRecoveryService,
  createEvidenceService,
  createReadingContextService,
  createZiweiCalculationService,
  createZiweiQueryService,
  createDatabaseReportQueryRepository,
  createReportQueryService,
  createAccountCenterService,
  createAssetDownloadService,
  createDatabaseAssetDownloadRepository,
  createGarageAdapter,
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
import {
  READING_CONTEXT_DATABASE,
  READING_CONTEXT_SERVICE,
  READING_CONTEXT_SERVICE_SECRET,
  ReadingContextController,
} from "./birth-profile/reading-context.controller.js";
import {
  ADMIN_ACCESS_DATABASE,
  ADMIN_ACCESS_SERVICE,
  ADMIN_ACCESS_SERVICE_SECRET,
  ADMIN_AUDIT_SERVICE,
  AdminAccessController,
} from "./admin-access/admin-access.controller.js";
import {
  ADMIN_AUDIT_QUERY_SERVICE,
  ADMIN_ROLE_ASSIGNMENT_SERVICE,
  AdminRoleAuditController,
} from "./admin-access/admin-role-audit.controller.js";
import {
  ADMIN_REPORT_RECOVERY_SERVICE,
  AdminReportRecoveryController,
} from "./admin-access/admin-report-recovery.controller.js";
import {
  ADMIN_OVERVIEW_SERVICE,
  AdminOverviewController,
} from "./admin-overview/admin-overview.controller.js";
import {
  ADMIN_BUSINESS_METRICS_SERVICE,
  AdminBusinessMetricsController,
} from "./admin-overview/admin-business-metrics.controller.js";
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
import {
  REPORT_QUERY_DATABASE,
  REPORT_QUERY_SERVICE,
  REPORT_QUERY_SERVICE_SECRET,
  ReportsController,
} from "./reports/reports.controller.js";
import {
  ACCOUNT_CENTER_DATABASE,
  ACCOUNT_CENTER_SERVICE,
  ACCOUNT_CENTER_SERVICE_SECRET,
  AccountCenterController,
} from "./accounts/account-center.controller.js";
import {
  COMMERCE_ACTOR_SECRET,
  COMMERCE_DATABASE,
  COMMERCE_INGRESS_SECRET,
  COMMERCE_RETURN_ORIGIN,
  COMMERCE_SEPAY_ENV,
  COMMERCE_SEPAY_MERCHANT,
  COMMERCE_SEPAY_SECRET,
  COMMERCE_ORDER_TTL_SECONDS,
  COMMERCE_SEPAY_WEBHOOK_SECRET,
  COMMERCE_SEPAY_BANK_CODE,
  COMMERCE_SEPAY_ACCOUNT_NUMBER,
  COMMERCE_SEPAY_ACCOUNT_HOLDER,
  CommerceController,
} from "./commerce/commerce.controller.js";
import {
  ANALYTICS_SERVICE,
  AnalyticsController,
} from "./analytics/analytics.controller.js";
import {
  ANALYTICS_SERVICE_SECRET,
  AnalyticsServiceGuard,
} from "./analytics/analytics-service.guard.js";
import {
  ASSET_DOWNLOAD_DATABASE,
  ASSET_DOWNLOAD_SERVICE,
  ASSET_DOWNLOAD_SERVICE_SECRET,
  AssetsController,
} from "./assets/assets.controller.js";

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
    AnalyticsController,
    AuthEmailController,
    PrivacyController,
    BirthProfileController,
    ReadingContextController,
    ZiweiController,
    AdminAccessController,
    AdminRoleAuditController,
    AdminReportRecoveryController,
    AdminOverviewController,
    AdminBusinessMetricsController,
    CommerceController,
    ReportsController,
    AccountCenterController,
    AssetsController,
  ],
  providers: [
    AnalyticsServiceGuard,
    {
      provide: ANALYTICS_SERVICE,
      useFactory: () =>
        createAnalyticsService({
          repository: createDatabaseAnalyticsRepository(privacyDatabase()),
        }),
    },
    {
      provide: ANALYTICS_SERVICE_SECRET,
      useFactory: () => {
        const environment = applicationEnvironment();
        if (environment.internalActorSecret === undefined) {
          throw new Error("API_ACTOR_SECRET_CONFIG_INVALID");
        }
        return environment.internalActorSecret;
      },
    },
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
      provide: ADMIN_ACCESS_SERVICE,
      useFactory: () =>
        createAdminAccessService({
          repository: createDatabaseAdminAccessRepository(privacyDatabase()),
        }),
    },
    {
      provide: ADMIN_AUDIT_SERVICE,
      useFactory: () =>
        createAdminAuditService({
          repository: createDatabaseAdminAuditRepository(privacyDatabase()),
        }),
    },
    {
      provide: ADMIN_ACCESS_SERVICE_SECRET,
      useFactory: () => {
        const environment = applicationEnvironment();
        if (environment.internalActorSecret === undefined) {
          throw new Error("API_ACTOR_SECRET_CONFIG_INVALID");
        }
        return environment.internalActorSecret;
      },
    },
    { provide: ADMIN_ACCESS_DATABASE, useFactory: privacyDatabase },
    {
      provide: ADMIN_ROLE_ASSIGNMENT_SERVICE,
      useFactory: () => createRoleAssignmentService({
        repository: createDatabaseRoleAssignmentRepository(privacyDatabase()),
      }),
    },
    {
      provide: ADMIN_AUDIT_QUERY_SERVICE,
      useFactory: () => createAuditQueryService({
        repository: createDatabaseAuditQueryRepository(privacyDatabase()),
      }),
    },
    {
      provide: ADMIN_REPORT_RECOVERY_SERVICE,
      useFactory: () => createReportRecoveryService({
        repository: createDatabaseReportRecoveryRepository(privacyDatabase()),
      }),
    },
    {
      provide: ADMIN_OVERVIEW_SERVICE,
      useFactory: () => {
        const database = privacyDatabase();
        return createAdminOverviewService({
          repository: createDatabaseAdminOverviewRepository(database),
          health: createDatabaseAdminHealthService(database),
        });
      },
    },
    {
      provide: ADMIN_BUSINESS_METRICS_SERVICE,
      useFactory: () => {
        const database = privacyDatabase();
        return createAdminBusinessMetricsService({
          repository: createDatabaseAdminBusinessMetricsRepository(database),
        });
      },
    },
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
      provide: READING_CONTEXT_SERVICE,
      useFactory: () =>
        createReadingContextService({
          repository: createDatabaseReadingContextRepository(privacyDatabase()),
        }),
    },
    {
      provide: READING_CONTEXT_SERVICE_SECRET,
      useFactory: () => {
        const environment = applicationEnvironment();
        if (environment.internalActorSecret === undefined) {
          throw new Error("API_ACTOR_SECRET_CONFIG_INVALID");
        }
        return environment.internalActorSecret;
      },
    },
    { provide: READING_CONTEXT_DATABASE, useFactory: privacyDatabase },
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
    { provide: COMMERCE_DATABASE, useFactory: privacyDatabase },
    {
      provide: COMMERCE_ACTOR_SECRET,
      useFactory: () => applicationEnvironment().internalActorSecret
        ?? (() => { throw new Error("API_ACTOR_SECRET_CONFIG_INVALID"); })(),
    },
    {
      provide: COMMERCE_INGRESS_SECRET,
      useFactory: () => applicationEnvironment().internalActorSecret
        ?? (() => { throw new Error("API_INGRESS_SECRET_CONFIG_INVALID"); })(),
    },
    {
      provide: COMMERCE_SEPAY_SECRET,
      useFactory: () => {
        const sepay = applicationEnvironment().sepay;
        return sepay.environment === "disabled" ? undefined : sepay.secretKey;
      },
    },
    {
      provide: COMMERCE_SEPAY_ENV,
      useFactory: () => applicationEnvironment().sepay.environment,
    },
    {
      provide: COMMERCE_SEPAY_MERCHANT,
      useFactory: () => {
        const sepay = applicationEnvironment().sepay;
        return sepay.environment === "disabled" ? undefined : sepay.merchantId;
      },
    },
    {
      provide: COMMERCE_ORDER_TTL_SECONDS,
      useFactory: () => {
        const sepay = applicationEnvironment().sepay;
        return sepay.environment === "disabled" ? undefined : sepay.orderTtlSeconds;
      },
    },
    {
      provide: COMMERCE_SEPAY_WEBHOOK_SECRET,
      useFactory: () => {
        const sepay = applicationEnvironment().sepay;
        return sepay.environment === "disabled" ? undefined : sepay.webhookSecret;
      },
    },
    {
      provide: COMMERCE_SEPAY_BANK_CODE,
      useFactory: () => {
        const sepay = applicationEnvironment().sepay;
        return sepay.environment === "disabled" ? undefined : sepay.bankCode;
      },
    },
    {
      provide: COMMERCE_SEPAY_ACCOUNT_NUMBER,
      useFactory: () => {
        const sepay = applicationEnvironment().sepay;
        return sepay.environment === "disabled" ? undefined : sepay.accountNumber;
      },
    },
    {
      provide: COMMERCE_SEPAY_ACCOUNT_HOLDER,
      useFactory: () => {
        const sepay = applicationEnvironment().sepay;
        return sepay.environment === "disabled" ? undefined : sepay.accountHolder;
      },
    },
    {
      provide: COMMERCE_RETURN_ORIGIN,
      useFactory: () => applicationEnvironment().betterAuthUrl
        ?? (() => { throw new Error("API_PUBLIC_ORIGIN_CONFIG_INVALID"); })(),
    },
    {
      provide: ZIWEI_QUERY_SERVICE,
      useFactory: () =>
        createZiweiQueryService({
          repository: createDatabaseZiweiQueryRepository(privacyDatabase()),
          calculateHoroscope: calculateZiweiHoroscope,
        }),
    },
    { provide: REPORT_QUERY_DATABASE, useFactory: privacyDatabase },
    {
      provide: REPORT_QUERY_SERVICE_SECRET,
      useFactory: () => {
        const environment = applicationEnvironment();
        if (environment.internalActorSecret === undefined) {
          throw new Error("API_ACTOR_SECRET_CONFIG_INVALID");
        }
        return environment.internalActorSecret;
      },
    },
    {
      provide: REPORT_QUERY_SERVICE,
      useFactory: () =>
        createReportQueryService({
          repository: createDatabaseReportQueryRepository(privacyDatabase()),
        }),
    },
    {
      provide: ACCOUNT_CENTER_SERVICE,
      useFactory: () => createAccountCenterService(privacyDatabase()),
    },
    {
      provide: ACCOUNT_CENTER_SERVICE_SECRET,
      useFactory: () => {
        const environment = applicationEnvironment();
        if (environment.internalActorSecret === undefined) {
          throw new Error("API_ACTOR_SECRET_CONFIG_INVALID");
        }
        return environment.internalActorSecret;
      },
    },
    { provide: ACCOUNT_CENTER_DATABASE, useFactory: privacyDatabase },
    {
      provide: ASSET_DOWNLOAD_SERVICE,
      useFactory: () => {
        const environment = applicationEnvironment();
        const database = privacyDatabase();
        return createAssetDownloadService({
          repository: createDatabaseAssetDownloadRepository(database),
          objectStore: {
            async createSignedDownload(objectKey, options) {
              if (!environment.garage.enabled) {
                throw new Error("GARAGE_UNAVAILABLE");
              }
              return createGarageAdapter(environment.garage)
                .createSignedDownload(objectKey, options);
            },
          },
        });
      },
    },
    {
      provide: ASSET_DOWNLOAD_SERVICE_SECRET,
      useFactory: () => applicationEnvironment().internalActorSecret
        ?? (() => { throw new Error("API_ACTOR_SECRET_CONFIG_INVALID"); })(),
    },
    { provide: ASSET_DOWNLOAD_DATABASE, useFactory: privacyDatabase },
  ],
})
export class ApiModule {}
