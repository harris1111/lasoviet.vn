import { describe, expect, it } from "vitest";

import { routeRegistry } from "@lasoviet/config";

import type {
  FreeToolsHubPageModel,
  GatedPreviewPageModel,
  UtilityPreviewPageModel,
} from "../../apps/web/src/features/free-tools/free-tools-page-model";
import { getFreeToolsPageProvider } from "../../apps/web/src/features/free-tools/free-tools-page-provider";

describe("free tools page contract", () => {
  const provider = getFreeToolsPageProvider();
  const locales = ["vi", "en"] as const;

  const UTILITY_PREVIEW_PATHS = [
    "/ngay-tot",
    "/12-con-giap",
    "/giai-ma-giac-mo",
    "/boi-bai",
    "/lich-am",
  ] as const;

  const GATED_PREVIEW_PATHS = [
    "/phong-thuy/huong-nha",
    "/xem-chi-tay",
  ] as const;

  it("resolves the hub kind for /cong-cu-mien-phi across vi and en", () => {
    const route = routeRegistry.find((entry) => entry.path === "/cong-cu-mien-phi");
    expect(route, "Route /cong-cu-mien-phi must exist in routeRegistry").toBeDefined();
    expect(route?.template).toBe("free-tools-hub");

    for (const locale of locales) {
      const page = provider.resolve({ route: route!, locale });
      expect(page, `Provider must resolve /cong-cu-mien-phi for ${locale}`).toBeDefined();
      expect(page?.kind).toBe("hub");

      const hubPage = page as FreeToolsHubPageModel;
      expect(hubPage.template).toBe("free-tools-hub");
      expect(hubPage.slug).toBe("/cong-cu-mien-phi");
      expect(hubPage.locale).toBe(locale);
      expect(hubPage.content.tools.length).toBe(7);
      expect(hubPage.content.principles.items.length).toBeGreaterThan(0);
      expect(hubPage.content.faqs.length).toBeGreaterThan(0);
      expect(hubPage.content.title).toBeTruthy();
    }
  });

  it("resolves five utility-preview kinds with illustrative source, true isIllustrative, and non-empty disclosure", () => {
    for (const path of UTILITY_PREVIEW_PATHS) {
      const route = routeRegistry.find((entry) => entry.path === path);
      expect(route, `Route ${path} must exist in routeRegistry`).toBeDefined();
      expect(route?.template).toBe("utility-preview");

      for (const locale of locales) {
        const page = provider.resolve({ route: route!, locale });
        expect(page, `Provider must resolve ${path} for ${locale}`).toBeDefined();
        expect(page?.kind).toBe("utility-preview");

        const previewPage = page as UtilityPreviewPageModel;
        expect(previewPage.template).toBe("utility-preview");
        expect(previewPage.slug).toBe(path);
        expect(previewPage.locale).toBe(locale);
        expect(previewPage.preview.sourceKind).toBe("illustrative");
        expect(previewPage.preview.isIllustrative).toBe(true);
        expect(previewPage.preview.disclosure.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("resolves two gated-preview kinds with isFunctional false and isAvailable false", () => {
    for (const path of GATED_PREVIEW_PATHS) {
      const route = routeRegistry.find((entry) => entry.path === path);
      expect(route, `Route ${path} must exist in routeRegistry`).toBeDefined();
      expect(route?.template).toBe("gated-preview");

      for (const locale of locales) {
        const page = provider.resolve({ route: route!, locale });
        expect(page, `Provider must resolve ${path} for ${locale}`).toBeDefined();
        expect(page?.kind).toBe("gated-preview");

        const gatedPage = page as GatedPreviewPageModel;
        expect(gatedPage.template).toBe("gated-preview");
        expect(gatedPage.slug).toBe(path);
        expect(gatedPage.locale).toBe(locale);
        expect(gatedPage.isFunctional).toBe(false);
        expect(gatedPage.isAvailable).toBe(false);
        expect(gatedPage.gateReason).toBeTruthy();
        expect(gatedPage.notice.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("returns null for unrelated routes", () => {
    const homeRoute = routeRegistry.find((entry) => entry.id === "brand.home")!;
    expect(homeRoute, "brand.home route must exist in routeRegistry").toBeDefined();
    expect(provider.resolve({ route: homeRoute, locale: "vi" })).toBeNull();
    expect(provider.resolve({ route: homeRoute, locale: "en" })).toBeNull();

    const batTuRoute = routeRegistry.find((entry) => entry.path === "/bat-tu")!;
    expect(batTuRoute, "bat-tu route must exist in routeRegistry").toBeDefined();
    expect(provider.resolve({ route: batTuRoute, locale: "vi" })).toBeNull();
    expect(provider.resolve({ route: batTuRoute, locale: "en" })).toBeNull();
  });
});
