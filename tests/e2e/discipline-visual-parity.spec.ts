import { expect, test, type Page, type TestInfo } from "@playwright/test";

type DisciplineRouteCase = {
  path: string;
  category: "discipline" | "free-tools-hub" | "utility-preview" | "gated-preview";
  heading: string;
};

const ROUTES: readonly DisciplineRouteCase[] = [
  {
    path: "/bat-tu",
    category: "discipline",
    heading: "Bát Tự / Tứ Trụ",
  },
  {
    path: "/kinh-dich",
    category: "discipline",
    heading: "Kinh Dịch / Chu Dịch",
  },
  {
    path: "/chiem-tinh",
    category: "discipline",
    heading: "Bản đồ sao / Chiêm tinh Tây phương",
  },
  {
    path: "/than-so-hoc",
    category: "discipline",
    heading: "Thần Số Học",
  },
  {
    path: "/cong-cu-mien-phi",
    category: "free-tools-hub",
    heading: "Công cụ miễn phí",
  },
  {
    path: "/ngay-tot",
    category: "utility-preview",
    heading: "Xem Ngày Tốt",
  },
  {
    path: "/12-con-giap",
    category: "utility-preview",
    heading: "12 Con Giáp",
  },
  {
    path: "/giai-ma-giac-mo",
    category: "utility-preview",
    heading: "Giải Mã Giấc Mơ",
  },
  {
    path: "/boi-bai",
    category: "utility-preview",
    heading: "Tarot / Bói Bài",
  },
  {
    path: "/lich-am",
    category: "utility-preview",
    heading: "Lịch Âm",
  },
  {
    path: "/phong-thuy/huong-nha",
    category: "gated-preview",
    heading: "Phong Thủy Hướng Nhà",
  },
  {
    path: "/xem-chi-tay",
    category: "gated-preview",
    heading: "Xem Chỉ Tay",
  },
] as const;

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 320, height: 720 },
] as const;

async function visitVietnameseRoute(page: Page, path: string) {
  const baseURL = test.info().project.use.baseURL;
  if (typeof baseURL !== "string" || baseURL.length === 0) {
    throw new Error("PLAYWRIGHT_BASE_URL is required");
  }
  const base = new URL(baseURL);
  const target = new URL(path, base);

  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: "vi",
      url: new URL("/", base).toString(),
    },
  ]);

  await page.setExtraHTTPHeaders({
    "Accept-Language": "vi-VN,vi;q=0.9",
  });

  await page.emulateMedia({ reducedMotion: "reduce" });

  const response = await page.goto(target.toString());
  expect(response, `No response received for ${path}`).not.toBeNull();
  expect(response!.ok(), `HTTP response not OK (${response!.status()}) for ${path}`).toBe(true);
}

for (const route of ROUTES) {
  for (const viewport of VIEWPORTS) {
    test(`${route.path} visual parity smoke at ${viewport.name} (${viewport.width}x${viewport.height})`, async (
      { page },
      testInfo: TestInfo,
    ) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await visitVietnameseRoute(page, route.path);

      const mainContent = page.locator("main");
      await expect(mainContent).toBeVisible();

      const heading = page.locator("h1").first();
      await expect(heading).toBeVisible();
      await expect(heading).toContainText(route.heading);

      const fontCheck = await page.evaluate(async () => {
        await document.fonts.ready;
        const bodyFontFamily = window.getComputedStyle(document.body).fontFamily;
        const headingElement = document.querySelector("h1");
        const headingFontFamily = headingElement
          ? window.getComputedStyle(headingElement).fontFamily
          : "";
        return {
          hasBodyFont: bodyFontFamily.trim().length > 0,
          hasHeadingFont: headingFontFamily.trim().length > 0,
        };
      });
      expect(fontCheck.hasBodyFont).toBe(true);
      expect(fontCheck.hasHeadingFont).toBe(true);

      const horizontalFit = await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      );
      expect(horizontalFit).toBe(true);

      if (route.category === "discipline") {
        const badge = page.locator(".discipline-disclosure-badge");
        await expect(badge).toBeVisible();
        await expect(badge).toContainText(/minh hoạ|minh họa/i);
      }

      if (route.category === "free-tools-hub") {
        const toolGrid = page.locator('[data-screen-label="02-luoi-cong-cu"]');
        await expect(toolGrid).toBeVisible();
        await expect(toolGrid.locator(".tool-card")).toHaveCount(7);
      }

      if (route.category === "utility-preview") {
        const bodyText = await page.locator("main").innerText();
        const containsDisclosure =
          bodyText.includes("minh hoạ") ||
          bodyText.includes("minh họa") ||
          bodyText.includes("mẫu") ||
          bodyText.includes("thử nghiệm") ||
          bodyText.includes("dữ kiện lịch pháp, không phải") ||
          (bodyText.includes("tham khảo văn hoá") && bodyText.includes("không phải dự đoán"));
        expect(containsDisclosure).toBe(true);
      }

      if (route.category === "gated-preview") {
        const waitingNotice = page.locator("main p").first();
        await expect(waitingNotice).toBeVisible();
        const mainText = await page.locator("main").innerText();
        const containsGatedNotice =
          mainText.includes("Đang chờ chốt phương pháp") ||
          mainText.includes("Pilot đang chuẩn bị") ||
          mainText.includes("chưa mở");
        expect(containsGatedNotice).toBe(true);

        const uploadAction = page.locator('input[type="file"]:not([disabled])');
        await expect(uploadAction).toHaveCount(0);

        const activeCamera = page.locator('video, button:has-text("Chụp ảnh"):not([disabled])');
        await expect(activeCamera).toHaveCount(0);

        const computeAction = page.locator(
          'button:has-text("Tính toán"):not([disabled]), button:has-text("Tra cứu"):not([disabled])',
        );
        await expect(computeAction).toHaveCount(0);
      }

      if (viewport.name === "mobile") {
        const visibleSummary = page.locator("details summary:visible").first();
        if ((await visibleSummary.count()) > 0) {
          await visibleSummary.click();
          const parentDetails = visibleSummary.locator("..");
          await expect(parentDetails).toHaveAttribute("open", "");
        } else {
          const interactiveToggle = page
            .locator(
              'details summary, button[aria-expanded], button:has-text("Vì sao có nhận định này?"), section[data-screen-label*="faq"] button',
            )
            .first();
          if ((await interactiveToggle.count()) > 0 && (await interactiveToggle.isVisible())) {
            await interactiveToggle.click();
          }
        }
      }

      const fileSafePath = route.path.replace(/\//g, "-").replace(/^-/, "");
      await page.screenshot({
        fullPage: true,
        path: testInfo.outputPath(
          `discipline-smoke-${fileSafePath}-${viewport.name}.png`,
        ),
      });
    });
  }
}