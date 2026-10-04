import { browserApiErrorsIntegration, globalHandlersIntegration, init } from "@sentry/nextjs";
import { clientErrorOptions, readClientErrorConfiguration } from "./features/observability/client-errors";

if (process.env.NEXT_PUBLIC_SENTRY_CLIENT_ENABLED === "true") {
  const configuration = readClientErrorConfiguration({
    enabled: process.env.NEXT_PUBLIC_SENTRY_CLIENT_ENABLED,
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  });

  if (configuration) {
    try {
      init({ ...clientErrorOptions(configuration), integrations: [globalHandlersIntegration(), browserApiErrorsIntegration()] });
    } catch {
      // Observability must never interrupt hydration or expose configuration in the console.
    }
  }

}
