import type { SentryBuildOptions } from "@sentry/nextjs/config";
import { readClientErrorConfiguration } from "./src/features/observability/client-errors";

export function sentryBuildOptions(env: Record<string, string | undefined>): SentryBuildOptions | null {
  if (env.NEXT_PUBLIC_SENTRY_CLIENT_ENABLED !== "true") return null;
  const client = readClientErrorConfiguration({ enabled: env.NEXT_PUBLIC_SENTRY_CLIENT_ENABLED,
    dsn: env.NEXT_PUBLIC_SENTRY_DSN, release: env.NEXT_PUBLIC_SENTRY_RELEASE,
    environment: env.NEXT_PUBLIC_SENTRY_ENVIRONMENT });
  if (!client || !/^[a-z0-9_-]{1,100}$/.test(env.SENTRY_ORG ?? "") || !/^[a-z0-9_-]{1,100}$/.test(env.SENTRY_PROJECT ?? "") || !env.SENTRY_AUTH_TOKEN) {
    throw new Error("Client error monitoring requires valid configuration and a private source-map build secret");
  }
  return {
    org: env.SENTRY_ORG, project: env.SENTRY_PROJECT, authToken: env.SENTRY_AUTH_TOKEN,
    release: { name: client.release, create: true, finalize: true },
    sourcemaps: { deleteSourcemapsAfterUpload: true }, buildTimeInstrumentation: false,
    webpack: { autoInstrumentServerFunctions: false, autoInstrumentMiddleware: false, autoInstrumentAppDirectory: false },
    reactComponentAnnotation: { enabled: false }, suppressOnRouterTransitionStartWarning: true,
    silent: true, errorHandler: () => { throw new Error("Private client source-map upload failed"); },
  };
}
