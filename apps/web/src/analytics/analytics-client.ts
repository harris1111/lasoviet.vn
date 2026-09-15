import "server-only";

import { loadEnvironment } from "@lasoviet/config/load-environment";
import {
  AnalyticsIngestResponseV1Schema,
  type AnalyticsIngestErrorCode,
  type PrivateAnalyticsIngestRequestV1,
} from "@lasoviet/contracts";

import { createAnalyticsServiceToken } from "../auth/create-analytics-service-token";

function environment() {
  const result = loadEnvironment(process.env);
  if (!result.ok) {
    throw new Error("ANALYTICS_CONFIG_INVALID");
  }
  const { internalActorSecret, privateApiUrl, ...rest } = result.value;
  if (!internalActorSecret || !privateApiUrl) {
    throw new Error("ANALYTICS_CONFIG_INVALID");
  }
  return { ...rest, internalActorSecret, privateApiUrl };
}

export type SendAnalyticsResult =
  | { ok: true; value: { replayed: boolean } }
  | {
      ok: false;
      error: {
        code: AnalyticsIngestErrorCode | "ANALYTICS_DELIVERY_FAILED";
      };
    };

export async function sendAnalyticsIngestCommand(
  request: PrivateAnalyticsIngestRequestV1,
  options?: {
    privateApiUrl?: string;
    internalActorSecret?: string;
    fetchImpl?: typeof fetch;
  },
): Promise<SendAnalyticsResult> {
  try {
    const env =
      options?.privateApiUrl && options?.internalActorSecret
        ? {
            privateApiUrl: options.privateApiUrl,
            internalActorSecret: options.internalActorSecret,
          }
        : environment();

    const fetchFn = options?.fetchImpl ?? fetch;
    const token = await createAnalyticsServiceToken(
      request,
      env.internalActorSecret,
    );

    const response = await fetchFn(`${env.privateApiUrl}/internal/analytics/events`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-request-id": request.requestId,
      },
      body: JSON.stringify(request),
      cache: "no-store",
    });

    const rawJson = await response.json().catch(() => null);
    const parsed = AnalyticsIngestResponseV1Schema.safeParse(rawJson);
    if (!parsed.success) {
      return { ok: false, error: { code: "ANALYTICS_DELIVERY_FAILED" } };
    }

    if (response.ok && parsed.data.ok) {
      return { ok: true, value: { replayed: parsed.data.value.replayed } };
    }
    if (!parsed.data.ok) {
      return { ok: false, error: { code: parsed.data.error.code } };
    }
    return { ok: false, error: { code: "ANALYTICS_DELIVERY_FAILED" } };
  } catch {
    return { ok: false, error: { code: "ANALYTICS_DELIVERY_FAILED" } };
  }
}
