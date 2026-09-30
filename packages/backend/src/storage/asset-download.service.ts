import { createDatabaseReportQueryRepository } from "../reports/report-query.repository.js";
import { createReportQueryService } from "../reports/report-query.service.js";
import { and, eq } from "drizzle-orm";
import type { CurrentActor, Result } from "@lasoviet/contracts";
import {
  reportAssets,
  reportReservations,
  type Database,
} from "@lasoviet/database";

import type { ObjectStore } from "./object-store.js";

const DOWNLOAD_TTL_SECONDS = 120;

export type AssetDownloadError =
  | "ASSET_FORBIDDEN"
  | "SIGNED_URL_EXPIRED"
  | "ASSET_UNAVAILABLE";

export type AssetDownload = {
  url: string;
  expiresAt: string;
};

export type AssetDownloadRepository = {
  findOwnedStoredPdf(
    assetId: string,
    ownerId: string,
  ): Promise<{ objectKey: string } | null>;
};

export function createDatabaseAssetDownloadRepository(
  database: Database,
): AssetDownloadRepository {
  return {
    async findOwnedStoredPdf(assetId, ownerId) {
      const [asset] = await database
        .select({ objectKey: reportAssets.objectKey, reportId: reportReservations.reportId })
        .from(reportAssets)
        .innerJoin(
          reportReservations,
          eq(reportReservations.reportVersionId, reportAssets.reportVersionId),
        )
        .where(
          and(
            eq(reportAssets.id, assetId),
            eq(reportAssets.status, "stored"),
            eq(reportAssets.mediaType, "application/pdf"),
          ),
        )
        .limit(1);
      if (!asset) return null;
      try {
        const record = await createDatabaseReportQueryRepository(database).readAuthorizedReport(ownerId, asset.reportId);
        if (!record?.entitlements.some((entitlement) => entitlement.active && entitlement.sku === "ZIWEI-IDENTITY-P0")) return null;
        const query = createReportQueryService({ repository: { readAuthorizedReport: async () => record } });
        const result = await query.getReport({ kind: "account", userId: ownerId, sessionId: "asset-download", requestId: "asset-download" }, asset.reportId);
        if (!result.ok || !("state" in result.value) || result.value.state !== "ready") return null;
        const report = result.value;
        if (report.contentVersion === "ziwei-palaces.v1" || "lockedSections" in report.content) return null;
        return { objectKey: asset.objectKey };
      } catch {
        return null;
      }
    },
  };
}

export function createAssetDownloadService(options: {
  repository: AssetDownloadRepository;
  objectStore: Pick<ObjectStore, "createSignedDownload">;
  ttlSeconds?: number;
  now?: () => Date;
}) {
  const ttlSeconds = options.ttlSeconds ?? DOWNLOAD_TTL_SECONDS;
  const now = options.now ?? (() => new Date());
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error("ASSET_DOWNLOAD_INVALID_TTL");
  }

  const forbidden = (): Result<AssetDownload, "ASSET_FORBIDDEN"> => ({
    ok: false,
    error: {
      code: "ASSET_FORBIDDEN",
      messageKey: "assets.download_not_found",
      retryable: false,
    },
  });

  return {
    async createDownload(
      actor: CurrentActor,
      assetId: string,
    ): Promise<Result<AssetDownload, AssetDownloadError>> {
      if (actor.kind !== "account" || !assetId.trim()) {
        return forbidden();
      }
      const asset = await options.repository.findOwnedStoredPdf(assetId, actor.userId);
      if (asset === null) {
        return forbidden();
      }
      try {
        const signed = await options.objectStore.createSignedDownload(asset.objectKey, {
          expiresInSeconds: ttlSeconds,
        });
        if (signed.expiresAt.getTime() <= now().getTime()) {
          return {
            ok: false,
            error: {
              code: "SIGNED_URL_EXPIRED",
              messageKey: "assets.download_unavailable",
              retryable: false,
            },
          };
        }
        return {
          ok: true,
          value: {
            url: signed.url,
            expiresAt: signed.expiresAt.toISOString(),
          },
        };
      } catch {
        return {
          ok: false,
          error: {
            code: "ASSET_UNAVAILABLE",
            messageKey: "assets.download_unavailable",
            retryable: true,
          },
        };
      }
    },
  };
}

export { DOWNLOAD_TTL_SECONDS };
