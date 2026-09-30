import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { loadEnvironment } from "@lasoviet/config/load-environment";
import { CANONICAL_ORIGIN } from "../../../../routing/canonical-origin";
import { createDatabase, type Database } from "@lasoviet/database/runtime";
import {
  createDatabaseNotificationPreferenceStore,
  type NotificationPreferenceStore,
} from "@lasoviet/backend/notifications/notification-preference";

export const NO_STORE_NO_REFERRER_HEADERS = {
  "cache-control": "no-store, no-cache, must-revalidate",
  "referrer-policy": "no-referrer",
} as const;

export const MAX_UNSUBSCRIBE_BODY_BYTES = 4096;

const UnsubscribeBodySchema = z
  .object({
    token: z.string().trim().min(1).max(2048),
  })
  .strict();

export type UnsubscribeRouteHandlerDependencies = {
  preferenceStore?: NotificationPreferenceStore;
  canonicalOrigin?: string;
  database?: Database;
  secret?: string;
  now?: () => Date;
  getDefaultStore?: () => {
    store: NotificationPreferenceStore;
    canonicalOrigin: string;
  } | null;
};

// Lazy server-side singleton pool reuse
let cachedStore: NotificationPreferenceStore | null = null;
let cachedDatabase: Database | null = null;
let cachedConfig: {
  canonicalOrigin: string;
  secret: string;
} | null = null;

export function getOrCreateDefaultStore(): {
  store: NotificationPreferenceStore;
  canonicalOrigin: string;
} | null {
  if (cachedStore && cachedConfig) {
    return { store: cachedStore, canonicalOrigin: cachedConfig.canonicalOrigin };
  }

  try {
    const env = loadEnvironment(process.env);
    if (
      !env.ok ||
      !env.value.databaseUrl ||
      !env.value.internalActorSecret ||
      env.value.internalActorSecret.trim() === ""
    ) {
      return null;
    }

  const secret = env.value.internalActorSecret.trim();
  const canonicalOrigin = (
    env.value.betterAuthUrl ? new URL(env.value.betterAuthUrl).origin : CANONICAL_ORIGIN
  ).toLowerCase();

  if (!cachedDatabase) {
    cachedDatabase = createDatabase(env.value.databaseUrl);
  }

  cachedStore = createDatabaseNotificationPreferenceStore(cachedDatabase, secret);
  cachedConfig = { canonicalOrigin, secret };

  return { store: cachedStore, canonicalOrigin };
  } catch {
    return null;
  }
}

type ReadBodyResult =
  | { ok: true; body: Uint8Array }
  | { ok: false; status: 400 | 413 };

async function readBoundedBodyStream(request: Request | NextRequest): Promise<ReadBodyResult> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const trimmed = contentLength.trim();
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed.toString() !== trimmed) {
      return { ok: false, status: 400 };
    }
    if (parsed > MAX_UNSUBSCRIBE_BODY_BYTES) {
      return { ok: false, status: 413 };
    }
  }

  if (request.body === null) {
    return { ok: true, body: new Uint8Array(0) };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_UNSUBSCRIBE_BODY_BYTES) {
        await reader.cancel("PAYLOAD_TOO_LARGE");
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }
  } catch (error) {
    if (typeof error === "object" && error !== null && "status" in error) {
      return { ok: false, status: 413 };
    }
    return { ok: false, status: 400 };
  }

  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, body: result };
}

export function createUnsubscribeRouteHandler(
  dependencies: UnsubscribeRouteHandlerDependencies = {},
) {
  return async function POST(request: Request | NextRequest): Promise<Response> {
    // 1. Require application/json strictly
    const contentType = request.headers.get("content-type");
    const mimeType = contentType ? contentType.split(";")[0]?.trim().toLowerCase() : "";
    if (mimeType !== "application/json") {
      return NextResponse.json(
        { ok: false, error: { code: "UNSUPPORTED_MEDIA_TYPE" } },
        { status: 415, headers: NO_STORE_NO_REFERRER_HEADERS },
      );
    }

    // 2. Reject missing/null/wrong Origin and cross-site fetch
    const origin = request.headers.get("origin");
    if (!origin || origin.trim() === "") {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN" } },
        { status: 403, headers: NO_STORE_NO_REFERRER_HEADERS },
      );
    }

    const secFetchSite = request.headers.get("sec-fetch-site");
    if (secFetchSite === "cross-site") {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN" } },
        { status: 403, headers: NO_STORE_NO_REFERRER_HEADERS },
      );
    }

    // 3. Resolve store & canonicalOrigin
    let store: NotificationPreferenceStore;
    let expectedOrigin: string;

    if (dependencies.preferenceStore) {
      store = dependencies.preferenceStore;
      expectedOrigin = (
        dependencies.canonicalOrigin ?? CANONICAL_ORIGIN
      ).toLowerCase();
    } else {
      let defaultPool: {
        store: NotificationPreferenceStore;
        canonicalOrigin: string;
      } | null = null;

      try {
        const getStoreFn = dependencies.getDefaultStore ?? getOrCreateDefaultStore;
        defaultPool = getStoreFn();
      } catch {
        return NextResponse.json(
          { ok: false, error: { code: "SERVICE_UNAVAILABLE" } },
          { status: 503, headers: NO_STORE_NO_REFERRER_HEADERS },
        );
      }

      if (!defaultPool) {
        return NextResponse.json(
          { ok: false, error: { code: "SERVICE_UNAVAILABLE" } },
          { status: 503, headers: NO_STORE_NO_REFERRER_HEADERS },
        );
      }
      store = defaultPool.store;
      expectedOrigin = (
        dependencies.canonicalOrigin ?? defaultPool.canonicalOrigin
      ).toLowerCase();
    }

    if (origin.trim().toLowerCase() !== expectedOrigin) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN" } },
        { status: 403, headers: NO_STORE_NO_REFERRER_HEADERS },
      );
    }

    // 4. Actual 4096-byte streaming body read
    const bodyResult = await readBoundedBodyStream(request);
    if (!bodyResult.ok) {
      return NextResponse.json(
        { ok: false, error: { code: "UNSUBSCRIBE_TOKEN_INVALID" } },
        { status: bodyResult.status, headers: NO_STORE_NO_REFERRER_HEADERS },
      );
    }

    let bodyJson: unknown;
    try {
      const text = new TextDecoder().decode(bodyResult.body);
      bodyJson = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { ok: false, error: { code: "UNSUBSCRIBE_TOKEN_INVALID" } },
        { status: 400, headers: NO_STORE_NO_REFERRER_HEADERS },
      );
    }

    const parsedBody = UnsubscribeBodySchema.safeParse(bodyJson);
    if (!parsedBody.success) {
      return NextResponse.json(
        { ok: false, error: { code: "UNSUBSCRIBE_TOKEN_INVALID" } },
        { status: 400, headers: NO_STORE_NO_REFERRER_HEADERS },
      );
    }

    // 5. Catch all store/DB errors to generic 503 with no raw data
    try {
      const result = await store.unsubscribeByToken(parsedBody.data.token);
      if (!result.ok) {
        return NextResponse.json(
          { ok: false, error: { code: "UNSUBSCRIBE_TOKEN_INVALID" } },
          { status: 400, headers: NO_STORE_NO_REFERRER_HEADERS },
        );
      }
    } catch {
      return NextResponse.json(
        { ok: false, error: { code: "SERVICE_UNAVAILABLE" } },
        { status: 503, headers: NO_STORE_NO_REFERRER_HEADERS },
      );
    }

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: NO_STORE_NO_REFERRER_HEADERS },
    );
  };
}

export async function GET(): Promise<Response> {
  return NextResponse.json(
    { ok: false, error: { code: "METHOD_NOT_ALLOWED" } },
    { status: 405, headers: NO_STORE_NO_REFERRER_HEADERS },
  );
}

export const POST = createUnsubscribeRouteHandler();
