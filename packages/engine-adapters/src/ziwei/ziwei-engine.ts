import type {
  CalculationEngine,
  EngineConfig,
  NormalizedBirthProfileV1,
  NormalizedZiweiChartV1,
} from "@lasoviet/contracts";

export type ZiweiCalculationInput = {
  birthProfile: NormalizedBirthProfileV1;
};

export type ZiweiEngineConfig = EngineConfig;

export interface ZiweiEngine
  extends CalculationEngine<
    ZiweiCalculationInput,
    NormalizedZiweiChartV1,
    ZiweiEngineConfig
  > {}
