import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import en from "../../../messages/en/homepage-v3.json";
import vi from "../../../messages/vi/homepage-v3.json";
import { HomepageV3Explore } from "../homepage-v3/homepage-v3-explore";
import { palaceOnBranch } from "../homepage-v3/homepage-v3-data";
import { TroiNamExplore } from "./troi-nam-explore";

const icons = ["phu-the", "huynh-de", "menh", "phu-mau", "phuc-duc", "dien-trach", "quan-loc", "no-boc", "thien-di", "tat-ach", "tai-bach", "tu-tuc"];
const palaces = ["phuthe", "huynh", "menh", "phumau", "phucduc", "dientrach", "quanloc", "nobo", "thiendi", "tatach", "taibach", "tutuc"];

describe("Trời Nam palace art", () => {
  for (const locale of ["vi", "en"] as const) {
    it(`maps all twelve I01 icons to canonical palace buttons in ${locale}`, () => {
      const html = renderToStaticMarkup(
        <NextIntlClientProvider timeZone="UTC" locale={locale} messages={{ "homepage-v3": locale === "vi" ? vi : en }}>
          <TroiNamExplore locale={locale} />
        </NextIntlClientProvider>,
      );
      const styles = html.match(/<style>([\s\S]*?)<\/style>/g)?.join("\n") ?? "";
      const selectors = styles.replace(/<\/?style>/g, "").split("}")
        .map((rule) => rule.split("{")[0]?.trim()).filter(Boolean);
      expect(selectors).toHaveLength(12);
      expect(selectors.every((selector) => selector?.startsWith(".tn .tn-explore "))).toBe(true);
      icons.forEach((icon, index) => {
        expect(palaceOnBranch(index).id).toBe(palaces[index]);
        expect(styles).toMatch(new RegExp(`\\.tn \\.tn-explore \\.hv3-cell:nth-child\\(${index + 1}\\)::before\\s*\\{[^}]*${icon}\\.webp`));
      });
      expect((html.match(/class="hv3-cell"/g) ?? []).length).toBe(12);
      expect((html.match(/aria-pressed="true"/g) ?? []).length).toBe(2);
      const shared = renderToStaticMarkup(
        <NextIntlClientProvider timeZone="UTC" locale={locale} messages={{ "homepage-v3": locale === "vi" ? vi : en }}>
          <HomepageV3Explore locale={locale} />
        </NextIntlClientProvider>,
      );
      expect(html.match(/<button[^>]*class="hv3-cell"[\s\S]*?<\/button>/g))
        .toEqual(shared.match(/<button[^>]*class="hv3-cell"[\s\S]*?<\/button>/g));
    });
  }

  it("does not inject palace art into the shared live-homepage chart", () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider timeZone="UTC" locale="vi" messages={{ "homepage-v3": vi }}>
        <HomepageV3Explore locale="vi" />
      </NextIntlClientProvider>,
    );
    expect(html).not.toContain("<style>");
    expect(html).not.toContain("/images/troi-nam/");
    expect((html.match(/class="hv3-cell"/g) ?? []).length).toBe(12);
  });
});
