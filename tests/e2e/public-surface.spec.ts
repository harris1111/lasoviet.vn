import { expect, test, type Page } from "@playwright/test";

const homeBlocks = [
  "hero",
  "story",
  "explore",
  "needs",
  "comparison",
  "usp",
  "value",
  "faq",
  "about",
];

const locales = [
  {
    code: "vi",
    path: "/",
    acceptLanguage: "vi-VN,vi;q=0.9",
    canonical: "https://lasoviet.net/",
    title: "Lá Số Việt | Lập lá số. Hiểu vận mệnh.",
    description:
      "Lập lá số Tử Vi miễn phí, luận giải có căn cứ rõ ràng — nền tảng khai phóng bản mệnh cho người Việt, nói có sách mách có chứng.",
    cta: "Lập lá số miễn phí",
    finalCta: "Lập lá số của tôi",
    chartPath: "/tao-la-so/tu-vi",
    menuLabel: "Mở điều hướng",
    brandName: "Lá Số Việt",
    anchors: [
      "/#dich-vu",
      "/cong-cu-mien-phi",
      "/kien-thuc",
      "/lien-he",
    ],
    alsoAvailableHrefs: [
      "/bat-tu",
      "/chiem-tinh",
      "/than-so-hoc",
      "/kinh-dich",
    ],
  },
  {
    code: "en",
    path: "/en",
    acceptLanguage: "en-US,en;q=0.9",
    canonical: "https://lasoviet.net/en",
    title: "La So Viet | Build your chart. Understand your path.",
    description:
      "A grounded chart-building and interpretation platform, beginning with Tu Vi for Vietnamese users.",
    cta: "Build your chart for free",
    finalCta: "Create my chart",
    chartPath: "/en/tao-la-so/tu-vi",
    menuLabel: "Open navigation",
    brandName: "La So Viet",
    anchors: [
      "/en#dich-vu",
      "/en/cong-cu-mien-phi",
      "/en/kien-thuc",
      "/en/lien-he",
    ],
    alsoAvailableHrefs: [
      "/en/bat-tu",
      "/en/chiem-tinh",
      "/en/than-so-hoc",
      "/en/kinh-dich",
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
        await page.locator("main > [data-home-block]").evaluateAll((blocks) =>
          blocks.map((block) => block.getAttribute("data-home-block")),
        ),
      ).toEqual(homeBlocks);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);

      if (viewport.name === "desktop-1280x972") {
        // Old homepage blocks are gone
        const removedBlocks = [
          "topic-chips",
          "evidence",
          "capability-matrix",
          "process",
          "knowledge",
          "support",
          "final-cta",
        ];
        for (const block of removedBlocks) {
          await expect(page.locator(`[data-home-block="${block}"]`)).toHaveCount(0);
        }
        await expect(page.locator('[data-home-block="needs"]')).toBeVisible();
      }

      if (viewport.name === "mobile") {
        // Site header is visible
        const header = page.locator(".site-header");
        await expect(header).toBeVisible();

        // Inputs and controls >= 44px
        const inputs = page.locator(".hv3-form input:not([type='checkbox']), .hv3-form select, .hv3-form button");
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

test("uses exact localized routes, validates also-available links, and exercises final CTA return", async ({
  page,
}) => {
  for (const locale of locales) {
    await visitLocalizedHome(page, locale);

    // Hero form presence
    const heroForm = page.locator(".hv3-form");
    await expect(heroForm).toBeVisible();
    await expect(heroForm.getByRole("button", { name: locale.cta })).toBeVisible();

    // Switching to a time range shows the 12 canonical branches
    await heroForm.locator(".hv3-seg").nth(1).locator("button").nth(1).click();
    const timeSelect = heroForm.locator("#hv3-branch");
    await expect(timeSelect).toBeVisible();
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

    // Discipline cards link to the exact localized routes
    const needs = page.locator('[data-home-block="needs"]');
    for (const href of locale.alsoAvailableHrefs) {
      await expect(needs.locator(`a[href="${href}"]`).first()).toBeAttached();
    }

    // Comparison table renders with real table semantics on desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator('[data-home-block="comparison"] table')).toBeVisible();

    // Final CTA scrolls back to the hero form and focuses its first field
    const finalCtaBtn = page.locator('[data-home-block="about"] a.hv3-btn');
    await expect(finalCtaBtn).toHaveText(locale.finalCta);
    await finalCtaBtn.click();
    await expect(page.locator("#hv3-day")).toBeFocused();
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
    // Exact expected localized metadata description from fixture
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

    // Header renders official brand logo and localized accessible name
    const headerBrand = page.locator("header .brand");
    await expect(headerBrand).toBeVisible();
    await expect(headerBrand.locator("img.brand-logo")).toBeVisible();
    await expect(headerBrand.locator("img.brand-logo")).toHaveAttribute(
      "src",
      /lasoviet-logo-ngang-vang-son\.svg/,
    );
    await expect(headerBrand).toContainText(locale.brandName);

    // Header anchors resolve to localized homepage anchors
    const navLinks = page.locator("nav.desktop-nav a");
    await expect(navLinks).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await expect(navLinks.nth(i)).toHaveAttribute("href", locale.anchors[i]!);
    }

    // Footer retains the SVG brand logo and is visible
    const footerBrandLogo = page.locator("footer img.brand-logo");
    await expect(footerBrandLogo).toHaveCount(1);
    await expect(footerBrandLogo).toHaveAttribute(
      "src",
      /lasoviet-logo-ngang-vang-son\.svg/,
    );
    await footerBrandLogo.scrollIntoViewIfNeeded();
    await expect(footerBrandLogo).toBeVisible();
  }
});

test("loads visible homepage imagery completely and uses native menu and FAQ accordion", async ({
  page,
}) => {
  for (const locale of locales) {
    await page.setViewportSize({ width: 320, height: 720 });
    await visitLocalizedHome(page, locale);

    // Lazy images load on scroll, so walk down the page first.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
    });

    const images = page.locator("main img");
    expect(await images.count()).toBeGreaterThan(0);
    // Every rendered (not display:none) image is fully loaded with naturalWidth > 0
    await expect
      .poll(async () => {
        return await images.evaluateAll((items) =>
          items
            .filter((img) => img.getClientRects().length > 0)
            .every(
              (img) =>
                img instanceof HTMLImageElement &&
                img.complete &&
                img.naturalWidth > 0,
            ),
        );
      })
      .toBe(true);

    await page.evaluate(() => window.scrollTo(0, 0));
    const menu = page.locator("details.mobile-menu");
    await expect(menu).toHaveCount(1);
    await menu.locator(`summary[aria-label="${locale.menuLabel}"]`).click();
    await expect(menu).toHaveAttribute("open", "");

    // 5 FAQ items with only the first expanded
    const faqButtons = page.locator('[data-home-block="faq"] button[aria-expanded]');
    await expect(faqButtons).toHaveCount(5);
    await expect(faqButtons.first()).toHaveAttribute("aria-expanded", "true");
    await expect(faqButtons.nth(1)).toHaveAttribute("aria-expanded", "false");
    await faqButtons.nth(1).click();
    await expect(faqButtons.nth(1)).toHaveAttribute("aria-expanded", "true");
  }
});

test("links the privacy policy from the FAQ and exposes no API host", async ({
  page,
}) => {
  await visitLocalizedHome(page, locales[0]);

  const faqButtons = page.locator('[data-home-block="faq"] button[aria-expanded]');
  await faqButtons.nth(4).click();
  await expect(
    page.locator('[data-home-block="faq"] a[href="/chinh-sach-bao-mat"]'),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/https?:\/\/[^/\s]*api/i);
});

test("header theme toggle switches header, footer and page together and persists", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await visitLocalizedHome(page, locales[0]);

  const toggle = page.locator("header .theme-toggle");
  await expect(toggle).toBeVisible();
  const headerBg = () =>
    page
      .locator("header.site-header")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
  const darkBg = await headerBg();

  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".hv3")).toHaveCSS("background-color", "rgb(246, 240, 228)");
  expect(await headerBg()).not.toBe(darkBg);
  await expect(page.locator("footer.site-footer")).toHaveCSS("background-color", "rgb(239, 231, 215)");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("header .theme-toggle")).toHaveAttribute("aria-label", /tối/);

  // A page that is not light-ready keeps the dark chrome and hides the toggle.
  await page.goto("/lien-he");
  await expect(page.locator("header.site-header")).toHaveCSS("background-color", darkBg);
  await expect(page.locator("header .theme-toggle")).toBeHidden();
});
