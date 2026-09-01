import type {
  CurrentActor,
  EngineConfig,
  EngineResult,
  NormalizedBirthProfileV1,
  NormalizedZiweiChartV1,
  Result,
} from "@lasoviet/contracts";

import { resolveZiweiTimeIndex } from "../birth-profile/time-precision.js";

import type {
  ZiweiCalculationRepository,
} from "./ziwei.repository.js";

export type ZiweiCalculationError =
  | "PROFILE_FORBIDDEN"
  | "ZIWEI_TIME_INELIGIBLE"
  | "ENGINE_FAILED"
  | "NORMALIZATION_INVALID";

type ZiweiEngineWithPrivateSnapshot = {
  calculateWithPrivateSnapshot(
    input: { birthProfile: NormalizedBirthProfileV1 },
    config: EngineConfig,
  ): Promise<{
    result: EngineResult<NormalizedZiweiChartV1>;
    rawSnapshot: Record<string, unknown> | null;
  }>;
};

export type ZiweiCalculationServiceOptions = {
  repository: ZiweiCalculationRepository;
  engine: ZiweiEngineWithPrivateSnapshot;
  config?: EngineConfig;
  now?: () => Date;
};

function error(code: ZiweiCalculationError): Result<never, ZiweiCalculationError> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `ziwei.${code.toLowerCase()}`,
      retryable: code === "ENGINE_FAILED",
    },
  };
}

function key(chart: NormalizedZiweiChartV1): string {
  const provenance = chart.provenance;
  return [
    provenance.inputHash,
    provenance.engineVersion,
    provenance.adapterVersion,
    provenance.configHash,
  ].join(":");
}

const defaultConfig: EngineConfig = {
  ruleSetId: "ziwei.default",
  values: {
    algorithm: "default",
    mutagenVersion: "iztro-2.6.0-default",
    brightnessVersion: "iztro-2.6.0-default",
    yearDivide: "normal",
    horoscopeDivide: "normal",
    ageDivide: "normal",
    dayDivide: "current",
  },
};

export function createZiweiCalculationService(
  options: ZiweiCalculationServiceOptions,
) {
  const now = options.now ?? (() => new Date());
  const config = options.config ?? defaultConfig;

  return {
    async calculate(actor: CurrentActor, revisionId: string) {
      const revision = await options.repository.readAuthorizedRevision(
        actor,
        revisionId,
        now(),
      );
      if (revision === null) {
        return error("PROFILE_FORBIDDEN");
      }
      if (!resolveZiweiTimeIndex(revision.normalized).ok) {
        return error("ZIWEI_TIME_INELIGIBLE");
      }
      const calculation = await options.engine.calculateWithPrivateSnapshot(
        { birthProfile: revision.normalized },
        config,
      );
      if (!calculation.result.ok) {
        return error(
          calculation.result.error.code === "NORMALIZATION_INVALID"
            ? "NORMALIZATION_INVALID"
            : "ENGINE_FAILED",
        );
      }
      if (calculation.rawSnapshot === null) {
        return error("ENGINE_FAILED");
      }
      const record = await options.repository.create({
        profileId: revision.profileId,
        revisionId: revision.revisionId,
        idempotencyKey: key(calculation.result.output),
        chart: calculation.result.output,
        rawSnapshot: calculation.rawSnapshot,
        now: now(),
      });
      return {
        ok: true as const,
        value: {
          chartId: record.chartId,
          chartVersionId: record.chartVersionId,
          reused: record.reused,
        },
      };
    },
  };
}
