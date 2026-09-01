import { createHash } from "node:crypto";

import { astro } from "iztro";

import {
  NormalizedZiweiChartV1Schema,
  type CalculationProvenanceV1,
  type EngineResult,
  type NormalizedBirthProfileV1,
} from "@lasoviet/contracts";

import { iztroDefaultConfig } from "./iztro-config.js";
import {
  normalizeIztroAstrolabe,
  type RawIztroAstrolabe,
} from "./iztro-mapping.js";
import type {
  ZiweiCalculationInput,
  ZiweiEngine,
  ZiweiEngineConfig,
} from "./ziwei-engine.js";

const ENGINE_VERSION = "2.6.0";
const ADAPTER_VERSION = "1";

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function gender(profile: NormalizedBirthProfileV1): "male" | "female" | undefined {
  switch (profile.originalInput.gender) {
    case "male":
    case "Nam":
    case "男":
      return "male";
    case "female":
    case "Nữ":
    case "女":
      return "female";
    default:
      return undefined;
  }
}

function failure(
  code: "ENGINE_INPUT_INVALID" | "ENGINE_UNAVAILABLE" | "NORMALIZATION_INVALID",
): EngineResult<never> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `ziwei.${code.toLowerCase()}`,
      retryable: code === "ENGINE_UNAVAILABLE",
    },
  };
}

function timeIndex(profile: NormalizedBirthProfileV1): number | undefined {
  switch (profile.normalizedTime.precision) {
    case "branch_only":
      return [
        "zi",
        "chou",
        "yin",
        "mao",
        "chen",
        "si",
        "wu",
        "wei",
        "shen",
        "you",
        "xu",
        "hai",
      ].indexOf(profile.normalizedTime.branch);
    case "exact_minute":
      return Math.floor(
        (Number(profile.normalizedTime.localTime.slice(0, 2)) * 60 +
          Number(profile.normalizedTime.localTime.slice(3, 5)) +
          60) /
          120,
      ) % 12;
    case "range":
      return Math.floor(
        (Number(profile.normalizedTime.startLocalTime.slice(0, 2)) * 60 +
          Number(profile.normalizedTime.startLocalTime.slice(3, 5)) +
          60) /
          120,
      ) % 12;
    case "unknown":
      return undefined;
  }
}

export type IztroCalculationWithPrivateSnapshot = {
  result: EngineResult<import("@lasoviet/contracts").NormalizedZiweiChartV1>;
  rawSnapshot: Record<string, unknown> | null;
};

export class IztroAdapter implements ZiweiEngine {
  capabilities() {
    return {
      engineId: "ziwei.iztro",
      systemIds: ["ziwei"],
      supportedRuleSetIds: ["ziwei.default"],
    };
  }

  async calculate(
    input: ZiweiCalculationInput,
    config: ZiweiEngineConfig,
  ): Promise<EngineResult<import("@lasoviet/contracts").NormalizedZiweiChartV1>> {
    return (await this.calculateWithPrivateSnapshot(input, config)).result;
  }

  async calculateWithPrivateSnapshot(
    input: ZiweiCalculationInput,
    config: ZiweiEngineConfig = iztroDefaultConfig,
  ): Promise<IztroCalculationWithPrivateSnapshot> {
    const profile = input.birthProfile;
    const resolvedGender = gender(profile);
    const resolvedTimeIndex = timeIndex(profile);
    if (
      config.values.algorithm !== "default" ||
      resolvedGender === undefined ||
      resolvedTimeIndex === undefined
    ) {
      return { result: failure("ENGINE_INPUT_INVALID"), rawSnapshot: null };
    }
    try {
      const raw = astro.withOptions({
        type: profile.normalizedCalendar.kind,
        dateStr: profile.normalizedCalendar.date,
        timeIndex: resolvedTimeIndex,
        gender: resolvedGender,
        isLeapMonth: profile.normalizedCalendar.kind === "lunar"
          ? profile.normalizedCalendar.isLeapMonth
          : undefined,
        language: "en-US",
        config: {
          algorithm: "default",
          yearDivide: config.values.yearDivide as "normal",
          horoscopeDivide: config.values.horoscopeDivide as "normal",
          ageDivide: config.values.ageDivide as "normal",
          dayDivide: config.values.dayDivide as "current",
        },
      });
      const rawSnapshot = raw.toJSON() as Record<string, unknown>;
      const provenance: CalculationProvenanceV1 = {
        version: 1,
        engineId: "ziwei.iztro",
        engineVersion: ENGINE_VERSION,
        adapterId: "ziwei.iztro-adapter",
        adapterVersion: ADAPTER_VERSION,
        schemaId: "ziwei.chart.v1",
        ruleSetId: config.ruleSetId,
        inputHash: hash(profile),
        configHash: hash(config),
        rawSnapshotHash: hash(rawSnapshot),
        calculatedAt: new Date().toISOString().replace("Z", "+00:00"),
        limitations: [
          "IZTRO_NO_NATIVE_LOCATION_INPUT",
          "IZTRO_NO_NATIVE_TIMEZONE_INPUT",
          "IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION",
        ],
      };
      const output = normalizeIztroAstrolabe(
        rawSnapshot as unknown as RawIztroAstrolabe,
        profile,
        provenance,
      );
      if (!NormalizedZiweiChartV1Schema.safeParse(output).success) {
        return { result: failure("NORMALIZATION_INVALID"), rawSnapshot };
      }
      return {
        result: { ok: true, output, provenance, warnings: output.warnings.map((warning) => warning.code) },
        rawSnapshot,
      };
    } catch {
      return { result: failure("ENGINE_UNAVAILABLE"), rawSnapshot: null };
    }
  }
}
