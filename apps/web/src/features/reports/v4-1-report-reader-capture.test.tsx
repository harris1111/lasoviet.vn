import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next-intl", async () => {
  const viMessages = (await import("../../../messages/vi/reports.json")).default;
  return {
    useTranslations: () => {
      return (key: string, values?: Record<string, unknown>) => {
        let value: unknown = viMessages;
        for (const segment of key.split(".")) {
          value = (value as Record<string, unknown>)?.[segment];
        }
        if (typeof value !== "string") return key;
        return values
          ? Object.entries(values).reduce(
            (text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)),
            value,
          )
          : value;
      };
    },
  };
});

import type { ReportComprehensiveV3ReadyViewV1 } from "@lasoviet/contracts";
import { ReportReader } from "./report-reader";

const evidenceDirectory = "docs/reports/evidence/lsv-36";
const frontispiecePath = "/images/lasoviet/frontispiece-bao-cao-luan-giai-tu-vi.webp";
const captureIt = process.env.LSV_V4_1_READER_CAPTURE === "1" ? it : it.skip;

const palaceIds = [
  "life", "siblings", "spouse", "children", "wealth", "health",
  "travel", "friends", "career", "property", "fortune", "parents",
] as const;

const readerReport = {
  version: 1,
  state: "ready",
  contentVersion: "ziwei-comprehensive.v3",
  reportId: "capture-v4-1-reader",
  reportVersionId: "capture-v4-1-reader-version",
  locale: "vi",
  sku: "ZIWEI-IDENTITY-P0",
  fulfillmentStatus: "complete",
  lineage: { supersedesReportVersionId: null },
  content: {
    overview: { title: "Tổng quan", narrative: "Nội dung tổng quan của báo cáo." },
    coreAxis: { title: "Trục Mệnh Thân", narrative: "Nội dung trục Mệnh Thân." },
    keyConfigurations: [{ title: "Cách cục trọng yếu", narrative: "Nội dung cách cục." }],
    palaceReadings: palaceIds.map((palaceId) => ({
      palaceId: `ziwei.palace.${palaceId}`,
      title: `Cung ${palaceId}`,
      narrative: `Nội dung cung ${palaceId}.`,
    })),
    thematicSynthesis: [
      "career_wealth", "relationships_family", "social_environment", "wellbeing_inner_resources",
    ].map((id) => ({
      id,
      title: `Chủ đề ${id}`,
      narrative: `Nội dung chủ đề ${id}.`,
    })),
    strengthsAndTensions: { title: "Điểm mạnh", narrative: "Nội dung điểm mạnh." },
    currentDecadal: {
      title: "Đại vận hiện tại",
      state: "active",
      index: 2,
      ageRange: [21, 30],
      yearRange: [2021, 2030],
      narrative: "Nội dung đại vận.",
    },
    annualSnapshot: {
      title: "Lưu niên",
      targetYear: 2026,
      asOfDate: "2026-09-16",
      narrative: "Nội dung lưu niên.",
    },
    birthTimeSensitivity: {
      title: "Độ nhạy giờ sinh",
      stableFactors: {
        title: "Yếu tố ổn định",
        narrative: "Những điểm ổn định vẫn giữ nguyên khi đối chiếu các khả năng lân cận.",
      },
      sensitiveFactors: {
        title: "Yếu tố cần thận trọng",
        narrative: "Một số chi tiết cần được đọc thận trọng khi độ chính xác của giờ sinh thay đổi.",
      },
    },
    practicalDirection: [
      { recommendation: "Khuyến nghị một", rationale: "Lý do một", avoid: "Điều cần tránh một" },
      { recommendation: "Khuyến nghị hai", rationale: "Lý do hai", avoid: "Điều cần tránh hai" },
      { recommendation: "Khuyến nghị ba", rationale: "Lý do ba", avoid: "Điều cần tránh ba" },
    ],
  },
} as unknown as ReportComprehensiveV3ReadyViewV1;

describe("V4.1 report reader capture", () => {
  captureIt("captures 320, 390, and 1440px reader surfaces without blank output, overflow, or overlap", async () => {
    const [tokens, uiCoreStyles, globalStyles, frontispiece] = await Promise.all([
      readFile("apps/web/src/styles/tokens.css", "utf8"),
      readFile("apps/web/src/styles/ui-core.css", "utf8"),
      readFile("apps/web/src/styles/global.css", "utf8"),
      readFile(`apps/web/public${frontispiecePath}`),
    ]);
    const html = `<!doctype html>
      <html lang="vi">
        <head><style>${tokens}\n${uiCoreStyles}\n${globalStyles}</style></head>
        <body>${renderToStaticMarkup(<ReportReader locale="vi" report={readerReport} />)}</body>
      </html>`;
    const fixture = createServer((request, response) => {
      if (request.url === frontispiecePath) {
        response.writeHead(200, {
          "cache-control": "no-store",
          "content-type": "image/webp",
          "content-length": frontispiece.length,
        });
        response.end(frontispiece);
        return;
      }

      if (request.url === "/" || request.url === "/index.html") {
        response.writeHead(200, {
          "cache-control": "no-store",
          "content-type": "text/html; charset=utf-8",
        });
        response.end(html);
        return;
      }

      response.writeHead(404);
      response.end();
    });
    await new Promise<void>((accept, reject) => {
      fixture.once("error", reject);
      fixture.listen(0, "127.0.0.1", () => accept());
    });
    const address = fixture.address();
    if (address === null || typeof address === "string") {
      await new Promise<void>((accept, reject) => fixture.close((error) => error ? reject(error) : accept()));
      throw new Error("V4.1 reader capture fixture did not bind a TCP port.");
    }
    const fixtureOrigin = `http://127.0.0.1:${address.port}`;
    const browser = await chromium.launch();
    const screenshots = [320, 390, 1440];

    await mkdir(evidenceDirectory, { recursive: true });

    try {
      for (const width of screenshots) {
        const page = await browser.newPage({
          viewport: { width, height: 960 },
          deviceScaleFactor: 1,
        });
        await page.goto(fixtureOrigin, { waitUntil: "networkidle" });
        await page.emulateMedia({ reducedMotion: "reduce" });

        const sanity = await page.evaluate(() => {
          const documentElement = document.documentElement;
          const main = document.querySelector<HTMLElement>("#main");
          const sensitivity = document.querySelectorAll<HTMLElement>(
            "#section-birth-time-sensitivity",
          );
          const factors = Array.from(document.querySelectorAll<HTMLElement>(
            ".report-sensitivity-factor",
          ));
          const firstFactor = factors[0]?.getBoundingClientRect();
          const secondFactor = factors[1]?.getBoundingClientRect();
          const visibleImages = Array.from(document.images)
            .filter((image) => {
              const rect = image.getBoundingClientRect();
              const style = window.getComputedStyle(image);
              return rect.width > 0
                && rect.height > 0
                && style.display !== "none"
                && style.visibility !== "hidden";
            })
            .map((image) => {
              const source = new URL(image.currentSrc || image.src, window.location.href);
              return {
                complete: image.complete,
                naturalWidth: image.naturalWidth,
                fixtureOrigin: source.origin === window.location.origin,
              };
            });

          return {
            hasContent: main !== null
              && main.getBoundingClientRect().height > 0
              && document.body.innerText.trim().length > 0,
            hasHorizontalOverflow: documentElement.scrollWidth > documentElement.clientWidth,
            sensitivitySectionCount: sensitivity.length,
            factorsSeparated: firstFactor !== undefined
              && secondFactor !== undefined
              && (firstFactor.right <= secondFactor.left || firstFactor.bottom <= secondFactor.top),
            visibleImages,
          };
        });

        expect(sanity.hasContent).toBe(true);
        expect(sanity.hasHorizontalOverflow).toBe(false);
        expect(sanity.sensitivitySectionCount).toBe(1);
        expect(sanity.factorsSeparated).toBe(true);
        expect(sanity.visibleImages.length).toBeGreaterThan(0);
        expect(sanity.visibleImages).toEqual(expect.arrayContaining([
          expect.objectContaining({
            complete: true,
            naturalWidth: expect.any(Number),
            fixtureOrigin: true,
          }),
        ]));
        expect(sanity.visibleImages.every((image) => (
          image.complete && image.naturalWidth > 0 && image.fixtureOrigin
        ))).toBe(true);
        await page.screenshot({
          fullPage: true,
          path: resolve(evidenceDirectory, `v4-1-reader-${width}.png`),
        });
        await page.close();
      }
    } finally {
      await browser.close();
      await new Promise<void>((accept, reject) => fixture.close((error) => error ? reject(error) : accept()));
    }
  });
});
