import { describe, expect, it, vi } from "vitest";

import { createAssetDownloadService } from "./asset-download.service.js";

const account = {
  kind: "account" as const,
  userId: "owner-1",
  sessionId: "session-1",
  requestId: "request-1",
};

describe("createAssetDownloadService", () => {
  it("only signs a stored PDF owned by the verified account and never returns its object key", async () => {
    const findOwnedStoredPdf = vi.fn().mockResolvedValue({
      objectKey: "reports/private-asset.pdf",
    });
    const createSignedDownload = vi.fn().mockResolvedValue({
      url: "https://downloads.lasoviet.example/signed",
      expiresAt: new Date("2026-09-16T00:02:00.000Z"),
    });
    const service = createAssetDownloadService({
      repository: { findOwnedStoredPdf },
      objectStore: { createSignedDownload },
      now: () => new Date("2026-09-16T00:00:00.000Z"),
    });

    const result = await service.createDownload(account, "asset-1");

    expect(result).toEqual({
      ok: true,
      value: {
        url: "https://downloads.lasoviet.example/signed",
        expiresAt: "2026-09-16T00:02:00.000Z",
      },
    });
    expect(JSON.stringify(result)).not.toContain("reports/private-asset.pdf");
    expect(findOwnedStoredPdf).toHaveBeenCalledWith("asset-1", "owner-1");
    expect(createSignedDownload).toHaveBeenCalledWith("reports/private-asset.pdf", {
      expiresInSeconds: 120,
    });
  });

  it.each([
    [{ kind: "anonymous" as const, anonymousActorId: "anon", sessionId: "s", requestId: "r", expiresAt: "2026-09-17T00:00:00+00:00" }],
    [account],
  ])("makes anonymous, missing, and cross-owner requests indistinguishable", async (actor) => {
    const service = createAssetDownloadService({
      repository: { findOwnedStoredPdf: vi.fn().mockResolvedValue(null) },
      objectStore: { createSignedDownload: vi.fn() },
    });
    const result = await service.createDownload(actor, "asset-1");

    expect(result).toEqual({
      ok: false,
      error: {
        code: "ASSET_FORBIDDEN",
        messageKey: "assets.download_not_found",
        retryable: false,
      },
    });
  });

  it("treats expired grants and Garage signing errors as non-persistent request outcomes", async () => {
    const repository = {
      findOwnedStoredPdf: vi.fn().mockResolvedValue({ objectKey: "reports/private-asset.pdf" }),
    };
    const expired = createAssetDownloadService({
      repository,
      objectStore: {
        createSignedDownload: vi.fn().mockResolvedValue({
          url: "https://downloads.lasoviet.example/signed",
          expiresAt: new Date("2026-09-16T00:00:00.000Z"),
        }),
      },
      now: () => new Date("2026-09-16T00:00:00.000Z"),
    });
    await expect(expired.createDownload(account, "asset-1")).resolves.toMatchObject({
      ok: false,
      error: { code: "SIGNED_URL_EXPIRED", retryable: false },
    });

    const unavailable = createAssetDownloadService({
      repository,
      objectStore: {
        createSignedDownload: vi.fn().mockRejectedValue(new Error("provider details")),
      },
    });
    await expect(unavailable.createDownload(account, "asset-1")).resolves.toMatchObject({
      ok: false,
      error: { code: "ASSET_UNAVAILABLE", retryable: true },
    });
  });
});
