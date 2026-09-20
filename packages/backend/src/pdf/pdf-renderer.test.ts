import { describe, expect, it, vi } from "vitest";

import { createPdfRenderer } from "./pdf-renderer.js";

const fonts = [
  { family: "Be Vietnam Pro" as const, weight: 400 as const, unicodeRange: "U+0000-00FF", source: new Uint8Array([1]) },
  { family: "Be Vietnam Pro" as const, weight: 400 as const, unicodeRange: "U+0100-02BA", source: new Uint8Array([1]) },
  { family: "Be Vietnam Pro" as const, weight: 400 as const, unicodeRange: "U+1EA0-1EF9", source: new Uint8Array([1]) },
  { family: "Be Vietnam Pro" as const, weight: 600 as const, unicodeRange: "U+0000-00FF", source: new Uint8Array([1]) },
  { family: "Be Vietnam Pro" as const, weight: 600 as const, unicodeRange: "U+0100-02BA", source: new Uint8Array([1]) },
  { family: "Be Vietnam Pro" as const, weight: 600 as const, unicodeRange: "U+1EA0-1EF9", source: new Uint8Array([1]) },
];

function launcher() {
  const evaluate = vi.fn().mockResolvedValue(true);
  const setContent = vi.fn().mockResolvedValue(undefined);
  const pdf = vi.fn().mockResolvedValue(new TextEncoder().encode("%PDF-1.7\n"));
  const close = vi.fn().mockResolvedValue(undefined);
  return {
    launcher: {
      launch: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({ setContent, evaluate, pdf }),
        close,
      }),
    },
    evaluate,
    setContent,
    pdf,
    close,
  };
}

describe("createPdfRenderer", () => {
  it("rejects an unsupported render version before Chromium launch", async () => {
    const fake = launcher();
    const renderer = createPdfRenderer({
      launcher: fake.launcher,
      executablePath: "/usr/bin/chromium",
      fonts,
    });

    await expect(renderer.render("<p>report</p>", "other.v1")).resolves.toEqual({
      ok: false,
      code: "PDF_RENDER_VERSION_UNSUPPORTED",
    });
    expect(fake.launcher.launch).not.toHaveBeenCalled();
  });

  it("waits for fonts and produces a PDF for each exact render method", async () => {
    const fake = launcher();
    const removeTemporaryDirectory = vi.fn().mockResolvedValue(undefined);
    const renderer = createPdfRenderer({
      launcher: fake.launcher,
      executablePath: "/usr/bin/chromium",
      fonts,
      removeTemporaryDirectory,
    });

    await expect(renderer.renderIdentityReportPdfV1("<h1>V1</h1>")).resolves.toMatchObject({
      ok: true,
      bytes: expect.any(Uint8Array),
    });
    await expect(renderer.renderIdentityReportPdfV2("<h1>V2</h1>")).resolves.toMatchObject({
      ok: true,
      bytes: expect.any(Uint8Array),
    });
    expect(fake.evaluate).toHaveBeenCalledTimes(2);
    expect(fake.setContent).toHaveBeenCalledTimes(2);
    expect(fake.pdf).toHaveBeenCalledTimes(2);
    expect(fake.close).toHaveBeenCalledTimes(2);
    expect(removeTemporaryDirectory).toHaveBeenCalledTimes(2);
  });

  it("returns cleanup failure and never exposes a rendered PDF", async () => {
    const fake = launcher();
    const renderer = createPdfRenderer({
      launcher: fake.launcher,
      executablePath: "/usr/bin/chromium",
      fonts,
      removeTemporaryDirectory: async () => {
        throw new Error("cleanup failed");
      },
    });

    await expect(renderer.renderIdentityReportPdfV1("<p>report</p>")).resolves.toEqual({
      ok: false,
      code: "PDF_TEMP_CLEANUP_FAILED",
    });
  });
});
