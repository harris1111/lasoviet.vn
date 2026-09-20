import { describe, expect, it } from "vitest";

import { createDatabaseAssetRepository } from "./asset.repository.js";

describe("createDatabaseAssetRepository configuration", () => {
  it("requires a canonical HTTPS origin and an HMAC secret", () => {
    expect(() => createDatabaseAssetRepository({} as never, {
      canonicalPublicOrigin: "http://lasoviet.net",
      recipientFingerprintSecret: "secret",
    })).toThrow("ASSET_REPOSITORY_INVALID_CANONICAL_ORIGIN");
    expect(() => createDatabaseAssetRepository({} as never, {
      canonicalPublicOrigin: "https://lasoviet.net",
      recipientFingerprintSecret: "",
    })).toThrow("ASSET_REPOSITORY_RECIPIENT_FINGERPRINT_SECRET_REQUIRED");
  });

  it("rejects invalid stored metadata before a transaction can mutate state", async () => {
    const repository = createDatabaseAssetRepository({} as never, {
      canonicalPublicOrigin: "https://lasoviet.net",
      recipientFingerprintSecret: "secret",
      now: () => new Date("2026-09-16T00:00:00.000Z"),
    });
    await expect(repository.finalizeStored({
      item: {
        assetId: "asset-1", reportId: "report-1", reportVersionId: "version-1",
        immutableHtml: "<html />", renderVersion: "identity-report-pdf.v1",
        candidateObjectKey: "reports/asset-1.pdf", objectKey: "reports/asset-1/lease-1.pdf",
        assetStateVersion: 3, reportStateVersion: 5,
        leaseToken: "lease-1", ownerId: "owner-1", ownerEmail: "owner@example.com", locale: "vi",
      },
      jobId: "job-1", workerId: "worker-1", objectKey: "reports/asset-1/lease-1.pdf",
      sha256: "not-a-checksum", byteLength: 0,
    })).rejects.toThrow("ASSET_REPOSITORY_INVALID_STORAGE_METADATA");
  });
});
