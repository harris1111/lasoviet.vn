import { readFile } from "node:fs/promises";

import { chromium } from "@playwright/test";
import { expect, it } from "vitest";

// Same opt-in pattern as repository browser-capture tests. A custom executable
// is optional; without it Playwright uses its installed matching Chromium.
const browserIt = process.env.TROI_NAM_CSS_BROWSER === "1" ? it : it.skip;

browserIt("hands visible world pixels to the interactive chart and restores static fallback", async () => {
  const styles = await Promise.all([
    "tokens.css", "homepage-v3.css", "troi-nam.css", "troi-nam-reduced-motion-guards.css",
  ].map((name) => readFile(`apps/web/src/styles/${name}`, "utf8")));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH });
  try {
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html><head><style>${styles.join("\n")}</style></head><body>
      <div id="preview" class="tn">
        <div class="tn-world-backdrop"><canvas id="canvas" class="tn-world-canvas"></canvas></div>
        <div id="explore" class="hv3 tn-explore">
          <img id="texture" class="tn-explore-texture" alt="">
          <div class="hv3-chart-wrap"><div id="chart" class="hv3-chart"><button>Palace</button></div></div>
        </div>
      </div>
      <div data-troi-nam-world-ready style="--tn-world-opacity: 0">
        <canvas id="unrelated-canvas" class="tn-world-canvas"></canvas>
        <div class="hv3"><div id="unrelated-chart" class="hv3-chart"></div></div>
      </div>
    </body></html>`);
    const read = () => page.evaluate(() => {
      const style = (id: string) => getComputedStyle(document.getElementById(id)!);
      return {
        canvas: Number(style("canvas").opacity), chart: Number(style("chart").opacity),
        texture: Number(style("texture").opacity), pointerEvents: style("canvas").pointerEvents,
        background: style("explore").backgroundColor,
        unrelatedCanvas: Number(style("unrelated-canvas").opacity),
        unrelatedChart: Number(style("unrelated-chart").opacity),
      };
    });
    const initial = await read();
    expect(initial).toMatchObject({ canvas: 0, chart: 1, texture: 0.14, pointerEvents: "none", unrelatedCanvas: 1, unrelatedChart: 1 });
    expect(initial.background).not.toBe("rgba(0, 0, 0, 0)");
    for (const opacity of [1, 0.5, 0]) {
      await page.evaluate((value) => {
        const root = document.getElementById("preview")!;
        root.setAttribute("data-troi-nam-world-ready", "");
        root.style.setProperty("--tn-world-opacity", String(value));
      }, opacity);
      const current = await read();
      expect(current.canvas).toBe(opacity);
      expect(current.chart).toBe(1 - opacity);
      expect(current.texture).toBeCloseTo(0.14 * (1 - opacity));
      expect(current.background).toBe("rgba(0, 0, 0, 0)");
      expect(current.pointerEvents).toBe("none");
    }
    await page.evaluate(() => document.getElementById("preview")!.style.setProperty("--tn-world-opacity", "1"));
    await page.locator("#chart button").focus();
    expect((await read()).chart).toBe(1);
    await page.locator("#chart button").evaluate((button) => (button as HTMLButtonElement).blur());
    await page.evaluate(() => document.getElementById("preview")!.removeAttribute("data-troi-nam-world-ready"));
    expect(await read()).toEqual(initial);
  } finally { await browser.close(); }
}, 20_000);
