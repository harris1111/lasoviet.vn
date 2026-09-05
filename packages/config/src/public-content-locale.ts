import { franc } from "franc-min";

export type ContentLocale = "vi" | "en";

const minimumLength = 48;
// Current technical VI samples bottom out near 0.1259; accented EN injection is about 0.0521.
const technicalVietnameseMinimumRatio = 0.10;
const mojibake = /\uFFFD|(?:Ã.|Â.|â[€™“”–])/u;

function invalid(message: string): never {
  throw new Error(`PUBLIC_CONTENT_INVALID: ${message}`);
}

function sanitizeMarkdown(value: string): string {
  return value
    .replace(/\[[^[]*?\]\(route:[a-z0-9.-]+\)/gu, " ")
    .replace(/[`*_~>#]/gu, " ")
    .replace(/^\s*[-+]\s+/gmu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function blocks(value: string, removeHeadings = false): string[] {
  return value.split(/\r?\n\s*\r?\n/u)
    .map((block) => removeHeadings
      ? block.replace(/^\s{0,3}#{1,6}\s+.*$/gmu, "")
      : block)
    .map(sanitizeMarkdown)
    .filter((block) => block.length > 0);
}

function samples(value: string): string[] {
  const proseBlocks = blocks(value);
  const headingFreeBlocks = blocks(value, true);
  const windows = rollingWindows(proseBlocks);
  const headingFreeWindows = rollingWindows(headingFreeBlocks);
  return [sanitizeMarkdown(value), ...proseBlocks, ...headingFreeBlocks, ...windows, ...headingFreeWindows].filter(
    (sample) => sample.length >= minimumLength,
  );
}

function rollingWindows(proseBlocks: string[]): string[] {
  return proseBlocks.flatMap((block, start) => {
    let window = block;
    for (let index = start + 1; index < proseBlocks.length && window.length < minimumLength; index += 1) {
      window = `${window} ${proseBlocks[index]}`;
    }
    return window.length >= minimumLength ? [window] : [];
  });
}

function vietnameseOrthographyRatio(value: string): number {
  const letters = value.match(/\p{L}/gu)?.length ?? 0;
  const markers = value.normalize("NFD").match(/\p{Diacritic}|[đĐ]/gu)?.length ?? 0;
  return markers / Math.max(letters, 1);
}

function isAscii(value: string): boolean {
  return /^[\x00-\x7F]*$/u.test(value);
}

function assertSampleLocale(locale: ContentLocale, sample: string): void {
  const detected = franc(sample, { only: ["eng", "vie"], minLength: minimumLength });
  if (detected === "und") return;
  if (locale === "en" && detected === "vie") invalid("locale contamination");
  if (locale === "vi" && detected === "vie" && isAscii(sample)) {
    invalid("ASCII Vietnamese corruption");
  }
  if (
    locale === "vi" &&
    detected === "eng" &&
    vietnameseOrthographyRatio(sample) < technicalVietnameseMinimumRatio
  ) {
    invalid("locale contamination");
  }
}

export function assertPublicContentLocale(locale: ContentLocale, markdown: string): void {
  if (mojibake.test(markdown)) invalid("text corruption");
  try {
    for (const sample of samples(markdown)) assertSampleLocale(locale, sample);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("PUBLIC_CONTENT_INVALID:")) {
      throw error;
    }
    invalid("locale detection failure");
  }
}
