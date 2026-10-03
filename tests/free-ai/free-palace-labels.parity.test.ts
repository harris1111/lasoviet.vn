import { describe, expect, it } from "vitest";
import { FREE_PALACE_EN_LABELS, freePalaceLabel } from "../../packages/backend/src/ziwei/free-palace-labels.js";
import { ziweiPresentation } from "../../apps/web/src/features/ziwei/ziwei-presentation.js";

describe("free palace English labels mirror the web presentation (no silent drift)", () => {
  const web = ziweiPresentation("en", { strict: false });
  const webVi = ziweiPresentation("vi", { strict: false });
  it.each(Object.entries(FREE_PALACE_EN_LABELS))("%s", (id, label) => {
    const kind = id.split(".")[1]!;
    const fromWeb = kind === "palace" ? web.palace(id) : kind === "branch" ? web.branch(id) : kind === "brightness" ? web.brightness(id)
      : kind === "transformation" ? web.transformation(id) : web.star(id);
    expect(label).toBe(fromWeb);
  });
  it("the Vietnamese labels the backend uses agree with the web for the same ids", () => {
    for (const id of Object.keys(FREE_PALACE_EN_LABELS)) {
      const kind = id.split(".")[1]!;
      const vi = freePalaceLabel("vi", id);
      if (!vi) continue;
      const webValue = kind === "palace" ? webVi.palace(id) : kind === "branch" ? webVi.branch(id) : kind === "brightness" ? webVi.brightness(id)
        : kind === "transformation" ? webVi.transformation(id) : webVi.star(id);
      // backend labels carry a type prefix ("cung ", "sao ") and different casing; compare the distinctive name
      expect(vi.toLowerCase().endsWith(webValue.toLowerCase().replace(/^cung /, "")) || vi.toLowerCase().includes(webValue.toLowerCase().replace(/^cung /, ""))).toBe(true);
    }
  });
});
