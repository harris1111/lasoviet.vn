import { describe, expect, it, vi } from "vitest";

import type { CurrentActor } from "@lasoviet/contracts";

import { createReadingContextService } from "./reading-context.service.js";

const now = new Date("2026-09-15T00:00:00Z");
const actor: CurrentActor = {
  kind: "account",
  userId: "reading-service-user",
  sessionId: "reading-service-session",
  requestId: "reading-service-request",
};

describe("ReadingContextService", () => {
  it("validates direct inputs before invoking its repository", async () => {
    const mutate = vi.fn();
    const service = createReadingContextService({
      repository: {
        getCurrent: vi.fn(),
        getRevision: vi.fn(),
        listRevisions: vi.fn(),
        getReceipt: vi.fn(),
        mutateContextWithAdvisoryLock: mutate,
      },
      now: () => now,
    });
    await expect(
      service.setContext(actor, " ", {
        version: 1,
        lifeStage: "early_career",
        expectedStateVersion: 0,
        idempotencyKey: "key",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "READING_CONTEXT_INVALID" },
    });
    await expect(
      service.clearContext(actor, "profile", {
        version: 1,
        expectedStateVersion: 0,
        idempotencyKey: "key",
      } as never),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "READING_CONTEXT_INVALID" },
    });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("maps expired anonymous actors to uniform not found", async () => {
    const repository = {
      getCurrent: vi.fn(),
      getRevision: vi.fn(),
      listRevisions: vi.fn(),
      getReceipt: vi.fn(),
      mutateContextWithAdvisoryLock: vi.fn(),
    };
    const service = createReadingContextService({ repository, now: () => now });
    await expect(
      service.getCurrentContext(
        {
          kind: "anonymous",
          anonymousActorId: "expired",
          sessionId: "session",
          requestId: "request",
          expiresAt: "2026-09-14T00:00:00Z",
        },
        "profile",
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "PROFILE_NOT_FOUND" },
    });
    expect(repository.getCurrent).not.toHaveBeenCalled();
  });

  it("computes canonical mutation fingerprints and preserves domain errors", async () => {
    const mutateContextWithAdvisoryLock = vi.fn().mockResolvedValue({
      ok: false,
      error: {
        code: "READING_CONTEXT_CONFLICT",
        messageKey: "readingContext.reading_context_conflict",
        retryable: false,
      },
    });
    const service = createReadingContextService({
      repository: {
        getCurrent: vi.fn(),
        getRevision: vi.fn(),
        listRevisions: vi.fn(),
        getReceipt: vi.fn(),
        mutateContextWithAdvisoryLock,
      },
      now: () => now,
    });
    await expect(
      service.setContext(actor, "profile", {
        version: 1,
        topConcern: "career",
        expectedStateVersion: 0,
        idempotencyKey: "key",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "READING_CONTEXT_CONFLICT" },
    });
    expect(mutateContextWithAdvisoryLock).toHaveBeenCalledWith(
      actor,
      "profile",
      expect.objectContaining({
        commandType: "set",
        context: { version: 1, topConcern: "career" },
        requestFingerprint: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
  });
});
