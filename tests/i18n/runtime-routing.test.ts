import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { routing } from "../../apps/web/src/i18n/routing";
import { isExplicitVietnamesePath } from "../../apps/web/src/routing/explicit-vietnamese-path";
import { resolveLegacyAliasRedirect } from "../../apps/web/src/routing/legacy-alias";

describe("localized app runtime tree", () => {
  it("redirects legacy aliases with HTTP 301, preserving query params and locale", () => {
    const aliasCases = [
      { from: "/la-so-tu-vi", to: "/tu-vi" },
      { from: "/la-so-bat-tu", to: "/bat-tu" },
      { from: "/gieo-que-kinh-dich", to: "/kinh-dich" },
      { from: "/ban-do-sao", to: "/chiem-tinh" },
      { from: "/boi-bai/tarot", to: "/boi-bai" },
    ];

    for (const { from, to } of aliasCases) {
      // Vietnamese request with query
      const viReq = new Request(`https://lasoviet.vn${from}?tab=overview&ref=partner`);
      const viRes = resolveLegacyAliasRedirect(viReq);
      expect(viRes).toBeDefined();
      expect(viRes?.status).toBe(301);
      expect(viRes?.headers.get("location")).toBe(`https://lasoviet.vn${to}?tab=overview&ref=partner`);

      // English request with query
      const enReq = new Request(`https://lasoviet.vn/en${from}?tab=overview&ref=partner`);
      const enRes = resolveLegacyAliasRedirect(enReq);
      expect(enRes).toBeDefined();
      expect(enRes?.status).toBe(301);
      expect(enRes?.headers.get("location")).toBe(`https://lasoviet.vn/en${to}?tab=overview&ref=partner`);

      // Trailing slash request
      const slashReq = new Request(`https://lasoviet.vn${from}/`);
      const slashRes = resolveLegacyAliasRedirect(slashReq);
      expect(slashRes).toBeDefined();
      expect(slashRes?.status).toBe(301);
      expect(slashRes?.headers.get("location")).toBe(`https://lasoviet.vn${to}`);
    }

    // Non-alias requests should return null so normal proxy routing handles them
    const unaffectedRequests = [
      "https://lasoviet.vn/tu-vi",
      "https://lasoviet.vn/en/tu-vi",
      "https://lasoviet.vn/bat-tu",
      "https://lasoviet.vn/en/bat-tu",
      "https://lasoviet.vn/",
      "https://lasoviet.vn/en",
      "https://lasoviet.vn/chinh-sach-bao-mat",
    ];

    for (const url of unaffectedRequests) {
      expect(resolveLegacyAliasRedirect(new Request(url))).toBeNull();
    }
  });

  it("exposes both locale params and localized app messages", async () => {
    expect(routing.locales).toEqual(["vi", "en"]);

    const [layoutSource, pageSource, requestSource, viMessages, enMessages] =
      await Promise.all([
        readFile("apps/web/src/app/[locale]/layout.tsx", "utf8"),
        readFile("apps/web/src/app/[locale]/page.tsx", "utf8"),
        readFile("apps/web/src/i18n/request.ts", "utf8"),
        readFile("apps/web/messages/vi/common.json", "utf8"),
        readFile("apps/web/messages/en/common.json", "utf8"),
      ]);

    expect(layoutSource).toContain(
      "return routing.locales.map((locale) => ({ locale }));",
    );
    expect(layoutSource).toContain("setRequestLocale");
    expect(layoutSource).toContain("NextIntlClientProvider");
    expect(layoutSource).toContain("lang={locale}");
    expect(pageSource).toContain('getTranslations("common")');
    expect(requestSource).toContain("getRequestConfig");
    expect(JSON.parse(viMessages).app).toMatchObject({
      taglinePrefix: "Lập lá số.",
      taglineHighlight: "Hiểu vận mệnh.",
    });
    expect(JSON.parse(enMessages).app).toMatchObject({
      taglinePrefix: "Build your chart.",
      taglineHighlight: "Understand your path.",
    });
  });

  it("detects explicit Vietnamese paths for proxy bypass", () => {
    expect(isExplicitVietnamesePath("/vi")).toBe(true);
    expect(isExplicitVietnamesePath("/vi/bat-tu")).toBe(true);
    expect(isExplicitVietnamesePath("/bat-tu")).toBe(false);
    expect(isExplicitVietnamesePath("/en/bat-tu")).toBe(false);
  });
});
