import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

import { createAssetService } from "./asset.service.js";

const bytes = new TextEncoder().encode("pdf bytes");

describe("createAssetService", () => {
  it("stores a new object with its verified checksum", async () => {
    const result = await createAssetService({
      objectStore: {
        head: async () => null,
        put: async (_key, _bytes, metadata) => ({ ...metadata, etag: "etag-1" }),
      },
    }).storePdf({
      candidateObjectKey: "reports/asset.pdf",
      objectKey: "reports/asset/attempt-1.pdf",
      bytes,
    });

    expect(result).toMatchObject({
      ok: true,
      objectKey: "reports/asset/attempt-1.pdf",
      adopted: false,
      byteLength: bytes.byteLength,
    });
  });

  it("rejects mismatched post-upload metadata without claiming the object stored", async () => {
    const result = await createAssetService({
      objectStore: {
        head: async () => null,
        put: async (_key, _bytes, metadata) => ({
          ...metadata,
          sha256: "f".repeat(64),
        }),
      },
    }).storePdf({
      candidateObjectKey: "reports/asset.pdf",
      objectKey: "reports/asset/attempt-1.pdf",
      bytes,
    });

    expect(result).toEqual({ ok: false, code: "ASSET_CHECKSUM_MISMATCH" });
  });

  it("adopts matching bytes from the prior candidate key without overwriting it", async () => {
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const service = createAssetService({
      objectStore: {
        head: async () => ({
          sha256,
          byteLength: bytes.byteLength,
        }),
        put: async () => {
          throw new Error("must not overwrite");
        },
      },
    });

    await expect(service.storePdf({
      candidateObjectKey: "reports/asset/prior-attempt.pdf",
      objectKey: "reports/asset/new-attempt.pdf",
      bytes,
    })).resolves.toMatchObject({
      ok: true,
      objectKey: "reports/asset/prior-attempt.pdf",
      adopted: true,
    });
  });

  it("uploads to a fresh attempt key when the prior candidate does not match", async () => {
    const put = vi.fn(async (_key, _bytes, metadata) => ({ ...metadata, etag: "fresh-etag" }));
    const result = await createAssetService({
      objectStore: {
        head: async (key) => key === "reports/asset/prior-attempt.pdf"
          ? { sha256: "f".repeat(64), byteLength: bytes.byteLength }
          : null,
        put,
      },
    }).storePdf({
      candidateObjectKey: "reports/asset/prior-attempt.pdf",
      objectKey: "reports/asset/new-attempt.pdf",
      bytes,
    });

    expect(result).toMatchObject({
      ok: true,
      objectKey: "reports/asset/new-attempt.pdf",
      adopted: false,
    });
    expect(put).toHaveBeenCalledWith(
      "reports/asset/new-attempt.pdf",
      bytes,
      expect.objectContaining({ byteLength: bytes.byteLength }),
    );
  });

  it("rejects a conflicting fresh attempt key without overwriting either key", async () => {
    const result = await createAssetService({
      objectStore: {
        head: async (key) => key === "reports/asset/new-attempt.pdf"
          ? { sha256: "f".repeat(64), byteLength: bytes.byteLength }
          : { sha256: "e".repeat(64), byteLength: bytes.byteLength },
        put: async () => {
          throw new Error("must not overwrite");
        },
      },
    }).storePdf({
      candidateObjectKey: "reports/asset/prior-attempt.pdf",
      objectKey: "reports/asset/new-attempt.pdf",
      bytes,
    });

    expect(result).toEqual({ ok: false, code: "ASSET_KEY_CONFLICT" });
  });

  it("returns retryable Garage failure without claiming an upload succeeded", async () => {
    const result = await createAssetService({
      objectStore: {
        head: async () => {
          throw new Error("unavailable");
        },
        put: async () => {
          throw new Error("unreachable");
        },
      },
    }).storePdf({
      candidateObjectKey: "reports/asset.pdf",
      objectKey: "reports/asset/attempt-1.pdf",
      bytes,
    });

    expect(result).toEqual({ ok: false, code: "GARAGE_UNAVAILABLE" });
  });
});
