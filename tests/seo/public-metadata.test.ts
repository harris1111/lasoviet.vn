import { describe, expect, it } from "vitest";

import { routeRegistry } from "@lasoviet/config";

import { createPublicContentRepository } from "../../apps/web/src/features/content/public-content-repository";
import { buildPublicMetadata, buildRobotsPolicy } from "../../apps/web/src/seo/public-metadata";

const homeRoute = routeRegistry.find((route) => route.id === "brand.home");
const privateRoute = routeRegistry.find((route) => route.private);

if (homeRoute === undefined || privateRoute === undefined) {
  throw new Error("Required route fixtures are missing");
}

const homeContent = {
  routeId: homeRoute.id,
  locale: "vi" as const,
  contentType: "SeoMetadata" as const,
  title: "Lá Số Việt",
  summary: "Nền tảng lập và luận giải lá số cho người Việt.",
  reviewer: "brand-reviewer",
  sourceReferences: ["source:brand"],
  riskTags: [],
  status: "published" as const,
  lastReviewed: "2026-09-01",
};

describe("public metadata", () => {
  it("builds Vietnamese and English root canonical, alternates, and robots", () => {
    const repository = createPublicContentRepository(
      [homeContent, { ...homeContent, locale: "en", title: "La So Viet" }],
      [homeRoute],
    );

    expect(buildPublicMetadata(homeRoute, repository.get(homeRoute.id, "vi"))).toEqual({
      title: "Lá Số Việt",
      description: "Nền tảng lập và luận giải lá số cho người Việt.",
      alternates: {
        canonical: "https://lasoviet.vn/",
        languages: {
          vi: "https://lasoviet.vn/",
          en: "https://lasoviet.vn/en",
          "x-default": "https://lasoviet.vn/",
        },
      },
      robots: { index: true, follow: true },
    });
    expect(buildPublicMetadata(homeRoute, repository.get(homeRoute.id, "en"))).toMatchObject({
      title: "La So Viet",
      alternates: { canonical: "https://lasoviet.vn/en" },
    });
  });

  it("has a private noindex policy and emits no public canonical", () => {
    expect(buildRobotsPolicy(privateRoute)).toEqual({ index: false, follow: false });
    expect(buildPublicMetadata(privateRoute, undefined)).toEqual({
      robots: { index: false, follow: false },
    });
  });
});
