import type { Page } from "@playwright/test";

type Locale = "en" | "vi";

const labels = {
  vi: {
    continue: "Tiếp tục",
    date: "Ngày sinh dương lịch",
    hour: "Giờ",
    minute: "Phút",
    gender: "Nam",
    consent: "Tôi đồng ý để Lá Số Việt xử lý thông tin sinh nhằm lập lá số này.",
    submit: "Lập lá số",
  },
  en: {
    continue: "Continue",
    date: "Solar birth date",
    hour: "Hour",
    minute: "Minute",
    gender: "Male",
    consent: "I agree that Lá Số Việt may process this birth information to create this chart.",
    submit: "Create chart",
  },
} as const;

export async function createAnonymousChart(page: Page, locale: Locale) {
  const copy = labels[locale];
  const prefix = locale === "en" ? "/en" : "";

  await page.context().addCookies([{
    name: "NEXT_LOCALE",
    value: locale,
    domain: new URL(page.url() === "about:blank" ? "http://127.0.0.1" : page.url()).hostname,
    path: "/",
  }]);
  await page.goto(`${prefix}/tao-la-so/tu-vi`);
  await page.getByRole("button", { name: copy.continue }).click();
  await page.getByLabel(copy.date).fill("1990-01-01");
  await page.getByLabel(copy.hour, { exact: true }).fill("09");
  await page.getByLabel(copy.minute, { exact: true }).fill("30");
  await page.getByRole("radio", { name: copy.gender, exact: true }).check();
  await page.getByRole("button", { name: copy.continue }).click();
  await page.getByLabel(copy.consent).check();
  await page.getByRole("button", { name: copy.submit }).click();
  await page.waitForURL(/\/(?:en\/)?la-so\/[^/]+$/);

  return page.url();
}
