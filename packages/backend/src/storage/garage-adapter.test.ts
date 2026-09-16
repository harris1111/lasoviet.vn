import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";

import {
  MAX_SIGNED_DOWNLOAD_SECONDS,
  MIN_SIGNED_DOWNLOAD_SECONDS,
  createGarageAdapter,
  probeGarageReadiness,
} from "./garage-adapter.js";

const environment = {
  enabled: true as const,
  endpoint: "http://garage:3900" as const,
  region: "lasoviet-private" as const,
  bucket: "lasoviet-report-assets" as const,
  accessKeyId: "access-key",
  secretAccessKey: "secret-key",
  rpcSecret: "a".repeat(64),
};
const sha256 = "a".repeat(64);

describe("createGarageAdapter", () => {
  it("uses private path-style bucket commands and preserves checksum metadata", async () => {
    const send = vi.fn()
      .mockResolvedValueOnce({
        Metadata: { sha256, bytelength: "9" },
        ContentLength: 9,
        ETag: "etag-head",
        VersionId: "version-head",
      })
      .mockResolvedValueOnce({ ETag: "etag-put", VersionId: "version-put" })
      .mockResolvedValueOnce({
        Metadata: { sha256, bytelength: "9" },
        ContentLength: 9,
        ETag: "etag-verified",
        VersionId: "version-verified",
      })
      .mockResolvedValueOnce({});
    const adapter = createGarageAdapter(environment, {
      client: { send },
      createSignedUrl: vi.fn().mockResolvedValue(
        "http://garage:3900/lasoviet-report-assets/reports/asset.pdf?X-Amz-Signature=test",
      ),
      now: () => new Date("2026-09-16T00:00:00.000Z"),
    });

    await expect(adapter.head("reports/asset.pdf")).resolves.toEqual({
      sha256,
      byteLength: 9,
      etag: "etag-head",
      versionId: "version-head",
    });
    await expect(
      adapter.put("reports/asset.pdf", new Uint8Array(9), {
        sha256,
        byteLength: 9,
      }),
    ).resolves.toEqual({
      sha256,
      byteLength: 9,
      etag: "etag-verified",
      versionId: "version-verified",
    });
    await adapter.delete("reports/asset.pdf");

    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(HeadObjectCommand);
    expect(send.mock.calls[1]?.[0]).toBeInstanceOf(PutObjectCommand);
    expect(send.mock.calls[1]?.[0]).toMatchObject({
      input: {
        Bucket: "lasoviet-report-assets",
        Key: "reports/asset.pdf",
        ContentType: "application/pdf",
        Metadata: { sha256, bytelength: "9" },
      },
    });
    expect(send.mock.calls[2]?.[0]).toBeInstanceOf(HeadObjectCommand);
    expect(send.mock.calls[3]?.[0]).toBeInstanceOf(DeleteObjectCommand);
  });

  it("probes the configured private bucket without exposing configuration", async () => {
    const send = vi.fn().mockResolvedValue({});
    await expect(
      probeGarageReadiness(environment, { client: { send } }),
    ).resolves.toBeUndefined();
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(HeadBucketCommand);
    expect(send.mock.calls[0]?.[0]).toMatchObject({
      input: { Bucket: "lasoviet-report-assets" },
    });

    await expect(
      probeGarageReadiness(environment, {
        client: { send: vi.fn().mockRejectedValue(new Error("secret-key")) },
      }),
    ).rejects.toThrow("GARAGE_UNAVAILABLE");
  });

  it("returns null for missing metadata and redacts provider errors", async () => {
    const missing = createGarageAdapter(environment, {
      client: {
        send: vi.fn().mockRejectedValue({ $metadata: { httpStatusCode: 404 } }),
      },
    });
    await expect(missing.head("reports/missing.pdf")).resolves.toBeNull();

    const unavailable = createGarageAdapter(environment, {
      client: { send: vi.fn().mockRejectedValue(new Error("endpoint secret report-key")) },
    });
    await expect(unavailable.delete("reports/asset.pdf")).rejects.toThrow(
      "GARAGE_UNAVAILABLE",
    );
  });

  it("creates bounded short-lived GET URLs without exposing signing inputs", async () => {
    const createSignedUrl = vi.fn().mockResolvedValue(
      "http://garage:3900/lasoviet-report-assets/reports/asset.pdf?X-Amz-Signature=test",
    );
    const adapter = createGarageAdapter(environment, {
      client: { send: vi.fn() },
      createSignedUrl,
      now: () => new Date("2026-09-16T00:00:00.000Z"),
    });

    await expect(
      adapter.createSignedDownload("reports/asset.pdf", {
        expiresInSeconds: MIN_SIGNED_DOWNLOAD_SECONDS,
      }),
    ).resolves.toMatchObject({
      expiresAt: new Date("2026-09-16T00:01:00.000Z"),
    });
    expect(createSignedUrl.mock.calls[0]?.[1]).toBeInstanceOf(GetObjectCommand);
    expect(createSignedUrl.mock.calls[0]?.[1]).toMatchObject({
      input: { Bucket: "lasoviet-report-assets", Key: "reports/asset.pdf" },
    });

    await expect(
      adapter.createSignedDownload("reports/asset.pdf", {
        expiresInSeconds: MIN_SIGNED_DOWNLOAD_SECONDS - 1,
      }),
    ).rejects.toThrow("GARAGE_UNAVAILABLE");
    await expect(
      adapter.createSignedDownload("reports/asset.pdf", {
        expiresInSeconds: MAX_SIGNED_DOWNLOAD_SECONDS + 1,
      }),
    ).rejects.toThrow("GARAGE_UNAVAILABLE");
  });

  it("rejects a signed URL outside the closed Garage origin without leaking it", async () => {
    const adapter = createGarageAdapter(environment, {
      client: { send: vi.fn() },
      createSignedUrl: vi.fn().mockResolvedValue(
        "https://attacker.example/reports/private-asset.pdf?X-Amz-Signature=test",
      ),
    });

    await expect(
      adapter.createSignedDownload("reports/private-asset.pdf", {
        expiresInSeconds: MIN_SIGNED_DOWNLOAD_SECONDS,
      }),
    ).rejects.toThrow("GARAGE_UNAVAILABLE");
  });
});
