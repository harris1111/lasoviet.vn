import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { sentryBuildOptions } from "./sentry-build";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  env: { NEXT_PUBLIC_SENTRY_CLIENT_ENABLED: process.env.NEXT_PUBLIC_SENTRY_CLIENT_ENABLED ?? "false" },
  serverExternalPackages: ["@lasoviet/config"],
};

const sentry = sentryBuildOptions(process.env);
export default sentry ? withSentryConfig(withNextIntl(nextConfig), sentry) : withNextIntl(nextConfig);
