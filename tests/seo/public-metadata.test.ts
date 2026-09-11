import { describe, expect, it } from "vitest";

import { routeRegistry } from "@lasoviet/config";

import { createPublicContentRepository } from "../../apps/web/src/features/content/public-content-repository";
import { buildPublicMetadata, buildRobotsPolicy } from "../../apps/web/src/seo/public-metadata";

const homeRoute = routeRegistry.find((route) => route.id === "brand.home");
const privateRoute = routeRegistry.find((route) => route.private);

const previewRoute = routeRegistry.find((route) => route.status === "live_noindex" && !route.private);

if (homeRoute === undefined || privateRoute === undefined || previewRoute === undefined) {
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
        canonical: "https://lasoviet.net/",
        languages: {
          vi: "https://lasoviet.net/",
          en: "https://lasoviet.net/en",
          "x-default": "https://lasoviet.net/",
        },
      },
      robots: { index: true, follow: true },
    });
    expect(buildPublicMetadata(homeRoute, repository.get(homeRoute.id, "en"))).toMatchObject({
      title: "La So Viet",
      alternates: { canonical: "https://lasoviet.net/en" },
    });
  });

  it("has a private noindex policy and emits no public canonical", () => {
    expect(buildRobotsPolicy(privateRoute)).toEqual({ index: false, follow: false });
    expect(buildPublicMetadata(privateRoute, undefined)).toEqual({
      robots: { index: false, follow: false },
    });
  });

  it("uses an explicit canonical route path for both locale alternates", () => {
    const canonicalFixture = {
      ...homeRoute,
      id: "canonical-fixture",
      intent: "canonical-fixture",
      path: "/duplicate-page",
      canonical: "/canonical-page",
    };
    const content = { ...homeContent, routeId: canonicalFixture.id, locale: "en" as const };

    expect(buildPublicMetadata(canonicalFixture, content)).toMatchObject({
      alternates: {
        canonical: "https://lasoviet.net/en/canonical-page",
        languages: {
          vi: "https://lasoviet.net/canonical-page",
          en: "https://lasoviet.net/en/canonical-page",
          "x-default": "https://lasoviet.net/canonical-page",
        },
      },
    });
  });

  it("builds canonical, alternates, and noindex-follow robots for live_noindex preview routes", () => {
    const previewContent = {
      routeId: previewRoute.id,
      locale: "vi" as const,
      contentType: "ToolLanding" as const,
      title: "Bát Tự Hà Lạc",
      summary: "Khám phá bản đồ vận mệnh theo Bát Tự.",
      reviewer: "content-team",
      sourceReferences: ["source:bazi"],
      riskTags: [],
      status: "published" as const,
      lastReviewed: "2026-09-01",
    };

    const repository = createPublicContentRepository(
      [
        previewContent,
        { ...previewContent, locale: "en" as const, title: "Four Pillars of Destiny" },
      ],
      [previewRoute],
    );

    const viMetadata = buildPublicMetadata(
      previewRoute,
      repository.get(previewRoute.id, "vi"),
    );
    expect(viMetadata).toEqual({
      title: "Bát Tự Hà Lạc",
      description: "Khám phá bản đồ vận mệnh theo Bát Tự.",
      alternates: {
        canonical: `https://lasoviet.net${previewRoute.path}`,
        languages: {
          vi: `https://lasoviet.net${previewRoute.path}`,
          en: `https://lasoviet.net/en${previewRoute.path}`,
          "x-default": `https://lasoviet.net${previewRoute.path}`,
        },
      },
      robots: { index: false, follow: true },
    });

    const enMetadata = buildPublicMetadata(
      previewRoute,
      repository.get(previewRoute.id, "en"),
    );
    expect(enMetadata).toMatchObject({
      title: "Four Pillars of Destiny",
      alternates: {
        canonical: `https://lasoviet.net/en${previewRoute.path}`,
      },
      robots: { index: false, follow: true },
    });
  });

  it("uses the route indexing policy for noindex-follow routes", () => {
    expect(
      buildRobotsPolicy({
        ...homeRoute,
        status: "live_noindex",
        indexing: "noindex_follow",
        robots: "noindex,follow",
      }),
    ).toEqual({ index: false, follow: true });
  });
});
