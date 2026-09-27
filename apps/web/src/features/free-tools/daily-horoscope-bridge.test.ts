import { describe, expect, it } from "vitest";

import {
  buildDailyHoroscopeWizardHref,
  getDailyHoroscopeBridgeMetadata,
} from "./daily-horoscope-bridge.js";

describe("daily-horoscope-bridge", () => {
  it("builds canonical wizard link for Vietnamese locale with from parameter", () => {
    const href = buildDailyHoroscopeWizardHref({ locale: "vi" });
    expect(href).toBe("/tao-la-so/tu-vi?from=tu-vi-hom-nay");
  });

  it("builds canonical wizard link for English locale with from parameter", () => {
    const href = buildDailyHoroscopeWizardHref({ locale: "en" });
    expect(href).toBe("/en/tao-la-so/tu-vi?from=tu-vi-hom-nay");
  });

  it("includes zodiac in query parameters when provided", () => {
    const href = buildDailyHoroscopeWizardHref({
      locale: "vi",
      zodiac: "Thân",
    });
    expect(href).toBe("/tao-la-so/tu-vi?from=tu-vi-hom-nay&zodiac=Th%C3%A2n");
  });

  it("includes asOfDate in query parameters when provided", () => {
    const href = buildDailyHoroscopeWizardHref({
      locale: "vi",
      asOfDate: "2026-09-22",
    });
    expect(href).toBe("/tao-la-so/tu-vi?from=tu-vi-hom-nay&asOfDate=2026-09-22");
  });

  it("returns typed bridge metadata with self_understanding topConcern", () => {
    const metadata = getDailyHoroscopeBridgeMetadata({
      zodiac: "Thân",
      asOfDate: "2026-09-22",
    });

    expect(metadata.from).toBe("tu-vi-hom-nay");
    expect(metadata.suggestedConcern).toBe("self_understanding");
    expect(metadata.entryPoint).toBe("tool_tu-vi-hom-nay");
    expect(metadata.zodiac).toBe("Thân");
    expect(metadata.asOfDate).toBe("2026-09-22");
  });
});
