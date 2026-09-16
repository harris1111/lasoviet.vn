import { createHash } from "node:crypto";

import type { ObjectStore } from "./object-store.js";

export type StorePdfAssetResult =
  | {
      ok: true;
      objectKey: string;
      sha256: string;
      byteLength: number;
      adopted: boolean;
      etag?: string;
      versionId?: string;
    }
  | { ok: false; code: "GARAGE_UNAVAILABLE" | "ASSET_CHECKSUM_MISMATCH" | "ASSET_KEY_CONFLICT" };

export function createAssetService(options: { objectStore: ObjectStore }) {
  return {
    async storePdf(input: {
      candidateObjectKey: string;
      objectKey: string;
      bytes: Uint8Array;
    }): Promise<StorePdfAssetResult> {
      const { candidateObjectKey, objectKey, bytes } = input;
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const byteLength = bytes.byteLength;
      try {
        const candidate = await options.objectStore.head(candidateObjectKey);
        if (candidate?.sha256 === sha256 && candidate.byteLength === byteLength) {
          return {
            ok: true,
            objectKey: candidateObjectKey,
            sha256,
            byteLength,
            adopted: true,
            etag: candidate.etag,
            versionId: candidate.versionId,
          };
        }
        const existing = await options.objectStore.head(objectKey);
        if (existing) {
          if (existing.sha256 !== sha256 || existing.byteLength !== byteLength) {
            return { ok: false, code: "ASSET_KEY_CONFLICT" };
          }
          return {
            ok: true,
            objectKey,
            sha256,
            byteLength,
            adopted: true,
            etag: existing.etag,
            versionId: existing.versionId,
          };
        }
        const stored = await options.objectStore.put(objectKey, bytes, { sha256, byteLength });
        if (stored.sha256 !== sha256 || stored.byteLength !== byteLength) {
          return { ok: false, code: "ASSET_CHECKSUM_MISMATCH" };
        }
        return {
          ok: true,
          objectKey,
          sha256,
          byteLength,
          adopted: false,
          etag: stored.etag,
          versionId: stored.versionId,
        };
      } catch {
        return { ok: false, code: "GARAGE_UNAVAILABLE" };
      }
    },
  };
}
