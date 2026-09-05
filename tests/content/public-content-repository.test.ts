import { describe, expect, it } from "vitest";

import { routeRegistry } from "@lasoviet/config";

import {
  PublicContentRepositoryError,
  createPublicContentRepository,
} from "../../apps/web/src/features/content/public-content-repository";
import { resolvePublicRoute } from "../../apps/web/src/features/content/public-route-resolver";

const publicRoute = routeRegistry.find(
  (route) => route.status === "live_indexable" && route.path !== "/",
);
const privateRoute = routeRegistry.find((route) => route.private);
const reservedRoute = routeRegistry.find((route) => route.status === "reserved");
const reservedYearRoute = routeRegistry.find(
  (route) => route.id === "commercial.tu-vi.year",
);
const liveNoindexRoute = routeRegistry.find(
  (route) => route.status === "live_noindex" && !route.private,
);

if (
  publicRoute === undefined ||
  privateRoute === undefined ||
  reservedRoute === undefined ||
  reservedYearRoute === undefined ||
  liveNoindexRoute === undefined
) {
  throw new Error("Required route fixtures are missing");
}

const contentRecord = {
  routeId: publicRoute.id,
  locale: "vi" as const,
  contentType: "ToolLanding" as const,
  title: "Published route title",
  summary: "Published route summary.",
  reviewer: "content-reviewer",
  sourceReferences: ["source:one"],
  riskTags: [],
  status: "published" as const,
  lastReviewed: "2026-09-01",
};

const liveNoindexContentRecord = {
  routeId: liveNoindexRoute.id,
  locale: "vi" as const,
  contentType: "ToolLanding" as const,
  title: "Preview route title",
  summary: "Preview route summary.",
  reviewer: "content-reviewer",
  sourceReferences: ["source:preview"],
  riskTags: [],
  status: "published" as const,
  lastReviewed: "2026-09-01",
};

describe("public content repository and route resolver", () => {
  it("resolves matching published VI and EN content for a live public route", () => {
    const repository = createPublicContentRepository(
      [contentRecord, { ...contentRecord, locale: "en", title: "English title" }],
      [publicRoute],
    );

    expect(repository.get(publicRoute.id, "vi")).toMatchObject(contentRecord);
    expect(
      resolvePublicRoute(publicRoute.path, {
        routes: [publicRoute],
        contentRepository: repository,
      }),
    ).toMatchObject({
      kind: "render",
      locale: "vi",
      route: { id: publicRoute.id },
      content: contentRecord,
    });
    expect(
      resolvePublicRoute(`/en${publicRoute.path}`, {
        routes: [publicRoute],
        contentRepository: repository,
      }),
    ).toMatchObject({
      kind: "render",
      locale: "en",
      route: { id: publicRoute.id },
      content: { title: "English title" },
    });
  });

  it("resolves and renders public live_noindex preview routes while rejecting private or reserved states", () => {
    const repository = createPublicContentRepository(
      [
        liveNoindexContentRecord,
        { ...liveNoindexContentRecord, locale: "en", title: "English preview title" },
      ],
      [liveNoindexRoute, reservedRoute, privateRoute],
    );

    expect(repository.get(liveNoindexRoute.id, "vi")).toMatchObject(
      liveNoindexContentRecord,
    );
    expect(repository.get(liveNoindexRoute.id, "en")).toMatchObject({
      title: "English preview title",
    });

    expect(
      resolvePublicRoute(liveNoindexRoute.path, {
        routes: [liveNoindexRoute],
        contentRepository: repository,
      }),
    ).toMatchObject({
      kind: "render",
      locale: "vi",
      route: { id: liveNoindexRoute.id, status: "live_noindex" },
      content: liveNoindexContentRecord,
    });

    expect(
      resolvePublicRoute(`/en${liveNoindexRoute.path}`, {
        routes: [liveNoindexRoute],
        contentRepository: repository,
      }),
    ).toMatchObject({
      kind: "render",
      locale: "en",
      route: { id: liveNoindexRoute.id, status: "live_noindex" },
      content: { title: "English preview title" },
    });
  });

  it("does not expose reserved or private routes as public content", () => {
    const repository = createPublicContentRepository([], [reservedRoute, privateRoute]);

    expect(
      resolvePublicRoute(reservedRoute.path, {
        routes: [reservedRoute],
        contentRepository: repository,
      }),
    ).toEqual({ kind: "not-found", state: "reserved", code: "ROUTE_RESERVED" });
    expect(
      resolvePublicRoute(privateRoute.path, {
        routes: [privateRoute],
        contentRepository: repository,
      }),
    ).toEqual({ kind: "not-found", state: "private" });
  });

  it("matches embedded registry placeholders for Vietnamese and English reserved paths", () => {
    const repository = createPublicContentRepository([], [reservedYearRoute]);
    const dependencies = { routes: [reservedYearRoute], contentRepository: repository };

    expect(resolvePublicRoute("/luan-giai-tu-vi/van-trinh-2027", dependencies)).toEqual({
      kind: "not-found",
      state: "reserved",
      code: "ROUTE_RESERVED",
    });
    expect(resolvePublicRoute("/en/luan-giai-tu-vi/van-trinh-2027", dependencies)).toEqual({
      kind: "not-found",
      state: "reserved",
      code: "ROUTE_RESERVED",
    });
    expect(resolvePublicRoute("/luan-giai-tu-vi/van-trinh-", dependencies)).toEqual({
      kind: "not-found",
      state: "unknown",
    });
  });

  it("uses archived route dispositions from injected registry fixtures", () => {
    const repository = createPublicContentRepository([], []);
    const archived = ["301", "404", "410"].map((disposition) => ({
      ...publicRoute,
      id: `archived-${disposition}`,
      intent: `archived-${disposition}`,
      path: `/archived-${disposition}`,
      status: "archived" as const,
      indexing: "redirect" as const,
      redirect: {
        disposition: disposition as "301" | "404" | "410",
        ...(disposition === "301" ? { target: "/replacement" } : {}),
      },
      schemaTypes: [],
      content: undefined,
      reviewer: undefined,
    }));

    expect(
      resolvePublicRoute("/archived-301", { routes: archived, contentRepository: repository }),
    ).toEqual({ kind: "redirect", status: 301, target: "/replacement" });
    expect(
      resolvePublicRoute("/archived-404", { routes: archived, contentRepository: repository }),
    ).toEqual({ kind: "not-found", state: "archived", code: "ROUTE_ARCHIVED" });
    expect(
      resolvePublicRoute("/archived-410", { routes: archived, contentRepository: repository }),
    ).toEqual({ kind: "gone", status: 410, code: "ROUTE_ARCHIVED" });
  });

  it("rejects missing and duplicate content records with stable errors", () => {
    const emptyRepository = createPublicContentRepository([], [publicRoute]);
    expect(() => emptyRepository.get(publicRoute.id, "vi")).toThrow(
      new PublicContentRepositoryError("PUBLIC_CONTENT_NOT_FOUND"),
    );
    expect(() =>
      createPublicContentRepository([contentRecord, contentRecord], [publicRoute]),
    ).toThrow(new PublicContentRepositoryError("PUBLIC_CONTENT_NOT_FOUND"));
  });
});
