import { describe, expect, it } from "vitest";

import type { NormalizedBirthProfileV1 } from "@lasoviet/contracts";

import { IztroAdapter } from "./iztro-adapter.js";
import { normalizeIztroAstrolabe } from "./iztro-mapping.js";
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


const provenanceSample = {
  version: 1 as const,
  engineId: "ziwei.iztro",
  engineVersion: "2.6.0",
  adapterId: "ziwei.iztro-adapter",
  adapterVersion: "1.0.0",
  schemaId: "normalized-ziwei-chart-v1",
  ruleSetId: "ziwei.default",
  inputHash: "a".repeat(64),
  configHash: "b".repeat(64),
  rawSnapshotHash: "c".repeat(64),
  calculatedAt: "2026-09-02T00:00:00+00:00",
  limitations: ["IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION"],
};

const rawRepresentativeAstrolabe = {
  palaces: [
    {
      name: "soul",
      earthlyBranch: "yin",
      heavenlyStem: "jia",
      isBodyPalace: true,
      isOriginalPalace: true,
      changsheng12: "born",
      boshi12: "doctor",
      jiangqian12: "capable",
      suiqian12: "initial",
      majorStars: [
        {
          name: "emperor",
          brightness: "[+2]",
        },
      ],
      minorStars: [
        {
          name: "officer",
          mutagen: "C",
        },
      ],
      adjectiveStars: [
        {
          name: "attractive",
        },
        {
          name: "unsupported-vendor-adjective",
        },
      ],
    },
    ...[
      { name: "siblings", earthlyBranch: "mao" },
      { name: "spouse", earthlyBranch: "chen" },
      { name: "children", earthlyBranch: "si" },
      { name: "wealth", earthlyBranch: "woo" },
      { name: "health", earthlyBranch: "wei" },
      { name: "surface", earthlyBranch: "shen" },
      { name: "friends", earthlyBranch: "you" },
      { name: "career", earthlyBranch: "xu" },
      { name: "property", earthlyBranch: "hai" },
      { name: "spirit", earthlyBranch: "zi" },
      { name: "parents", earthlyBranch: "chou" },
    ].map((p) => ({
      ...p,
      isBodyPalace: false,
      majorStars: [],
      minorStars: [],
    })),
  ],
};

describe("IztroAdapter", () => {
  it("preserves whole-chart fields, categories, and extra star groups from a raw fixture", () => {
    const chart = normalizeIztroAstrolabe(
      rawRepresentativeAstrolabe as any,
      profile,
      provenanceSample,
    );

    expect(chart.palaces[0]).toMatchObject({
      heavenlyStemId: "ziwei.stem.jia",
      isBodyPalace: true,
      isOriginalPalace: true,
      cycleStateId: "ziwei.cycle.born",
      stars: expect.arrayContaining([
        expect.objectContaining({
          id: "ziwei.star.ziwei",
          category: "major",
          brightness: "ziwei.brightness.prosperous",
        }),
        expect.objectContaining({
          id: "ziwei.star.zuofu",
          category: "minor",
          brightness: "ziwei.brightness.neutral",
        }),
        expect.objectContaining({
          id: "ziwei.star.hongluan",
          category: "adjective",
        }),
        expect.objectContaining({
          id: "ziwei.star.boshi",
          category: "decorative",
          brightness: "ziwei.brightness.neutral",
        }),
        expect.objectContaining({
          id: "ziwei.star.jiangxing",
          category: "decorative",
          brightness: "ziwei.brightness.neutral",
        }),
        expect.objectContaining({
          id: "ziwei.star.suijian",
          category: "decorative",
          brightness: "ziwei.brightness.neutral",
        }),
      ]),
    });

    // Unsupported adjective star is skipped
    expect(chart.palaces[0]!.stars.map((s) => s.id)).not.toContain("unsupported-vendor-adjective");

    // Mutation on minor star preserved in chart transformations
    expect(chart.transformations).toEqual(
      expect.arrayContaining([
        {
          starId: "ziwei.star.zuofu",
          id: "ziwei.transformation.fame",
        },
      ]),
    );
  });

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
        expect.objectContaining({
          id: "ziwei.star.tianliang",
          brightness: "ziwei.brightness.prosperous",
          category: "major",
        }),
        expect.objectContaining({
          category: "adjective",
        }),
        expect.objectContaining({
          id: "ziwei.star.guanfu",
          category: "decorative",
          brightness: "ziwei.brightness.neutral",
        }),
        expect.objectContaining({
          id: "ziwei.star.yuesha",
          category: "decorative",
          brightness: "ziwei.brightness.neutral",
        }),
        expect.objectContaining({
          id: "ziwei.star.sangmen",
          category: "decorative",
          brightness: "ziwei.brightness.neutral",
        }),
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
