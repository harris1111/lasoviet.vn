import "server-only";

import { randomUUID } from "node:crypto";
import type {
  CanonicalAnalyticsEventName,
  PrivateAnalyticsIngestRequestV1,
} from "@lasoviet/contracts";

import {
  sendAnalyticsIngestCommand,
} from "./analytics-client";
import { getOrReconcileVisitorId } from "./visitor-cookie";

export type ServerAnalyticsEventParams = {
  name: CanonicalAnalyticsEventName;
  properties: PrivateAnalyticsIngestRequestV1["event"]["properties"];
  userId: string;
  idempotencyKey: string;
  occurredAt?: Date | string;
  requestId?: string;
};

export type ServerAnalyticsDependencies = {
  getVisitorId?: () => Promise<string>;
  sendIngestCommand?: typeof sendAnalyticsIngestCommand;
  now?: () => Date;
};

export type ServerAnalyticsResult =
  | { ok: true; replayed: boolean }
  | { ok: false; code: string };

export async function sendServerAnalyticsEvent(
  params: ServerAnalyticsEventParams,
  dependencies?: ServerAnalyticsDependencies,
): Promise<ServerAnalyticsResult> {
  const getVisitorIdFn =
    dependencies?.getVisitorId ?? getOrReconcileVisitorId;
  const sendFn =
    dependencies?.sendIngestCommand ?? sendAnalyticsIngestCommand;
  const getNow = dependencies?.now ?? (() => new Date());

  let visitorId: string;
  try {
    visitorId = await getVisitorIdFn();
  } catch {
    console.warn(
      "[analytics] server event visitor cookie reconciliation failed",
    );
    return { ok: false, code: "VISITOR_ID_UNAVAILABLE" };
  }

  if (!visitorId || typeof visitorId !== "string" || visitorId.trim() === "") {
    console.warn("[analytics] server event visitor cookie invalid");
    return { ok: false, code: "VISITOR_ID_UNAVAILABLE" };
  }

  const occurredAtIso =
    params.occurredAt instanceof Date
      ? params.occurredAt.toISOString()
      : typeof params.occurredAt === "string" &&
          params.occurredAt.trim() !== ""
        ? params.occurredAt.trim()
        : getNow().toISOString();

  const requestId =
    params.requestId &&
    params.requestId.trim().length > 0 &&
    params.requestId.trim().length <= 128
      ? params.requestId.trim()
      : randomUUID();

  try {
    const result = await sendFn({
      version: 1,
      idempotencyKey: params.idempotencyKey,
      occurredAt: occurredAtIso,
      event: {
        name: params.name,
        properties: params.properties,
      },
      visitorId: visitorId.trim(),
      userId: params.userId,
      requestId,
    });

    if (result.ok) {
      return { ok: true, replayed: result.value.replayed };
    }
    return { ok: false, code: result.error.code };
  } catch {
    return { ok: false, code: "ANALYTICS_DELIVERY_FAILED" };
  }
}
