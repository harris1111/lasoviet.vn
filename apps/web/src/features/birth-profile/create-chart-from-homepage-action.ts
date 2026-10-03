"use server";

import type { CreateChartFromHomepageInput } from "./create-chart-from-homepage";

export async function createChartFromHomepageAction(input: CreateChartFromHomepageInput) {
  const [{ createChartFromHomepage }, { saveBirthProfile }, { calculateZiweiChartInLocale }] = await Promise.all([
    import("./create-chart-from-homepage"),
    import("./save-birth-profile"),
    import("../ziwei/calculate-ziwei-chart-action"),
  ]);
  return createChartFromHomepage({
    saveBirthProfile,
    calculateZiweiChart: calculateZiweiChartInLocale,
  })(input);
}
