import { describe, expect, it } from "vitest";

import { IDENTITY_REPORT_SECTION_IDS } from "@lasoviet/contracts";

import { identityReportOutline } from "./identity-report-outline.js";

describe("identity report outline", () => {
  it("owns the exact report order and evidence-backed section policy", () => {
    expect(identityReportOutline.map((section) => section.id)).toEqual(IDENTITY_REPORT_SECTION_IDS);
    expect(identityReportOutline.find((section) => section.id === "identity_analysis")).toMatchObject({
      requiresEvidenceBackedClaims: true,
    });
  });
});
