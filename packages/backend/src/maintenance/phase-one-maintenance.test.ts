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
    expect(accountDeletion.purgeExpired).toHaveBeenCalledWith(25);
    expect(anonymousRetention.purgeExpired).toHaveBeenCalledWith(25);
    expect(retryAuthEmail).toHaveBeenCalledWith(25);
  });

  it("reuses an active run instead of overlapping interval work", async () => {
    let release: (() => void) | undefined;
    const pending = new Promise<string[]>((resolve) => {
      release = () => resolve([]);
    });
    const accountDeletion = { purgeExpired: vi.fn().mockReturnValue(pending) };
    const anonymousRetention = {
      purgeExpired: vi.fn().mockResolvedValue([]),
    };
    const retryAuthEmail = vi.fn().mockResolvedValue(0);
    const runner = createPhaseOneMaintenanceRunner({
      accountDeletion,
      anonymousRetention,
      retryAuthEmail,
      batchSize: 3,
    });

    const first = runner.runOnce();
    const second = runner.runOnce();
    expect(second).toBe(first);
    expect(accountDeletion.purgeExpired).toHaveBeenCalledTimes(1);
    release?.();
    await expect(first).resolves.toEqual({
      accountPurges: 0,
      anonymousPurges: 0,
      retries: 0,
    });
  });

  it("integrates reconciliation operations when configured", async () => {
    const accountDeletion = { purgeExpired: vi.fn().mockResolvedValue([]) };
    const anonymousRetention = { purgeExpired: vi.fn().mockResolvedValue([]) };
    const retryAuthEmail = vi.fn().mockResolvedValue(0);
    const reconciliation = {
      runMaintenance: vi.fn().mockResolvedValue({
        circuitStatus: "closed" as const,
        circuitTransitioned: false,
        staleAlerted: 2,
      }),
    };

    const runner = createPhaseOneMaintenanceRunner({
      accountDeletion,
      anonymousRetention,
      retryAuthEmail,
      reconciliation,
    });

    const result = await runner.runOnce();
    expect(result).toEqual({
      accountPurges: 0,
      anonymousPurges: 0,
      retries: 0,
      reconciliation: {
        circuitStatus: "closed",
        circuitTransitioned: false,
        staleAlerted: 2,
      },
    });
    expect(reconciliation.runMaintenance).toHaveBeenCalledTimes(1);
  });
});
