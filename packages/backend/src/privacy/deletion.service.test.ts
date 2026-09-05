import { describe, expect, it } from "vitest";

import { createAccountDeletionService } from "./deletion.service.js";

describe("account deletion policy", () => {
  it("revokes sessions and starts a 30-day recovery period", async () => {
    const inputs: Array<{ userId: string; recoverUntil: Date }> = [];
    const service = createAccountDeletionService({
      repository: {
        async request(input) {
          inputs.push(input);
          return {
            ok: true,
            value: {
              requestId: "deletion-1",
              recoverUntil: input.recoverUntil,
            },
          };
        },
        async cancel() {
          throw new Error("not used");
        },
        async purgeExpired() {
          throw new Error("not used");
        },
      },
      now: () => new Date("2026-09-01T00:00:00Z"),
    });

    await expect(service.request("account-1", "request-1")).resolves.toEqual({
      ok: true,
      value: {
        requestId: "deletion-1",
        recoverUntil: "2026-10-01T00:00:00.000Z",
      },
    });
    expect(inputs).toEqual([
      {
        userId: "account-1",
        requestId: "request-1",
        requestedAt: new Date("2026-09-01T00:00:00Z"),
        recoverUntil: new Date("2026-10-01T00:00:00Z"),
      },
    ]);
  });

  it("rejects duplicate requests and late recovery", async () => {
    const service = createAccountDeletionService({
      repository: {
        async request() {
          return {
            ok: false,
            error: "DELETION_ALREADY_REQUESTED" as const,
          };
        },
        async cancel() {
          return {
            ok: false,
            error: "DELETION_RECOVERY_EXPIRED" as const,
          };
        },
        async purgeExpired() {
          return [];
        },
      },
      now: () => new Date("2026-10-02T00:00:00Z"),
    });

    await expect(service.request("account-1", "request-1")).resolves.toMatchObject({
      ok: false,
      error: { code: "DELETION_ALREADY_REQUESTED" },
    });
    await expect(service.cancel("account-1", "request-1")).resolves.toMatchObject({
      ok: false,
      error: { code: "DELETION_RECOVERY_EXPIRED" },
    });
  });
});
