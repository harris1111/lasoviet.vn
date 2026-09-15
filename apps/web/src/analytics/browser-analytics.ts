"use client";

import type { CanonicalAnalyticsEventName } from "@lasoviet/contracts";

export type BrowserAnalyticsOptions = {
  idempotencyKey?: string;
  occurredAt?: string;
  fetchImpl?: typeof fetch;
};

export async function sendBrowserAnalyticsEvent(
  name: CanonicalAnalyticsEventName,
  properties: Record<string, unknown>,
  options?: BrowserAnalyticsOptions,
): Promise<void> {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    return;
  }

  const idempotencyKey = options?.idempotencyKey ?? crypto.randomUUID();
  const occurredAt = options?.occurredAt ?? new Date().toISOString();
  const fetchFn = options?.fetchImpl ?? fetch;

  const body = {
    version: 1,
    idempotencyKey,
    occurredAt,
    event: {
      name,
      properties,
    },
  };

  try {
    await fetchFn("/api/analytics/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify(body),
    });
  } catch {
    // Analytics failure must never throw or show UI
  }
}
