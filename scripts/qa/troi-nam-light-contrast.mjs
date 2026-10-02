import sharp from 'sharp';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const luminance = rgb => rgb.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
const ratio = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };

/** Sample the background at rendered glyph positions, with only glyph paint suppressed.
 * This is a reproducible screenshot audit, not a substitute for manual focus/disabled QA.
 */
export async function measureContrast({ base, launch, out }) {
  const results = [];
  for (const width of [390, 1440]) for (const mode of ['static', 'world']) {
    const browser = await launch();
    try {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, deviceScaleFactor: 1, reducedMotion: mode === 'static' ? 'reduce' : 'no-preference', isMobile: width === 390, hasTouch: width === 390 });
      await context.addInitScript(() => localStorage.setItem('lasoviet:theme', 'light'));
      const page = await context.newPage(); await page.goto(base + '/?troiNamWorldDebug=1', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('.tn-hero-plate')?.naturalWidth > 0);
      await page.evaluate(() => document.fonts.ready);
      if (mode === 'world') await page.waitForFunction(() => document.querySelector('.tn')?.getAttribute('data-troi-nam-world-ready')?.startsWith('light:'), null, { timeout: 30000 });
      await page.addStyleTag({ content: '* { animation-play-state: paused !important; transition: none !important; caret-color: transparent !important; }' });
      const positions = mode === 'static' ? ['.tn-hero', '.tn-story', '.tn-explore', '.tn-needs', '.tn-usp', '.tn-value', '.tn-about', '.tn-compare', '.tn-testimonials', '.tn-faq', '.site-footer'] : [0, .25, .375, .5, .625, .75, 1];
      for (const position of positions) {
        const selector = mode === 'static' ? position : '.tn';
        const section = page.locator(selector); if (!(await section.count())) continue;
        if (mode === 'static') await section.scrollIntoViewIfNeeded();
        else await page.evaluate(progress => {
          const hero = document.querySelector('.tn-hero'), chart = document.querySelector('.tn-explore .hv3-chart');
          const start = hero.getBoundingClientRect().top + scrollY;
          const end = chart.getBoundingClientRect().top + scrollY + chart.offsetHeight / 2 - innerHeight / 2;
          scrollTo(0, start + progress * (end - start));
        }, position);
        await page.waitForTimeout(600);
        // Playwright waits for newly requested fonts before a screenshot. Capture
        // once before recording glyph rectangles so font settling cannot move them.
        const normalPNG = await page.screenshot();
        const nodes = await page.evaluate(selector => {
          const root = document.querySelector(selector); const nodes = []; const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const node = walker.currentNode; const el = node.parentElement; const text = node.textContent.trim();
            if (!text || el.closest('[aria-hidden="true"],script,style,template,noscript,[disabled],.hv3-sr,.sr-only')) continue;
            const style = getComputedStyle(el); let opacity = 1; for (let p = el; p; p = p.parentElement) opacity *= Number(getComputedStyle(p).opacity);
            if (style.visibility !== 'visible' || opacity < .95) continue;
            const color = style.color.match(/[\d.]+/g)?.map(Number); if (!color || color.length < 3 || (color[3] ?? 1) === 0) continue;
            const range = document.createRange(); range.selectNodeContents(node);
            const viewport = visualViewport;
            const rects = [...range.getClientRects()].map(r => ({ x: r.x - viewport.offsetLeft, y: r.y - viewport.offsetTop, width: r.width, height: r.height })).filter(r => r.width && r.height && r.y >= 80 && r.y + r.height <= viewport.height && r.x >= 0 && r.x + r.width <= viewport.width);
            if (!rects.length) continue;
            nodes.push({ text: text.slice(0, 120), className: el.className, color, alpha: (color[3] ?? 1) * opacity, rects, required: parseFloat(style.fontSize) >= 24 || parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700 ? 3 : 4.5 });
          }
          return nodes;
        }, selector);
        if (mode === 'static' && position === '.tn-hero') writeFileSync(resolve(out, `contrast-hero-${width}-coordinates.json`), JSON.stringify({ nodes, viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollY, visual: { top: visualViewport.offsetTop, left: visualViewport.offsetLeft, scale: visualViewport.scale }, label: document.querySelector('#hv3-date-label').getBoundingClientRect().toJSON() })) }, null, 2));
        const normal = await sharp(normalPNG).removeAlpha().raw().toBuffer();
        const hide = await page.addStyleTag({ content: `html body ${selector}, html body ${selector} * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }` });
        const backgroundPNG = await page.screenshot();
        const background = await sharp(backgroundPNG).removeAlpha().raw().toBuffer(); await hide.evaluate(e => e.remove());
        if (mode === 'static' && position === '.tn-hero') { writeFileSync(resolve(out, `contrast-hero-${width}-normal.png`), normalPNG); writeFileSync(resolve(out, `contrast-hero-${width}-background.png`), backgroundPNG); }
        for (const node of nodes) {
          const pixels = [];
          for (const r of node.rects) for (let y = Math.ceil(r.y); y < Math.floor(r.y + r.height); y++) for (let x = Math.ceil(r.x); x < Math.floor(r.x + r.width); x++) {
            const index = (y * width + x) * 3;
            const bg = [...background.subarray(index, index + 3)]; const fg = [...normal.subarray(index, index + 3)];
            const delta = Math.max(...fg.map((c, i) => Math.abs(c - bg[i])));
            if (delta > 30) pixels.push({ x, y, bg, delta, ratio: ratio(node.color.map((c, i) => i < 3 ? c * node.alpha + bg[i] * (1 - node.alpha) : c), bg) });
          }
          if (!pixels.length) continue;
          const max = Math.max(...pixels.map(p => p.delta)); const glyph = pixels.filter(p => p.delta >= max * .75);
          const worst = glyph.reduce((a, b) => a.ratio < b.ratio ? a : b);
          results.push({ width, mode, position, selector, text: node.text, className: node.className, foreground: node.color, required: node.required, ...worst, pass: worst.ratio >= node.required });
        }
      }
    } finally { await browser.close(); }
  }
  writeFileSync(resolve(out, 'contrast.json'), JSON.stringify({ method: 'Light, device scale 1; actual background screenshot with glyph color suppressed, sampling strongest rendered glyph pixels. Fully opaque settled visible direct text only; one viewport per static section and seven actual 3D scroll positions. Does not cover every control state. Container uses software rendering.', results }, null, 2));
  console.log(`Contrast audit: ${results.length} text samples, ${results.filter(r => !r.pass).length} below required ratio`);
}
