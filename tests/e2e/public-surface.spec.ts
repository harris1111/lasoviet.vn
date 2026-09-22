import { expect, test, type Page } from "@playwright/test";

const homeBlocks = [
  "hero",
  "topic-chips",
  "comparison",
  "evidence",
  "capability-matrix",
  "process",
  "knowledge",
  "faq",
  "support",
  "final-cta",
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
    finalCta: "Xem lá số miễn phí",
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
    finalCta: "Build your chart for free",
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
        // Assert removed old sections are absent
        const removedBlocks = [
          "trust-strip",
          "problem",
          "lenses",
          "chatbot-comparison",
          "category-comparison",
          "about-method",
          "free-value",
          "value-ladder",
          "trust-specs",
          "about-excerpt",
        ];
        for (const block of removedBlocks) {
          await expect(page.locator(`[data-home-block="${block}"]`)).toHaveCount(0);
        }
        // Topic chips block is visible
        const topicChips = page.locator('[data-home-block="topic-chips"]');
        await expect(topicChips).toBeVisible();
      }

      if (viewport.name === "mobile") {
        // Site header is visible
        const header = page.locator(".site-header");
        await expect(header).toBeVisible();

        // Inputs and controls >= 44px
        const inputs = page.locator("#hero-form input:not([tabindex='-1']):not([type='checkbox']), .wizard-unknown-time, #hero-form select, #hero-form button");
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
    const heroForm = page.locator("#hero-form");
    await expect(heroForm).toBeVisible();
    await expect(heroForm.getByRole("button", { name: locale.cta })).toBeVisible();
    await expect(
      heroForm.locator(`a[href="${locale.code === "vi" ? "/bao-cao-mau/tu-vi" : "/en/bao-cao-mau/tu-vi"}"]`),
    ).toBeVisible();

    // Closed time select shows unknown plus all 12 canonical branches
    const timeSelect = heroForm.locator('select[name="birthBranch"]');
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

    // Topic chips contains also-have links with exact localized hrefs
    const alsoHaveRow = page.locator(".also-have-row");
    await expect(alsoHaveRow).toBeVisible();
    const alsoHaveLinks = alsoHaveRow.locator("a");
    await expect(alsoHaveLinks).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await expect(alsoHaveLinks.nth(i)).toHaveAttribute("href", locale.alsoAvailableHrefs[i]!);
    }

    // Capability matrix is present without prices (neither VND nor Lá)
    const capability = page.locator('[data-home-block="capability-matrix"]');
    await expect(capability).toBeVisible();
    await expect(capability).not.toContainText(/₫|đ(?!\p{L})|VND|(?:Lá|La)(?!\p{L})/u);

    // Final CTA button is present and clicking it focuses the single #hero-form
    const finalCta = page.locator('[data-home-block="final-cta"]');
    await expect(finalCta).toBeVisible();
    const finalCtaBtn = finalCta.locator("button.button-pill");
    await expect(finalCtaBtn).toBeVisible();
    await finalCtaBtn.click();

    // Verify first focusable input/select in #hero-form is focused
    const firstHeroField = heroForm.locator("select, input").first();
    await expect(firstHeroField).toBeFocused();
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

test("loads homepage imagery completely and uses native menu and FAQ details", async ({
  page,
}) => {
  for (const locale of locales) {
    await page.setViewportSize({ width: 320, height: 720 });
    await visitLocalizedHome(page, locale);

    const images = page.locator("main img");
    expect(await images.count()).toBeGreaterThan(0);
    // Assert every image is fully loaded with naturalWidth > 0
    await expect
      .poll(async () => {
        return await images.evaluateAll((items) =>
          items.every(
            (img) =>
              img instanceof HTMLImageElement &&
              img.complete &&
              img.naturalWidth > 0,
          ),
        );
      })
      .toBe(true);

    const menu = page.locator("details.mobile-menu");
    await expect(menu).toHaveCount(1);
    await menu.locator(`summary[aria-label="${locale.menuLabel}"]`).click();
    await expect(menu).toHaveAttribute("open", "");

    // 8 FAQ items with first open
    const faq = page.locator('[data-home-block="faq"] details');
    await expect(faq).toHaveCount(8);
    await expect(faq.first()).toHaveAttribute("open", "");
  }
});

test("uses the exact knowledge routes and exposes no API host", async ({
  page,
}) => {
  await visitLocalizedHome(page, locales[0]);

  const knowledgeLinks = page.locator('[data-home-block="knowledge"] a');
  // 1 featured + 4 list items = 5 links
  await expect(knowledgeLinks).toHaveCount(5);
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
  await expect(knowledgeLinks.nth(3)).toHaveAttribute(
    "href",
    "/phuong-phap/ai-va-can-cu",
  );
  await expect(knowledgeLinks.nth(4)).toHaveAttribute(
    "href",
    "/kien-thuc",
  );
  await expect(page.locator("body")).not.toContainText(/https?:\/\/[^/\s]*api/i);
});
