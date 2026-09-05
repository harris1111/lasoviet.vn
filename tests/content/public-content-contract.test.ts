import { readFile } from "node:fs/promises";

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
  it("validates the version-controlled source for every public route and locale", async () => {
    const records = JSON.parse(
      await readFile("config/public-content.json", "utf8"),
    );
    const publicRoutes = routeRegistry.filter(
      (route) =>
        (route.status === "live_indexable" || route.status === "live_noindex") &&
        !route.private,
    );
    const validated = validatePublicContent(records, routeRegistry);
    const keys = new Set(
      validated.map((record) => `${record.routeId}:${record.locale}`),
    );

    expect(validated).toHaveLength(publicRoutes.length * 2);
    expect(keys.size).toBe(validated.length);
    for (const route of publicRoutes) {
      expect(keys).toContain(`${route.id}:vi`);
      expect(keys).toContain(`${route.id}:en`);
    }
  });

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
  it("validates published records for live_noindex preview routes", async () => {
    const records = JSON.parse(
      await readFile("config/public-content.json", "utf8"),
    );
    const requiredPreviewRouteIds = [
      "calculator.bat-tu",
      "calculator.kinh-dich",
      "calculator.western-natal",
      "calculator.numerology",
      "utility.root",
      "utility.good-days",
      "utility.zodiac",
      "content.dream-symbols",
      "calculator.tarot",
      "utility.lunar-calendar",
      "utility.feng-shui",
      "utility.palmistry",
    ];

    const validated = validatePublicContent(records, routeRegistry);
    for (const id of requiredPreviewRouteIds) {
      const vi = validated.find((r) => r.routeId === id && r.locale === "vi");
      const en = validated.find((r) => r.routeId === id && r.locale === "en");
      expect(vi).toBeDefined();
      expect(en).toBeDefined();
      expect(vi?.status).toBe("published");
      expect(en?.status).toBe("published");
    }
  });
});