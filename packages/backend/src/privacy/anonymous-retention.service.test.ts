import { describe, expect, it } from "vitest";

import { createAnonymousRetentionService } from "./anonymous-retention.service.js";

describe("anonymous retention policy", () => {
  it("does not purge an unexpired anonymous actor but permits immediate deletion", async () => {
    const service = createAnonymousRetentionService({
      repository: {
        async purgeExpired() {
          return [];
        },
        async purgeActor() {
          return { ok: false, error: "ANONYMOUS_NOT_EXPIRED" as const };
        },
        async deleteNow() {
          return { ok: true, value: { actorId: "anonymous-1" } };
        },
      },
    });

    await expect(
      service.purgeActor("anonymous-1", new Date("2026-09-01T00:00:00Z")),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "ANONYMOUS_NOT_EXPIRED" },
    });
    await expect(service.deleteNow("anonymous-1")).resolves.toEqual({
      ok: true,
      value: { actorId: "anonymous-1" },
    });
  });

  it("never deletes an anonymous actor already linked to an account", async () => {
    const service = createAnonymousRetentionService({
      repository: {
        async purgeExpired() {
          return [];
        },
        async purgeActor() {
          return { ok: false, error: "ANONYMOUS_ALREADY_LINKED" as const };
        },
        async deleteNow() {
          return { ok: false, error: "ANONYMOUS_ALREADY_LINKED" as const };
        },
      },
    });

    await expect(service.deleteNow("anonymous-linked")).resolves.toMatchObject({
      ok: false,
      error: { code: "ANONYMOUS_ALREADY_LINKED" },
    });
  });
});
