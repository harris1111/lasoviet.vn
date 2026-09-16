import { NextResponse } from "next/server";
import type { CurrentActor } from "@lasoviet/contracts";

const NO_STORE_HEADERS = {
  "cache-control": "no-store",
};

const GARAGE_ORIGIN = "http://garage:3900";
const ASSET_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PDF_SIGNATURE = new TextEncoder().encode("%PDF-");

type DownloadRouteContext = {
  params: Promise<{ assetId: string }>;
};

type DownloadGrant = {
  url: URL;
  expiresAt: Date;
};

export type AssetDownloadRouteHandlerDependencies = {
  now?: () => Date;
  resolveActor?: () => Promise<Extract<CurrentActor, { kind: "account" }>>;
  apiClient?: (
    actor: CurrentActor,
    requestId: string,
  ) => {
    request<T>(path: string, init?: RequestInit): Promise<T>;
  };
  fetch?: (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>;
  isPrivateApiClientError?: (
    error: unknown,
  ) => error is { code: string; status?: number };
};

function defaultIsPrivateApiClientError(
  error: unknown,
): error is { code: string; status?: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "PrivateApiClientError" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404, headers: NO_STORE_HEADERS });
}

function unavailable(): NextResponse {
  return new NextResponse(null, { status: 503, headers: NO_STORE_HEADERS });
}

function isAssetId(value: unknown): value is string {
  return typeof value === "string" && ASSET_ID_PATTERN.test(value);
}

function parseDownloadGrant(value: unknown): DownloadGrant | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).length !== 2 ||
    !Object.hasOwn(value, "url") ||
    !Object.hasOwn(value, "expiresAt")
  ) {
    return null;
  }

  const { url, expiresAt } = value as { url: unknown; expiresAt: unknown };
  if (typeof url !== "string" || typeof expiresAt !== "string") {
    return null;
  }

  let parsedUrl: URL;
  let parsedExpiresAt: Date;
  try {
    parsedUrl = new URL(url);
    parsedExpiresAt = new Date(expiresAt);
  } catch {
    return null;
  }

  if (
    parsedUrl.origin !== GARAGE_ORIGIN ||
    parsedUrl.username !== "" ||
    parsedUrl.password !== "" ||
    parsedUrl.hash !== "" ||
    !Number.isFinite(parsedExpiresAt.getTime()) ||
    parsedExpiresAt.toISOString() !== expiresAt
  ) {
    return null;
  }

  return { url: parsedUrl, expiresAt: parsedExpiresAt };
}

function isPdf(response: Response): boolean {
  const contentType = response.headers.get("content-type");
  return (
    contentType !== null &&
    contentType.split(";", 1)[0]?.trim().toLowerCase() === "application/pdf"
  );
}

async function cancelReader(reader: ReadableStreamDefaultReader<Uint8Array>) {
  try {
    await reader.cancel();
  } catch {
    // The provider stream is already unusable, so cancellation errors are ignored.
  }
}

async function validateAndReplayPdfStream(
  source: ReadableStream<Uint8Array>,
): Promise<ReadableStream<Uint8Array> | null> {
  const reader = source.getReader();
  const replayChunks: Uint8Array[] = [];
  const signature = new Uint8Array(PDF_SIGNATURE.length);
  let signatureLength = 0;

  try {
    while (signatureLength < PDF_SIGNATURE.length) {
      const { done, value } = await reader.read();
      if (done || value === undefined) {
        await cancelReader(reader);
        return null;
      }

      replayChunks.push(value);
      const bytesToCopy = Math.min(
        value.length,
        PDF_SIGNATURE.length - signatureLength,
      );
      signature.set(value.subarray(0, bytesToCopy), signatureLength);
      signatureLength += bytesToCopy;
    }
  } catch {
    await cancelReader(reader);
    return null;
  }

  for (let index = 0; index < PDF_SIGNATURE.length; index += 1) {
    if (signature[index] !== PDF_SIGNATURE[index]) {
      await cancelReader(reader);
      return null;
    }
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const replayChunk = replayChunks.shift();
      if (replayChunk !== undefined) {
        controller.enqueue(replayChunk);
        return;
      }

      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
        } else if (value !== undefined) {
          controller.enqueue(value);
        }
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel(reason) {
      await reader.cancel(reason);
    },
  });
}

export function createAssetDownloadRouteHandler(
  dependencies: AssetDownloadRouteHandlerDependencies = {},
) {
  const now = dependencies.now ?? (() => new Date());
  const isApiError =
    dependencies.isPrivateApiClientError ?? defaultIsPrivateApiClientError;

  return async function GET(
    _request: Request,
    context: DownloadRouteContext,
  ): Promise<Response> {
    let assetId: string;
    try {
      ({ assetId } = await context.params);
    } catch {
      return notFound();
    }
    if (!isAssetId(assetId)) {
      return notFound();
    }

    const resolveActor =
      dependencies.resolveActor ??
      (async () => {
        const { resolveVerifiedAccountActor } = await import(
          "../../../../auth/resolve-current-actor"
        );
        return resolveVerifiedAccountActor();
      });

    let actor: Extract<CurrentActor, { kind: "account" }>;
    try {
      actor = await resolveActor();
    } catch {
      return notFound();
    }

    const getApiClient =
      dependencies.apiClient ??
      ((currentActor: CurrentActor, requestId: string) => ({
        async request<T>(path: string, init?: RequestInit): Promise<T> {
          const { privateApiClient } = await import(
            "../../../../api/private-api-client"
          );
          return privateApiClient(currentActor, requestId).request<T>(path, init);
        },
      }));

    let rawGrant: unknown;
    try {
      rawGrant = await getApiClient(actor, actor.requestId).request<unknown>(
        `/assets/${encodeURIComponent(assetId)}/download`,
      );
    } catch (error) {
      if (isApiError(error) && error.status === 404) {
        return notFound();
      }
      return unavailable();
    }

    const grant = parseDownloadGrant(rawGrant);
    if (grant === null || grant.expiresAt.getTime() <= now().getTime()) {
      return unavailable();
    }

    const fetchSignedUrl = dependencies.fetch ?? fetch;
    let providerResponse: Response;
    try {
      providerResponse = await fetchSignedUrl(grant.url, { redirect: "manual" });
    } catch {
      return unavailable();
    }

    if (
      grant.expiresAt.getTime() <= now().getTime() ||
      !providerResponse.ok ||
      providerResponse.type === "opaqueredirect" ||
      providerResponse.status >= 300 ||
      providerResponse.status < 200 ||
      !isPdf(providerResponse) ||
      providerResponse.body === null
    ) {
      return unavailable();
    }

    const pdfStream = await validateAndReplayPdfStream(providerResponse.body);
    if (pdfStream === null) {
      return unavailable();
    }

    return new Response(pdfStream, {
      status: 200,
      headers: {
        ...NO_STORE_HEADERS,
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="lasoviet-report-${assetId}.pdf"`,
      },
    });
  };
}

export const GET = createAssetDownloadRouteHandler();
