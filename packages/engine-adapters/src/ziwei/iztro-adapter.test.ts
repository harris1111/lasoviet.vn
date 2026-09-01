import { describe, expect, it } from "vitest";

import type { NormalizedBirthProfileV1 } from "@lasoviet/contracts";

import { IztroAdapter } from "./iztro-adapter.js";
import { iztroDefaultConfig } from "./iztro-config.js";

const profile: NormalizedBirthProfileV1 = {
  version: 1,
  originalInput: {
    version: 1,
    calendar: { kind: "solar", date: "1990-01-01" },
    time: { precision: "exact_minute", localTime: "12:00" },
    timezone: { offsetMinutes: 420 },
    gender: "male",
    consentVersion: "2026-09-01",
  },
  normalizedCalendar: { kind: "solar", date: "1990-01-01" },
  normalizedTime: { precision: "exact_minute", localTime: "12:00" },
  timezoneProvenance: { source: "offset", offsetMinutes: 420 },
  utcInstant: "1990-01-01T05:00:00.000Z",
  normalizationWarnings: [],
  limitations: [],
};

describe("IztroAdapter", () => {
  it("normalizes a default-rule chart with provenance", async () => {
    const result = await new IztroAdapter().calculate(
      { birthProfile: profile },
      iztroDefaultConfig,
    );

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) {
      return;
    }
    expect(result.output.palaces).toHaveLength(12);
    expect(
      result.output.palaces.find(
        (palace) => palace.id === "ziwei.palace.life",
      ),
    ).toMatchObject({
      earthlyBranchId: "ziwei.branch.goat",
      stars: expect.arrayContaining([
        {
          id: "ziwei.star.tianliang",
          brightness: "ziwei.brightness.prosperous",
        },
      ]),
    });
    expect(result.output.transformations).toEqual(
      expect.arrayContaining([
        {
          starId: "ziwei.star.wuqu",
          id: "ziwei.transformation.prosperity",
        },
        {
          starId: "ziwei.star.tianliang",
          id: "ziwei.transformation.fame",
        },
      ]),
    );
    expect(result.output.transformations.length).toBeGreaterThan(0);
    expect(result.provenance).toMatchObject({
      engineId: "ziwei.iztro",
      adapterId: "ziwei.iztro-adapter",
      ruleSetId: "ziwei.default",
      engineVersion: "2.6.0",
      limitations: expect.arrayContaining([
        "IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION",
      ]),
    });
  });

  it("keeps a captured vendor snapshot when normalization fails", async () => {
    const rawSnapshot = { astrolabe: "malformed-for-normalization" };
    const adapter = new IztroAdapter(
      {
        withOptions: () => ({
          toJSON: () => rawSnapshot,
        }),
      },
      () => {
        throw new Error("UNMAPPED_VENDOR_FACT");
      },
    );

    await expect(
      adapter.calculateWithPrivateSnapshot(
        { birthProfile: profile },
        iztroDefaultConfig,
      ),
    ).resolves.toMatchObject({
      result: {
        ok: false,
        error: {
          code: "NORMALIZATION_INVALID",
          retryable: false,
        },
      },
      rawSnapshot,
    });
  });

  it("reports vendor execution failures as retryable without a snapshot", async () => {
    const adapter = new IztroAdapter({
      withOptions: () => {
        throw new Error("VENDOR_UNAVAILABLE");
      },
    });

    await expect(
      adapter.calculateWithPrivateSnapshot(
        { birthProfile: profile },
        iztroDefaultConfig,
      ),
    ).resolves.toMatchObject({
      result: {
        ok: false,
        error: {
          code: "ENGINE_UNAVAILABLE",
          retryable: true,
        },
      },
      rawSnapshot: null,
    });
  });
});
