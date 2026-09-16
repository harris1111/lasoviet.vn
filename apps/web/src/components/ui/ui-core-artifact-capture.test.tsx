import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { UiCoreArtifactRenderer } from "./ui-core-artifact-renderer";

const evidenceDirectory = "docs/reports/evidence/lsv-19";
const captureIt = process.env.LSV_UI_CAPTURE === "1" ? it : it.skip;

const documentStyles = `
  :root {
    --font-be-vietnam-pro: Arial, sans-serif;
    --font-source-serif-4: Georgia, serif;
    --font-jetbrains-mono: monospace;
  }
  * { box-sizing: border-box; }
  html { background: var(--lacquer-800); color-scheme: dark; }
  body {
    margin: 0;
    min-width: 320px;
    overflow-x: hidden;
    background: var(--lacquer-800);
    color: var(--pearl-200);
    font-family: var(--font-ui);
  }
  button, input { font: inherit; }
  button { cursor: pointer; }
  .icon {
    width: 1.25rem;
    height: 1.25rem;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.5;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;

describe("UI core artifact capture", () => {
  captureIt("captures 320, 390, and 1440px artifact surfaces without blank, overflow, or obvious overlap", async () => {
    const [tokens, coreStyles] = await Promise.all([
      readFile("apps/web/src/styles/tokens.css", "utf8"),
      readFile("apps/web/src/styles/ui-core.css", "utf8"),
    ]);
    const browser = await chromium.launch();
    const screenshots = [
      { width: 320, name: "ui-core-320.png" },
      { width: 390, name: "ui-core-390.png" },
      { width: 1440, name: "ui-core-1440.png" },
    ];

    await mkdir(evidenceDirectory, { recursive: true });

    try {
      for (const screenshot of screenshots) {
        const page = await browser.newPage({
          viewport: { width: screenshot.width, height: 960 },
          deviceScaleFactor: 1,
        });
        await page.setContent(
          `<!doctype html>
          <html lang="vi">
            <head><style>${tokens}\n${coreStyles}\n${documentStyles}</style></head>
            <body>${renderToStaticMarkup(<UiCoreArtifactRenderer />)}</body>
          </html>`,
        );
        await page.emulateMedia({ reducedMotion: "reduce" });

        const sanity = await page.evaluate(() => {
          const body = document.body;
          const main = document.querySelector<HTMLElement>("main");
          const cards = Array.from(document.querySelectorAll<HTMLElement>(".ui-card"));
          const actions = Array.from(document.querySelectorAll<HTMLElement>(".ui-artifact__actions .ui-button"));
          const firstCard = cards[0]?.getBoundingClientRect();
          const secondCard = cards[1]?.getBoundingClientRect();
          const thirdCard = cards[2]?.getBoundingClientRect();
          const fourthCard = cards[3]?.getBoundingClientRect();
          const firstAction = actions[0]?.getBoundingClientRect();
          const secondAction = actions[1]?.getBoundingClientRect();
          const mobile = window.innerWidth < 768;
          const cardsAreSeparated = mobile
            ? firstCard !== undefined
              && secondCard !== undefined
              && thirdCard !== undefined
              && fourthCard !== undefined
              && firstCard.bottom <= secondCard.top
              && secondCard.bottom <= thirdCard.top
              && thirdCard.bottom <= fourthCard.top
            : firstCard !== undefined
              && secondCard !== undefined
              && thirdCard !== undefined
              && fourthCard !== undefined
              && firstCard.right <= secondCard.left
              && thirdCard.right <= fourthCard.left;
          const actionsAreSeparated = firstAction !== undefined
            && secondAction !== undefined
            && (firstAction.right <= secondAction.left || firstAction.bottom <= secondAction.top);

          return {
            hasContent: main !== null
              && main.getBoundingClientRect().height > 0
              && body.innerText.trim().length > 0,
            hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            cardsAreSeparated,
            controlsMeetMinimum: Array.from(document.querySelectorAll<HTMLElement>(".ui-button, .ui-icon-button"))
              .every((control) => control.getBoundingClientRect().height >= 44),
            actionsAreSeparated,
          };
        });

        expect(sanity.hasContent).toBe(true);
        expect(sanity.hasHorizontalOverflow).toBe(false);
        expect(sanity.cardsAreSeparated).toBe(true);
        expect(sanity.controlsMeetMinimum).toBe(true);
        expect(sanity.actionsAreSeparated).toBe(true);
        await page.screenshot({
          fullPage: true,
          path: resolve(evidenceDirectory, screenshot.name),
        });
        await page.close();
      }
    } finally {
      await browser.close();
    }
  });
});
