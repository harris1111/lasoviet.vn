import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { routeRegistry } from "@lasoviet/config";
import { PublicContentPage } from "../content/public-content-page";
import { loadPublicContentRepository } from "../content/public-content-repository";
import { resolvePublicRoute } from "../content/public-route-resolver";
import { DreamSymbolPreview } from "./dream-symbol-preview";
import { FengShuiPreview } from "./feng-shui-preview";
import { TarotPreview } from "./tarot-preview";
import { ZodiacPreview } from "./zodiac-preview";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("render-contract: 4 previews x 2 locales login href decode callback and public route resolution", () => {
  const repository = loadPublicContentRepository(routeRegistry);

  function extractLoginHref(html: string): string {
    const match = html.match(/href="([^"]*dang-nhap[^"]*)"/);
    if (!match || !match[1]) {
      throw new Error(`Login href not found in rendered markup: ${html.slice(0, 300)}`);
    }
    return match[1];
  }

  function extractCallbackPath(loginHref: string): string {
    const parsed = new URL(loginHref, "https://lasoviet.net");
    const callback = parsed.searchParams.get("callbackURL");
    if (!callback) {
      throw new Error(`callbackURL missing from login href: ${loginHref}`);
    }
    return decodeURIComponent(callback);
  }

  const previews = [
    {
      name: "TarotPreview",
      component: (locale: "vi" | "en") => <TarotPreview locale={locale} />,
      expectedRouteId: "calculator.tarot",
      expectedMarker: "data-screen-label=\"boi-bai\"",
    },
    {
      name: "ZodiacPreview",
      component: (locale: "vi" | "en") => <ZodiacPreview locale={locale} />,
      expectedRouteId: "utility.zodiac",
      expectedMarker: "data-screen-label=\"12-con-giap\"",
    },
    {
      name: "DreamSymbolPreview",
      component: (locale: "vi" | "en") => <DreamSymbolPreview locale={locale} />,
      expectedRouteId: "content.dream-symbols",
      expectedMarker: "data-screen-label=\"giai-ma-giac-mo\"",
    },
    {
      name: "FengShuiPreview",
      component: (locale: "vi" | "en") => <FengShuiPreview locale={locale} />,
      expectedRouteId: "utility.feng-shui",
      expectedMarker: "data-screen-label=\"phong-thuy-huong-nha\"",
    },
  ] as const;

  const locales = ["vi", "en"] as const;

  for (const preview of previews) {
    for (const locale of locales) {
      it(`renders login href in ${preview.name} (${locale}), decodes callback, resolves public route, and verifies PublicContentPage marker`, () => {
        // 1. Render preview component directly to inspect actual rendered login href
        const previewHtml = renderToStaticMarkup(preview.component(locale));
        const loginHref = extractLoginHref(previewHtml);

        // 2. Decode callbackURL from loginHref
        const callbackPath = extractCallbackPath(loginHref);

        // 3. Resolve callbackPath with real registry and content repository
        const resolved = resolvePublicRoute(callbackPath, {
          routes: routeRegistry,
          contentRepository: repository,
        });

        expect(resolved.kind).toBe("render");
        if (resolved.kind !== "render") return;

        expect(resolved.locale).toBe(locale);
        expect(resolved.route.id).toBe(preview.expectedRouteId);

        // 4. Render PublicContentPage using resolved route and content
        const pageHtml = renderToStaticMarkup(
          <PublicContentPage
            content={resolved.content}
            locale={resolved.locale}
            repository={repository}
            route={resolved.route}
            routes={routeRegistry}
          />,
        );

        // Verify PublicContentPage renders the correct preview marker
        expect(pageHtml).toContain(preview.expectedMarker);
      });
    }
  }

  it("negative: /cung-hoang-dao and /en/cung-hoang-dao resolve to reserved 404", () => {
    const viResolution = resolvePublicRoute("/cung-hoang-dao", {
      routes: routeRegistry,
      contentRepository: repository,
    });
    expect(viResolution).toEqual({
      kind: "not-found",
      state: "reserved",
      code: "ROUTE_RESERVED",
    });

    const enResolution = resolvePublicRoute("/en/cung-hoang-dao", {
      routes: routeRegistry,
      contentRepository: repository,
    });
    expect(enResolution).toEqual({
      kind: "not-found",
      state: "reserved",
      code: "ROUTE_RESERVED",
    });
  });
});
