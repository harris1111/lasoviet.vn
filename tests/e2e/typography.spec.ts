import { expect, test, type Page } from "@playwright/test";

const locales = [
  {
    code: "vi",
    path: "/",
    acceptLanguage: "vi-VN,vi;q=0.9",
    sample: "Lập lá số. Hiểu vận mệnh. Quyền riêng tư. Luận giải.",
  },
  {
    code: "en",
    path: "/en",
    acceptLanguage: "en-US,en;q=0.9",
    sample: "Build your chart. Understand your path. Privacy. Interpretation.",
  },
] as const;

async function visitLocalizedHome(
  page: Page,
  locale: (typeof locales)[number],
) {
  const baseURL = test.info().project.use.baseURL;
  if (typeof baseURL !== "string") {
    throw new Error("PLAYWRIGHT_BASE_URL is required");
  }
  const base = new URL(baseURL);
  const target = new URL(locale.path, base);
  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: locale.code,
      url: new URL("/", base).toString(),
    },
  ]);
  await page.setExtraHTTPHeaders({
    "Accept-Language": locale.acceptLanguage,
  });
  await page.goto(target.toString());
}

for (const locale of locales) {
  test(`loads bundled UI, display, and mono fonts in ${locale.code}`, async ({
    page,
  }) => {
    await visitLocalizedHome(page, locale);

    const loadedFontRoles = await page.evaluate(async (sample) => {
      await document.fonts.ready;

      const loadedFamilies = Array.from(document.fonts)
        .filter((font) => font.status === "loaded")
        .map((font) => font.family.replaceAll('"', ""));

      return [
        ["ui", "body"],
        ["display", "h1"],
        ["mono", ".eyebrow"],
      ].map(([role, selector]) => {
        const family = getComputedStyle(
          document.querySelector(selector)!,
        ).fontFamily;
        const loadedFamily = loadedFamilies.find((candidate) =>
          family.includes(candidate),
        );

        return {
          role,
          family,
          loaded:
            loadedFamily !== undefined &&
            document.fonts.check(`16px "${loadedFamily}"`, sample),
        };
      });
    }, locale.sample);

    expect(loadedFontRoles).toEqual([
      expect.objectContaining({ role: "ui", loaded: true }),
      expect.objectContaining({ role: "display", loaded: true }),
      expect.objectContaining({ role: "mono", loaded: true }),
    ]);
  });
}
