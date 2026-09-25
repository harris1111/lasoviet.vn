/** Render state only. Validation remains owned by the existing birth wizard. */
export type HeroLogoStage = "rest" | "date" | "time" | "complete";

export type HeroLogoInput = {
  dateValid: boolean;
  timeValid: boolean; // exact, branch, or explicitly chosen unknown time
  genderSelected: boolean;
};

export function getHeroLogoStage({ dateValid, timeValid, genderSelected }: HeroLogoInput): HeroLogoStage {
  if (!dateValid) return "rest";
  if (!timeValid) return "date";
  return genderSelected ? "complete" : "time";
}
