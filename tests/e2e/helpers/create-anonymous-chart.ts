import type { Page } from "@playwright/test";

type Locale = "en" | "vi";

const labels = {
  vi: {
    continue: "Tiếp tục",
    day: "Ngày",
    month: "Tháng",
    year: "Năm",
    hour: "Giờ",
    minute: "Phút",
    gender: "Nam",
    submit: "Lập lá số",
  },
  en: {
    continue: "Continue",
    day: "Day",
    month: "Month",
    year: "Year",
    hour: "Hour",
    minute: "Minute",
    gender: "Male",
    submit: "Create chart",
  },
} as const;

export async function createAnonymousChart(page: Page, locale: Locale) {
  const copy = labels[locale];
  const prefix = locale === "en" ? "/en" : "";

  const baseURL = (page.context() as unknown as { _options?: { baseURL?: string } })._options?.baseURL
    ?? (process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000");
  const host = new URL(baseURL).hostname;

  await page.context().addCookies([{
    name: "NEXT_LOCALE",
    value: locale,
    domain: host,
    path: "/",
  }]);
  await page.goto(`${prefix}/tao-la-so/tu-vi`);
  await page.getByRole("radio", { name: copy.gender, exact: true }).check();
  await page.getByRole("button", { name: copy.continue }).click();
  await page.getByLabel(copy.day, { exact: true }).selectOption("01");
  await page.getByLabel(copy.month, { exact: true }).selectOption("01");
  await page.getByLabel(copy.year, { exact: true }).selectOption("1990");
  await page.getByLabel(copy.hour, { exact: true }).fill("09");
  await page.getByLabel(copy.minute, { exact: true }).fill("30");
  await page.getByRole("button", { name: copy.continue }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: copy.submit }).click();
  await page.waitForURL(/\/(?:en\/)?la-so\/[^/]+$/, { timeout: 15_000 });

  return page.url();
}
