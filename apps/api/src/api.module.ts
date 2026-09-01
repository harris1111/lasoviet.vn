import { Module } from "@nestjs/common";

import { loadEnvironment } from "@lasoviet/config";
import {
  createAuthEmailDeliveryService,
  createDatabaseAuthEmailDeliveryStore,
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

@Module({
  controllers: [HealthController, AuthEmailController],
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
  ],
})
export class ApiModule {}
