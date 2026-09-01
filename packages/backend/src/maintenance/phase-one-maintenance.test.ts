import { describe, expect, it, vi } from "vitest";

import { createPhaseOneMaintenanceRunner } from "./phase-one-maintenance.js";

describe("Phase 01 maintenance runner", () => {
  it("runs each bounded maintenance path once", async () => {
    const accountDeletion = { purgeExpired: vi.fn().mockResolvedValue(["account-1"]) };
    const anonymousRetention = {
      purgeExpired: vi.fn().mockResolvedValue(["anonymous-1", "anonymous-2"]),
    };
    const retryAuthEmail = vi.fn().mockResolvedValue(1);
    const runner = createPhaseOneMaintenanceRunner({
      accountDeletion,
      anonymousRetention,
      retryAuthEmail,
    });

    await expect(runner.runOnce()).resolves.toEqual({
      accountPurges: 1,
      anonymousPurges: 2,
      retries: 1,
    });
    expect(retryAuthEmail).toHaveBeenCalledWith(25);
  });
});
