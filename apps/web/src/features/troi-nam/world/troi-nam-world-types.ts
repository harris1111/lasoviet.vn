export type WorldQuality = "low" | "high";
export type WorldChartTarget = { x: number; y: number; width: number; height: number };
export type WorldDebug = { rays?: boolean; mask?: boolean };
export type WorldDiagnostics = {
  tier: WorldQuality | "static";
  progress: number;
  chartWeight: number;
  opacity: number;
  targetUploads: number;
  drawingBuffer: { width: number; height: number };
  rayBuffer: { width: number; height: number } | null;
  raysEnabled: boolean;
  frameCpuMs: number;
  rayPipelineCpuMs: number;
  chartRect: WorldChartTarget | null;
  ringCorners: number[];
  ringTargets: number[];
};
export type WorldHandle = {
  setProgress(value: number): void;
  setChartTarget(rect: WorldChartTarget | null): void;
  resize(width: number, height: number, pixelRatio: number): void;
  setActive(active: boolean): void;
  dispose(): void;
  setDebug?(debug: WorldDebug): void;
  getDiagnostics?(): WorldDiagnostics;
};
export type WorldOptions = {
  quality: WorldQuality;
  seed: number;
  onFailure: () => void;
  onOpacity?: (opacity: number) => void;
  signal?: AbortSignal;
  diagnostics?: boolean;
};
