import { captureException } from "@sentry/nextjs";

/** Capture the call site of a handled failure without accepting response, URL or customer data. */
export function captureClientFailure(): void {
  if (process.env.NEXT_PUBLIC_SENTRY_CLIENT_ENABLED !== "true") return;
  try { captureException(new Error("Client operation failed (details redacted)")); }
  catch { /* Observability cannot change the result of an authentication operation. */ }
}
