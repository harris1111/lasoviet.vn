import type { ErrorEvent, BrowserOptions } from "@sentry/nextjs";

export interface ClientErrorConfiguration {
  dsn: string;
  release: string;
  environment: "production" | "staging";
}

/** Only owner-configured Sentry SaaS ingestion is allowed; incomplete builds stay off. */
export function readClientErrorConfiguration(values: {
  enabled?: string; dsn?: string; release?: string; environment?: string;
}): ClientErrorConfiguration | null {
  if (values.enabled !== "true" || !values.release || !/^[a-f0-9]{40}$/.test(values.release)) return null;
  if (values.environment !== "production" && values.environment !== "staging") return null;
  try {
    const dsn = new URL(values.dsn ?? "");
    if (dsn.protocol !== "https:" || !/^[a-f0-9]{32}$/.test(dsn.username) || dsn.password || dsn.port || dsn.search || dsn.hash) return null;
    if (!/^o[0-9]+\.ingest(?:\.(?:us|de))?\.sentry\.io$/.test(dsn.hostname) || !/^\/[0-9]+$/.test(dsn.pathname)) return null;
    return { dsn: dsn.href, release: values.release, environment: values.environment };
  } catch { return null; }
}

function staticAsset(filename: string | undefined): string | null {
  if (!filename || filename.length > 512) return null;
  // No full page URLs, query strings, source text, extension frames or user filenames.
  const path = filename.startsWith("https://lasoviet.net/") ? filename.slice("https://lasoviet.net".length) : filename;
  return /^\/_next\/static\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.js$/.test(path) && !path.includes("..")
    ? `https://lasoviet.net${path}` : null;
}

/** Rebuild the event from a closed projection instead of attempting to redact arbitrary fields. */
export function projectClientError(event: ErrorEvent, config: ClientErrorConfiguration): ErrorEvent | null {
  const values = event.exception?.values?.slice(-3).flatMap((exception) => {
    const frames = exception.stacktrace?.frames?.slice(-40).flatMap((frame) => {
      const filename = staticAsset(frame.filename);
      if (!filename || !Number.isSafeInteger(frame.lineno) || (frame.lineno ?? 0) < 1) return [];
      return [{ filename, lineno: frame.lineno, ...(Number.isSafeInteger(frame.colno) && (frame.colno ?? -1) >= 0 ? { colno: frame.colno } : {}), in_app: true }];
    });
    if (!frames?.length) return [];
    const type = ["Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError", "URIError", "EvalError"].includes(exception.type ?? "") ? exception.type : "Error";
    return [{ type, value: "Client runtime error (details redacted)", stacktrace: { frames } }];
  });
  if (!values?.length) return null;
  const images = event.debug_meta?.images?.flatMap((image) => {
    if (image.type !== "sourcemap") return [];
    const code_file = staticAsset(image.code_file);
    return code_file && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(image.debug_id ?? "")
      ? [{ type: "sourcemap" as const, code_file, debug_id: image.debug_id }] : [];
  });
  return {
    ...(event.event_id && /^[a-f0-9]{32}$/.test(event.event_id) ? { event_id: event.event_id } : {}),
    type: undefined, platform: "javascript", level: "error", release: config.release, environment: config.environment,
    exception: { values }, ...(images?.length ? { debug_meta: { images } } : {}),
  };
}

export function clientErrorOptions(config: ClientErrorConfiguration): BrowserOptions {
  return {
    ...config, enabled: true, defaultIntegrations: false,
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false,
      graphQL: {document: false, variables: false}, genAI: {inputs: false, outputs: false},
      databaseQueryData: false, queues: false, stackFrameVariables: false, frameContextLines: 0 },
    maxBreadcrumbs: 0, sendClientReports: false, sampleRate: 1,
    // Omit tracing rates entirely: in SDK11 even a defined zero rate enables tracing.
    tracePropagationTargets: [], replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0,
    profileSessionSampleRate: 0, spotlight: false,
    beforeBreadcrumb: () => null, beforeSendLog: () => null, beforeSendMetric: () => null,
    beforeSendTransaction: () => null,
    beforeSend: (event) => projectClientError(event, config),
  };
}
