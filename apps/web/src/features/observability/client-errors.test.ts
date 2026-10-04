import { describe, expect, it } from "vitest";
import { clientErrorOptions, projectClientError, readClientErrorConfiguration } from "./client-errors";
import { sentryBuildOptions } from "../../../sentry-build";
import type { ErrorEvent } from "@sentry/nextjs";

const values = { enabled: "true", dsn: `https://${"a".repeat(32)}@o123.ingest.us.sentry.io/456`, release: "b".repeat(40), environment: "production" };
const config = readClientErrorConfiguration(values)!;
const asset = "https://lasoviet.net/_next/static/chunks/abc-123.js";
const event: ErrorEvent = {
  type: undefined,
  event_id: "c".repeat(32), message: "birth 1990 token secret", user: { email: "private@example.test" },
  request: { url: "https://lasoviet.net/la-so/private-id?token=secret", cookies: {session: "secret"} },
  breadcrumbs: [{ message: "private birth" }], extra: { report: "private report" },
  contexts: { trace: { trace_id: "d".repeat(32), span_id: "e".repeat(16) } }, tags: { chartId: "private-id" },
  exception: { values: [{ type: "TypeError", value: "private birth", stacktrace: { frames: [
    { filename: asset, lineno: 12, colno: 34, function: "private-id", pre_context: ["secret"], vars: { token: "secret" } },
    { filename: "https://extension.test/x.js", lineno: 1 },
  ] } }] },
  debug_meta: { images: [{ type: "sourcemap", code_file: asset, debug_id: "12345678-1234-1234-1234-123456789abc" }] },
};
describe("client error boundary", () => {
  it("requires explicit, complete trusted build configuration", () => {
    expect(config).toEqual({ dsn: values.dsn, release: values.release, environment: "production" });
    for (const override of [{enabled: undefined}, {dsn: undefined}, {release: "latest"}, {environment: "owner-email"},
      {dsn: values.dsn + "?token=secret"}, {dsn: values.dsn.replace("sentry.io", "attacker.test")},
      {dsn: values.dsn.replace("https", "http")}, {dsn: values.dsn.replace("@", ":secret@")},
      {dsn: values.dsn.replace("/456", "/456/other")}]) expect(readClientErrorConfiguration({...values, ...override})).toBeNull();
  });
  it("retains useful static asset line/column and debug ID, dropping arbitrary private fields", () => {
    const projected = projectClientError(event, config)!;
    expect(projected.exception?.values?.[0]?.stacktrace?.frames).toEqual([{filename: asset, lineno: 12, colno: 34, in_app: true}]);
    expect(projected.debug_meta?.images).toHaveLength(1);
    expect(projected.release).toBe(values.release);
    expect(JSON.stringify(projected)).not.toMatch(/private|secret|birth|token|email|report|cookie|contexts|tags|pre_context|vars/);
  });
  it("rejects page, query, traversal, extension and inline-only stacks", () => {
    for (const filename of [asset + "?token=secret", "/la-so/private-id", "https://evil.test/_next/static/chunks/a.js", "/_next/static/../chunks/a.js", "data:secret", "webpack://source.ts", "<anonymous>"]) {
      expect(projectClientError({type: undefined, exception: {values: [{stacktrace: {frames: [{filename, lineno: 1}]}}]}}, config)).toBeNull();
    }
    expect(projectClientError({type: undefined, message: "private"}, config)).toBeNull();
    expect(projectClientError({...event, debug_meta: {images: [{type: "sourcemap", code_file: asset, debug_id: "private"}]}}, config)?.debug_meta).toBeUndefined();
  });
  it("has no default integrations, sessions, breadcrumbs, tracing, replay, logs or metrics", () => {
    const options = clientErrorOptions(config);
    expect(options.defaultIntegrations).toBe(false); expect(options.dataCollection?.userInfo).toBe(false);
    expect(options.dataCollection?.httpBodies).toEqual([]);
    expect(options.tracesSampleRate).toBeUndefined(); expect(options.tracesSampler).toBeUndefined();
    expect(options.tracePropagationTargets).toEqual([]); expect(options.sendClientReports).toBe(false);
    expect(options.replaysOnErrorSampleRate).toBe(0); expect(options.replaysSessionSampleRate).toBe(0);
    expect(options.beforeSendLog?.({} as never)).toBeNull(); expect(options.beforeSendMetric?.({} as never)).toBeNull();
  });
  it("does not configure uploads while disabled; enabled incomplete builds fail closed", () => {
    expect(sentryBuildOptions({})).toBeNull();
    const env = {NEXT_PUBLIC_SENTRY_CLIENT_ENABLED: values.enabled, NEXT_PUBLIC_SENTRY_DSN: values.dsn,
      NEXT_PUBLIC_SENTRY_RELEASE: values.release, NEXT_PUBLIC_SENTRY_ENVIRONMENT: values.environment,
      SENTRY_ORG: "owner-org", SENTRY_PROJECT: "web", SENTRY_AUTH_TOKEN: "test-placeholder-not-real"};
    expect(() => sentryBuildOptions({...env, SENTRY_AUTH_TOKEN: ""})).toThrow(/private source-map/);
    const options = sentryBuildOptions(env)!;
    expect(options.sourcemaps?.deleteSourcemapsAfterUpload).toBe(true);
    expect(options.buildTimeInstrumentation).toBe(false);
    expect(options.release?.name).toBe(values.release);
    expect(() => options.errorHandler?.(new Error("private token"))).toThrow("Private client source-map upload failed");
  });
});
