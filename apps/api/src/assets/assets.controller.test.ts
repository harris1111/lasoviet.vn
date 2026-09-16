import { describe, expect, it, vi } from "vitest";

import * as guard from "../auth/internal-actor.guard.js";
import {
  ASSET_DOWNLOAD_DATABASE,
  ASSET_DOWNLOAD_SERVICE,
  ASSET_DOWNLOAD_SERVICE_SECRET,
  AssetsController,
} from "./assets.controller.js";

const service = { createDownload: vi.fn() };

function controller() {
  return new AssetsController(
    service,
    "internal-secret",
    {} as never,
  );
}

describe("AssetsController", () => {
  it("maps missing, anonymous, and cross-owner requests to identical 404 responses", async () => {
    const verify = vi.spyOn(guard, "verifyInternalActorToken");
    verify.mockResolvedValueOnce({
      kind: "anonymous",
      anonymousActorId: "anon",
      sessionId: "session",
      requestId: "request",
      expiresAt: "2026-09-17T00:00:00+00:00",
    });
    service.createDownload.mockResolvedValueOnce({
      ok: false,
      error: { code: "ASSET_FORBIDDEN", retryable: false },
    });

    await expect(controller().download(undefined, "asset-1")).rejects.toMatchObject({
      status: 404,
      response: { code: "ASSET_FORBIDDEN" },
    });
    await expect(controller().download("Bearer token", "asset-1")).rejects.toMatchObject({
      status: 404,
      response: { code: "ASSET_FORBIDDEN" },
    });
    verify.mockRestore();
  });

  it("returns only the signed grant after verified internal actor authorization", async () => {
    const verify = vi.spyOn(guard, "verifyInternalActorToken").mockResolvedValue({
      kind: "account",
      userId: "owner-1",
      sessionId: "session",
      requestId: "request",
    });
    service.createDownload.mockResolvedValueOnce({
      ok: true,
      value: {
        url: "https://downloads.lasoviet.example/signed",
        expiresAt: "2026-09-16T00:02:00.000Z",
      },
    });

    await expect(controller().download("Bearer token", "asset-1")).resolves.toEqual({
      url: "https://downloads.lasoviet.example/signed",
      expiresAt: "2026-09-16T00:02:00.000Z",
    });
    expect(JSON.stringify(service.createDownload.mock.calls)).not.toContain("objectKey");
    verify.mockRestore();
  });

  it("maps signing failures to bounded retryable 503 errors", async () => {
    const verify = vi.spyOn(guard, "verifyInternalActorToken").mockResolvedValue({
      kind: "account",
      userId: "owner-1",
      sessionId: "session",
      requestId: "request",
    });
    service.createDownload.mockResolvedValueOnce({
      ok: false,
      error: { code: "ASSET_UNAVAILABLE", retryable: true },
    });
    await expect(controller().download("Bearer token", "asset-1")).rejects.toMatchObject({
      status: 503,
      response: { code: "ASSET_UNAVAILABLE" },
    });
    verify.mockRestore();
  });
});

void ASSET_DOWNLOAD_SERVICE;
void ASSET_DOWNLOAD_SERVICE_SECRET;
void ASSET_DOWNLOAD_DATABASE;
