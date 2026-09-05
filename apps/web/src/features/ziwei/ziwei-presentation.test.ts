import { describe, expect, it } from "vitest";

import { ziweiPresentation } from "./ziwei-presentation";

describe("localized Zi Wei presentation", () => {
  it("presents canonical chart and evidence identifiers without exposing raw IDs", () => {
    const en = ziweiPresentation("en");
    const vi = ziweiPresentation("vi");

    expect(en.palace("ziwei.palace.travel")).toBe("Travel Palace");
    expect(vi.palace("ziwei.palace.travel")).toBe("Cung Thiên Di");
    expect(en.branch("ziwei.branch.tiger")).toBe("Tiger");
    expect(vi.branch("ziwei.branch.tiger")).toBe("Dần");
    expect(en.star("ziwei.star.pojun")).toBe("Po Jun");
    expect(vi.star("ziwei.star.pojun")).toBe("Phá Quân");
    expect(en.action("reflect")).toBe("Reflect");
    expect(vi.action("explore")).toBe("Khám phá thêm");
    expect(en.confidence("moderate")).toBe("Moderate");
    expect(vi.confidence("high")).toBe("Cao");
    expect(en.evidence("ziwei.identity.life-palace")).toBe(
      "Life Palace evidence",
    );
    expect(en.fact("palaces.ziwei.palace.life.earthlyBranchId")).toBe(
      "Life Palace branch",
    );
    expect(en.limitation("IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION")).toBe(
      "True solar time correction is not applied.",
    );
    expect(en.insight("body-palace-transformations-tension")).toBe(
      "Body Palace and transformations tension",
    );
    expect(en.offer("ZIWEI-IDENTITY-P0")).toBe("Identity and potential");
  });
});
