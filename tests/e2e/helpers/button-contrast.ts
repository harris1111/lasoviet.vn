import type { Locator } from "@playwright/test";

export async function minimumButtonContrast(locator: Locator): Promise<number> {
  return locator.evaluate(element => {
    const style = getComputedStyle(element);
    const rgb = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const luminance = (color: number[]) => color.map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const foreground = luminance(rgb(style.color));
    const backgrounds = style.backgroundImage.match(/rgba?\([^)]+\)/g)!;
    return Math.min(...backgrounds.map(color => { const background = luminance(rgb(color)); return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05); }));
  });
}
