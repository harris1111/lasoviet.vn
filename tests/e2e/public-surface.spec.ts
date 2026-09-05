import { expect, test, type Page } from "@playwright/test";

const homeBlocks = [
  "header",
  "hero",
  "trust-strip",
  "problem",
  "lenses",
  "chatbot-comparison",
  "category-comparison",
  "about-method",
  "process",
  "free-value",
  "evidence",
  "value-ladder",
  "trust-specs",
  "knowledge",
  "faq",
  "final-cta",
];

const locales = [
  {
    code: "vi",
    path: "/",
    acceptLanguage: "vi-VN,vi;q=0.9",
    canonical: "https://lasoviet.vn/",
    title: "Lá Số Việt | Lập lá số. Hiểu vận mệnh.",
    description:
      "Nền tảng lập và luận giải lá số có căn cứ, bắt đầu với Tử Vi và trải nghiệm rõ ràng cho người Việt.",
    cta: "Lập lá số miễn phí",
    finalCta: "Lập lá số miễn phí ngay",
    chartPath: "/tao-la-so/tu-vi",
    menuLabel: "Mở điều hướng",
    brandName: "Lá Số Việt",
    anchors: [
      "/#hero-form",
      "/#he-quy-chieu",
      "/#kien-thuc",
      "/#phuong-phap",
    ],
  },
  {
    code: "en",
    path: "/en",
    acceptLanguage: "en-US,en;q=0.9",
    canonical: "https://lasoviet.vn/en",
    title: "La So Viet | Build your chart. Understand your path.",
    description:
      "A grounded chart-building and interpretation platform, beginning with Tu Vi for Vietnamese users.",
    cta: "Build your chart for free",
    finalCta: "Build your free chart now",
    chartPath: "/en/tao-la-so/tu-vi",
    menuLabel: "Open navigation",
    brandName: "La So Viet",
    anchors: [
      "/en#hero-form",
      "/en#he-quy-chieu",
      "/en#kien-thuc",
      "/en#phuong-phap",
    ],
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

for (const viewport of [
  { name: "mobile", width: 320, height: 720 },
  { name: "desktop-1280x972", width: 1280, height: 972 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  for (const locale of locales) {
    test(`${locale.code} homepage fits the ${viewport.name} viewport`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await visitLocalizedHome(page, locale);

      expect(
        await page.locator("[data-home-block]").evaluateAll((blocks) =>
          blocks.map((block) => block.getAttribute("data-home-block")),
        ),
      ).toEqual(homeBlocks);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);

      if (viewport.name === "desktop-1280x972") {
        // Complete 4-column trust strip is visible
        await expect(page.locator(".commitment")).toHaveCount(4);
        // Next problem block eyebrow begins before viewport bottom
        const problem = page.locator('[data-home-block="problem"]');
        await expect(problem).toBeVisible();
        const box = await problem.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.y).toBeLessThan(972);
      }

      if (viewport.name === "mobile") {
        // Header height within 64px range
        const header = page.locator(".site-header");
        const headerBox = await header.boundingBox();
        expect(headerBox).not.toBeNull();
        expect(headerBox!.height).toBeLessThanOrEqual(66);

        // Inputs >= 44px
        const inputs = page.locator("#hero-form input, #hero-form select, #hero-form button");
        for (const input of await inputs.all()) {
          const b = await input.boundingBox();
          if (b) {
            expect(b.height).toBeGreaterThanOrEqual(44);
          }
        }
      }

      await page.screenshot({
        fullPage: true,
        path: testInfo.outputPath(`homepage-${locale.code}-${viewport.name}.png`),
      });
    });
  }
}

test("uses exact localized routes and keeps planned offers inert", async ({
  page,
}) => {
  for (const locale of locales) {
    await visitLocalizedHome(page, locale);

    // Hero form presence
    const heroForm = page.locator("#hero-form");
    await expect(heroForm).toBeVisible();
    await expect(heroForm.getByRole("button", { name: locale.cta })).toBeVisible();
    await expect(heroForm.locator('a[href="#luan-giai"]')).toBeVisible();

    // Closed time select shows unknown plus all 12 canonical branches
    const timeSelect = heroForm.locator("select");
    await expect(timeSelect).toBeVisible();
    await expect(timeSelect.locator("option")).toHaveCount(13);
    const branchValues = await timeSelect
      .locator("option")
      .evaluateAll((options) => options.map((opt) => (opt as HTMLOptionElement).value));
    expect(branchValues).toEqual([
      "",
      "zi",
      "chou",
      "yin",
      "mao",
      "chen",
      "si",
      "wu",
      "wei",
      "shen",
      "you",
      "xu",
      "hai",
    ]);

    await expect(
      page.getByRole("link", { name: locale.finalCta }),
    ).toHaveAttribute("href", locale.chartPath);
    await expect(page.locator(".lens-active a")).toHaveAttribute(
      "href",
      locale.chartPath,
    );
    await expect(page.locator(".lens-disabled")).toHaveCount(3);
    await expect(page.locator(".lens-disabled a")).toHaveCount(0);
    await expect(page.locator(".planned-tier")).toHaveCount(2);
    await expect(page.locator(".planned-tier a")).toHaveCount(0);
    await expect(page.locator(".planned-tier .topic-price")).toHaveCount(0);

    const availableTier = page.locator(".active-tier");
    await expect(page.locator(".topic-price")).toHaveCount(1);
    await expect(availableTier.locator(".topic-price")).toHaveText(
      locale.code === "vi" ? "79.000 ₫" : "79,000 VND",
    );
    await expect(availableTier.getByRole("link")).toHaveAttribute(
      "href",
      locale.code === "vi"
        ? "/luan-giai-tu-vi/tong-quan-ban-menh"
        : "/en/luan-giai-tu-vi/tong-quan-ban-menh",
    );
  }
});

test("publishes localized metadata and brand assets", async ({ page }) => {
  for (const locale of locales) {
    await visitLocalizedHome(page, locale);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      locale.canonical,
    );
    await expect(page).toHaveTitle(locale.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      locale.description,
    );
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      /manifest\.webmanifest/,
    );
    await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute(
      "href",
      /(?:favicon\.ico|icon\.svg)/,
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      "href",
      /apple-icon\.png/,
    );

    // Header has 26x26 CSS seal and localized brand name, no SVG brand image
    const headerBrand = page.locator("header .brand");
    await expect(headerBrand).toBeVisible();
    await expect(headerBrand.locator(".seal")).toBeVisible();
    await expect(headerBrand).toContainText(locale.brandName);

    // Header anchors resolve to localized homepage anchors
    const navLinks = page.locator("nav.desktop-nav a");
    await expect(navLinks).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await expect(navLinks.nth(i)).toHaveAttribute("href", locale.anchors[i]!);
    }

    // Marquee has two identical groups; second is aria-hidden
    const marqueeGroups = page.locator(".marquee-group");
    await expect(marqueeGroups).toHaveCount(2);
    await expect(marqueeGroups.nth(1)).toHaveAttribute("aria-hidden", "true");

    // Footer retains the SVG brand logo
    const footerBrandLogo = page.locator("footer img.brand-logo");
    await expect(footerBrandLogo).toHaveCount(1);
    await expect(footerBrandLogo).toHaveAttribute(
      "src",
      /lasoviet-logo-ngang-vang-son\.svg/,
    );
    await footerBrandLogo.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        footerBrandLogo.evaluate(
          (image) =>
            image instanceof HTMLImageElement &&
            image.complete &&
            image.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
});

test("loads homepage imagery and uses native menu and FAQ details", async ({
  page,
}) => {
  for (const locale of locales) {
    await page.setViewportSize({ width: 320, height: 720 });
    await visitLocalizedHome(page, locale);

    const images = page.locator("main img");
    expect(await images.count()).toBeGreaterThan(0);
    expect(
      await images.evaluateAll((items) =>
        items.every(
          (image) =>
            image instanceof HTMLImageElement &&
            image.complete &&
            image.naturalWidth > 0,
        ),
      ),
    ).toBe(true);

    const menu = page.locator("details.mobile-menu");
    await expect(menu).toHaveCount(1);
    await menu.locator(`summary[aria-label="${locale.menuLabel}"]`).click();
    await expect(menu).toHaveAttribute("open", "");

    const faq = page.locator('[data-home-block="faq"] details');
    await expect(faq).toHaveCount(4);
    await faq.first().locator("summary").click();
    await expect(faq.first()).toHaveAttribute("open", "");
  }
});

test("uses the exact knowledge routes and exposes no API host", async ({
  page,
}) => {
  await visitLocalizedHome(page, locales[0]);

  const knowledgeLinks = page.locator('[data-home-block="knowledge"] a');
  await expect(knowledgeLinks).toHaveCount(3);
  await expect(knowledgeLinks.nth(0)).toHaveAttribute(
    "href",
    "/kien-thuc/tu-vi/la-so-tu-vi-la-gi",
  );
  await expect(knowledgeLinks.nth(1)).toHaveAttribute(
    "href",
    "/kien-thuc/tu-vi/cach-lap-la-so-tu-vi",
  );
  await expect(knowledgeLinks.nth(2)).toHaveAttribute(
    "href",
    "/kien-thuc/tu-vi/cach-doc-la-so-tu-vi",
  );
  await expect(page.locator("body")).not.toContainText(/https?:\/\/[^/\s]*api/i);
});
