// Pure subpath only: importing the backend root would pull server dependencies into the client.
export { SCORE_BASE, CHIEU_WEIGHT, scoreBand, computePalaceScores, computeNormalizedPalaceScores } from "@lasoviet/backend/reports/structural-palace-score";
export type { PalaceScore, PalaceScoreBandKey } from "@lasoviet/backend/reports/structural-palace-score";
