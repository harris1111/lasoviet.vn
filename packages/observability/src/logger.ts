import pino, { type Logger } from "pino";

import type { RequestContext } from "./request-context.js";

const REDACTED_FIELDS = [
  "password",
  "apiKey",
  "birthProfile",
  "reportContent",
  "signedUrl",
  "*.password",
  "*.apiKey",
  "*.birthProfile",
  "*.reportContent",
  "*.signedUrl",
];

export function createLogger(
  serviceName: string,
  context: RequestContext = {},
): Logger {
  return pino(
    {
      base: {
        service: serviceName,
        ...context,
      },
      redact: {
        paths: REDACTED_FIELDS,
        censor: "[Redacted]",
      },
    },
    process.stdout,
  );
}
