import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { routing } from "../../apps/web/src/i18n/routing";
import { resolveCanonicalOriginRedirect } from "../../apps/web/src/routing/canonical-origin";
import { isExplicitVietnamesePath, isUnprefixedCanonicalReportPath } from "../../apps/web/src/routing/explicit-vietnamese-path";
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
      const viReq = new Request(`https://lasoviet.net${from}?tab=overview&ref=partner`);
      const viRes = resolveLegacyAliasRedirect(viReq);
      expect(viRes).toBeDefined();
      expect(viRes?.status).toBe(301);
      expect(viRes?.headers.get("location")).toBe(`https://lasoviet.net${to}?tab=overview&ref=partner`);

      // English request with query
      const enReq = new Request(`https://lasoviet.net/en${from}?tab=overview&ref=partner`);
      const enRes = resolveLegacyAliasRedirect(enReq);
      expect(enRes).toBeDefined();
      expect(enRes?.status).toBe(301);
      expect(enRes?.headers.get("location")).toBe(`https://lasoviet.net/en${to}?tab=overview&ref=partner`);

      // Trailing slash request
      const slashReq = new Request(`https://lasoviet.net${from}/`);
      const slashRes = resolveLegacyAliasRedirect(slashReq);
      expect(slashRes).toBeDefined();
      expect(slashRes?.status).toBe(301);
      expect(slashRes?.headers.get("location")).toBe(`https://lasoviet.net${to}`);
    }

    // Non-alias requests should return null so normal proxy routing handles them
    const unaffectedRequests = [
      "https://lasoviet.net/tu-vi",
      "https://lasoviet.net/en/tu-vi",
      "https://lasoviet.net/bat-tu",
      "https://lasoviet.net/en/bat-tu",
      "https://lasoviet.net/",
      "https://lasoviet.net/en",
      "https://lasoviet.net/chinh-sach-bao-mat",
    ];

    for (const url of unaffectedRequests) {
      expect(resolveLegacyAliasRedirect(new Request(url))).toBeNull();
    }
  });

  it("redirects configured reserve hosts to canonical origin with HTTP 301, preserving pathname and query", () => {
    // .vn with path and query params
    const vnReq = new Request(
      "https://lasoviet.vn/la-so/123/chon-luan-giai?tab=overview&ref=partner",
    );
    const vnRes = resolveCanonicalOriginRedirect(vnReq);
    expect(vnRes).toBeDefined();
    expect(vnRes?.status).toBe(301);
    expect(vnRes?.headers.get("location")).toBe(
      "https://lasoviet.net/la-so/123/chon-luan-giai?tab=overview&ref=partner",
    );

    // .vn root
    const vnRootReq = new Request("https://lasoviet.vn");
    const vnRootRes = resolveCanonicalOriginRedirect(vnRootReq);
    expect(vnRootRes?.status).toBe(301);
    expect(vnRootRes?.headers.get("location")).toBe("https://lasoviet.net/");

    // .vn with optional port
    const vnPortReq = new Request("https://lasoviet.vn:8443/tu-vi?ref=partner");
    const vnPortRes = resolveCanonicalOriginRedirect(vnPortReq);
    expect(vnPortRes?.status).toBe(301);
    expect(vnPortRes?.headers.get("location")).toBe(
      "https://lasoviet.net/tu-vi?ref=partner",
    );

    // .cloud host
    const cloudReq = new Request("https://lasoviet.cloud/bat-tu?tab=chart");
    const cloudRes = resolveCanonicalOriginRedirect(cloudReq);
    expect(cloudRes).toBeDefined();
    expect(cloudRes?.status).toBe(301);
    expect(cloudRes?.headers.get("location")).toBe(
      "https://lasoviet.net/bat-tu?tab=chart",
    );

    // .xyz host
    const xyzReq = new Request("https://lasoviet.xyz/kinh-dich?hexagram=1");
    const xyzRes = resolveCanonicalOriginRedirect(xyzReq);
    expect(xyzRes).toBeDefined();
    expect(xyzRes?.status).toBe(301);
    expect(xyzRes?.headers.get("location")).toBe(
      "https://lasoviet.net/kinh-dich?hexagram=1",
    );

    // Fragments are browser-local and not fabricated in Location header
    const fragmentReq = new Request(
      "https://lasoviet.vn/tu-vi?tab=overview#section-1",
    );
    const fragmentRes = resolveCanonicalOriginRedirect(fragmentReq);
    expect(fragmentRes?.status).toBe(301);
    expect(fragmentRes?.headers.get("location")).toBe(
      "https://lasoviet.net/tu-vi?tab=overview",
    );
  });

  it("does not redirect canonical .net, localhost, 127.0.0.1, or arbitrary hosts", () => {
    const nonRedirectCases = [
      "https://lasoviet.net/la-so/123/chon-luan-giai?tab=overview",
      "https://lasoviet.net/tu-vi",
      "https://lasoviet.net/",
      "http://localhost:3000/la-so/123",
      "http://localhost:3000/",
      "http://127.0.0.1:3000/la-so/123",
      "http://127.0.0.1:49152/health",
      "https://attacker.com/la-so/123",
      "https://lasoviet.vn.evil.com/la-so/123",
      "https://sub.lasoviet.vn/tu-vi",
      "https://preview.lasoviet.net/tu-vi",
    ];

    for (const url of nonRedirectCases) {
      expect(resolveCanonicalOriginRedirect(new Request(url))).toBeNull();
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

  it("identifies unprefixed canonical private-report paths as Vietnamese-forced", () => {
    expect(isUnprefixedCanonicalReportPath("/bao-cao")).toBe(true);
    expect(isUnprefixedCanonicalReportPath("/bao-cao/")).toBe(true);
    expect(isUnprefixedCanonicalReportPath("/bao-cao/019550b7-1549-74d3-b1d5-a3375b428d7a")).toBe(true);
    expect(isUnprefixedCanonicalReportPath("/en/bao-cao/019550b7-1549-74d3-b1d5-a3375b428d7a")).toBe(false);
    expect(isUnprefixedCanonicalReportPath("/vi/bao-cao/019550b7-1549-74d3-b1d5-a3375b428d7a")).toBe(false);
    expect(isUnprefixedCanonicalReportPath("/en/bao-cao")).toBe(false);
    expect(isUnprefixedCanonicalReportPath("/vi/bao-cao")).toBe(false);
    expect(isUnprefixedCanonicalReportPath("/bao-cao-khac")).toBe(false);
    expect(isUnprefixedCanonicalReportPath("/bao-cao-khac/123")).toBe(false);
    expect(isUnprefixedCanonicalReportPath("/bao-caox")).toBe(false);
    expect(isUnprefixedCanonicalReportPath("/")).toBe(false);
    expect(isUnprefixedCanonicalReportPath("/tu-vi")).toBe(false);
  });
});
