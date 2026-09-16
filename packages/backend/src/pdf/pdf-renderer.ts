import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { ReportPdfRenderVersion } from "@lasoviet/contracts";

import {
  createReportPrintHtml,
  type PdfFontAsset,
} from "./report-print-template.js";

export type PdfRenderFailureCode =
  | "PDF_RENDER_FAILED"
  | "PDF_TEMP_CLEANUP_FAILED"
  | "PDF_FONT_MISSING"
  | "PDF_RENDER_VERSION_UNSUPPORTED";

export type PdfRenderResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; code: PdfRenderFailureCode };

export type ChromiumPage = {
  setContent(html: string, options?: { waitUntil?: "load" }): Promise<void>;
  evaluate<T>(fn: () => T | Promise<T>): Promise<T>;
  pdf(options: {
    path: string;
    printBackground: boolean;
    preferCSSPageSize: boolean;
  }): Promise<Uint8Array>;
};

export type ChromiumBrowser = {
  newPage(): Promise<ChromiumPage>;
  close(): Promise<void>;
};

export type ChromiumLauncher = {
  launch(options: { executablePath: string }): Promise<ChromiumBrowser>;
};

const FONT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "assets", "fonts");
const VIETNAMESE_RANGE = "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB";
const LATIN_EXT_RANGE = "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";
const LATIN_RANGE = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";

const fontFiles: readonly [400 | 600, string, string][] = [
  [400, "be-vietnam-pro-v12-vietnamese-400.woff2", VIETNAMESE_RANGE],
  [400, "be-vietnam-pro-v12-latin-ext-400.woff2", LATIN_EXT_RANGE],
  [400, "be-vietnam-pro-v12-latin-400.woff2", LATIN_RANGE],
  [600, "be-vietnam-pro-v12-vietnamese-600.woff2", VIETNAMESE_RANGE],
  [600, "be-vietnam-pro-v12-latin-ext-600.woff2", LATIN_EXT_RANGE],
  [600, "be-vietnam-pro-v12-latin-600.woff2", LATIN_RANGE],
];

export async function loadBundledPdfFonts(fontRoot = FONT_ROOT): Promise<PdfFontAsset[]> {
  try {
    return await Promise.all(fontFiles.map(async ([weight, file, unicodeRange]) => ({
      family: "Be Vietnam Pro" as const,
      weight,
      unicodeRange,
      source: await readFile(join(fontRoot, file)),
    })));
  } catch {
    throw new Error("PDF_FONT_MISSING");
  }
}

async function defaultLauncher(): Promise<ChromiumLauncher> {
  const playwright = await import("playwright-core");
  return playwright.chromium;
}

function supported(version: string): version is ReportPdfRenderVersion {
  return version === "identity-report-pdf.v1" || version === "identity-report-pdf.v2";
}

export function createPdfRenderer(options: {
  launcher?: ChromiumLauncher;
  executablePath?: string;
  fonts?: readonly PdfFontAsset[];
  tempRoot?: string;
  removeTemporaryDirectory?: (path: string) => Promise<void>;
} = {}) {
  const removeTemporaryDirectory =
    options.removeTemporaryDirectory ??
    ((path: string) => rm(path, { recursive: true, force: true }));

  async function renderVersion(
    immutableHtml: string,
    renderVersion: ReportPdfRenderVersion,
  ): Promise<PdfRenderResult> {
    if (!options.executablePath && !process.env.CHROMIUM_EXECUTABLE_PATH) {
      return { ok: false, code: "PDF_RENDER_FAILED" };
    }

    let temporaryDirectory: string | undefined;
    let result: PdfRenderResult;
    try {
      const fonts = options.fonts ?? await loadBundledPdfFonts();
      if (fonts.length !== fontFiles.length) return { ok: false, code: "PDF_FONT_MISSING" };
      temporaryDirectory = await mkdtemp(join(options.tempRoot ?? tmpdir(), "lasoviet-pdf-"));
      const outputPath = join(temporaryDirectory, `${randomUUID()}.pdf`);
      const launcher = options.launcher ?? await defaultLauncher();
      const browser = await launcher.launch({
        executablePath: options.executablePath ?? process.env.CHROMIUM_EXECUTABLE_PATH!,
      });
      try {
        const page = await browser.newPage();
        await page.setContent(createReportPrintHtml(immutableHtml, fonts), { waitUntil: "load" });
        const ready = await page.evaluate(async () => {
          const browserDocument = (
            globalThis as unknown as {
              document: {
                fonts: {
                  ready: Promise<unknown>;
                  check(font: string): boolean;
                };
              };
            }
          ).document;
          await browserDocument.fonts.ready;
          return browserDocument.fonts.check('400 12px "Be Vietnam Pro"') &&
            browserDocument.fonts.check('600 12px "Be Vietnam Pro"');
        });
        if (!ready) return { ok: false, code: "PDF_FONT_MISSING" };
        const bytes = await page.pdf({
          path: outputPath,
          printBackground: true,
          preferCSSPageSize: true,
        });
        if (
          bytes.byteLength < 5 ||
          new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-"
        ) {
          return { ok: false, code: "PDF_RENDER_FAILED" };
        }
        result = { ok: true, bytes };
      } finally {
        await browser.close();
      }
    } catch (error) {
      return {
        ok: false,
        code: error instanceof Error && error.message === "PDF_FONT_MISSING"
          ? "PDF_FONT_MISSING"
          : "PDF_RENDER_FAILED",
      };
    } finally {
      if (temporaryDirectory !== undefined) {
        try {
          await removeTemporaryDirectory(temporaryDirectory);
        } catch {
          return { ok: false, code: "PDF_TEMP_CLEANUP_FAILED" };
        }
      }
    }
    return result!;
  }

  async function renderPdfV1(html: string) {
    return renderVersion(html, "identity-report-pdf.v1");
  }

  async function renderPdfV2(html: string) {
    return renderVersion(html, "identity-report-pdf.v2");
  }

  return {
    renderIdentityReportPdfV1: renderPdfV1,
    renderIdentityReportPdfV2: renderPdfV2,
    render(html: string, renderVersion: string) {
      if (!supported(renderVersion)) {
        return Promise.resolve({
          ok: false as const,
          code: "PDF_RENDER_VERSION_UNSUPPORTED" as const,
        });
      }
      return renderVersion === "identity-report-pdf.v1"
        ? renderPdfV1(html)
        : renderPdfV2(html);
    },
  };
}
