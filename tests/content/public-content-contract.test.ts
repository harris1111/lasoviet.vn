import { describe, expect, it } from "vitest";

import { PublicContentV1Schema } from "@lasoviet/contracts";

import {
  routeRegistry,
  validatePublicContent,
} from "../../packages/config/src/route-registry.js";

const publicRoute = routeRegistry.find(
  (route) => route.status === "live_indexable",
);

if (publicRoute === undefined) {
  throw new Error("RED fixture requires a live indexable route");
}

const validContent = {
  routeId: publicRoute.id,
  locale: "vi",
  contentType: "ToolLanding",
  title: "Lập lá số Tử Vi",
  summary: "Công cụ lập lá số với phương pháp và giới hạn rõ ràng.",
  reviewer: "content-reviewer",
  sourceReferences: ["source:methodology-1"],
  riskTags: ["uncertainty_disclosure"],
  status: "published",
  lastReviewed: "2026-09-01",
} as const;

describe("public content contract", () => {
  it("accepts reviewed content owned by a public route", () => {
    expect(PublicContentV1Schema.parse(validContent)).toMatchObject(validContent);
    expect(validatePublicContent([validContent], routeRegistry)).toEqual([
      validContent,
    ]);
  });

  it("rejects placeholders and content without VI/EN route ownership", () => {
    expect(() =>
      PublicContentV1Schema.parse({
        ...validContent,
        summary: "TODO: write content",
      }),
    ).toThrow(/CONTENT_METADATA_INVALID/);

    expect(() =>
      validatePublicContent(
        [
          {
            ...validContent,
            locale: "en",
          },
        ],
        [
          {
            ...publicRoute,
            localeOwners: ["vi"],
          },
        ],
      ),
    ).toThrow(/CONTENT_METADATA_INVALID/);
  });
});
