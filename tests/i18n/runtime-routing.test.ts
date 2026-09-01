import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { routing } from "../../apps/web/src/i18n/routing";

describe("localized app runtime tree", () => {
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
    expect(layoutSource).toContain("<html lang={locale}>");
    expect(pageSource).toContain('getTranslations("common")');
    expect(requestSource).toContain("getRequestConfig");
    expect(JSON.parse(viMessages).app.tagline).toBe("Lập lá số. Hiểu vận mệnh.");
    expect(JSON.parse(enMessages).app.tagline).toBe(
      "Build your chart. Understand your path.",
    );
  });
});
