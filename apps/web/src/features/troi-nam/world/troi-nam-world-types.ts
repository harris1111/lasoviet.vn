export type WorldQuality = "low" | "high";

export type WorldChartTarget = { x: number; y: number; width: number; height: number };

export type WorldHandle = {
  setProgress(value: number): void;
  setChartTarget(rect: WorldChartTarget | null): void;
  resize(width: number, height: number, pixelRatio: number): void;
  setActive(active: boolean): void;
  dispose(): void;
};

export type WorldOptions = {
  quality: WorldQuality;
  seed: number;
  onFailure: () => void;
};
