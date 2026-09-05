import type { CalculationProvenanceV1 } from "./calculation-provenance.js";

export type CalculationEngineErrorCode =
  | "ENGINE_INPUT_INVALID"
  | "ENGINE_UNAVAILABLE"
  | "NORMALIZATION_INVALID";

export type CalculationEngineError = {
  code: CalculationEngineErrorCode;
  messageKey: string;
  retryable: boolean;
};

export type EngineCapabilities = {
  engineId: string;
  systemIds: string[];
  supportedRuleSetIds: string[];
};

export type EngineConfig = {
  ruleSetId: string;
  values: Record<string, boolean | number | string>;
};

export type EngineResult<Output> =
  | {
      ok: true;
      output: Output;
      provenance: CalculationProvenanceV1;
      warnings: string[];
    }
  | {
      ok: false;
      error: CalculationEngineError;
    };

export interface CalculationEngine<Input, Output, Config = EngineConfig> {
  capabilities(): EngineCapabilities;
  calculate(input: Input, config: Config): Promise<EngineResult<Output>>;
}
