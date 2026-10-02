import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import vi from "../../../messages/vi/homepage-v3.json";
import { TroiNamCompare } from "./troi-nam-compare";
import { TroiNamTestimonials } from "./troi-nam-testimonials";
import { HomepageV3Compare } from "../homepage-v3/homepage-v3-compare";
function render(children: React.ReactNode) {
  return renderToStaticMarkup(<NextIntlClientProvider timeZone="UTC" locale="vi" messages={{ "homepage-v3": vi }}>{children}</NextIntlClientProvider>);
}
describe("approved homepage audit behavior", () => {
  it("keeps comparison evidence permanently visible", () => {
    const html = render(<TroiNamCompare locale="vi" />);
    expect(html).not.toContain("<details");
    expect(html).not.toContain("<summary");
    expect(html).toContain("<table");
    expect(html).toContain("hv3-compare-mobile");
  });
  it("preserves the shared comparison disclosure", () => {
    expect(render(<HomepageV3Compare />)).toContain("<details");
  });
  it("renders one bounded carousel and retains reader expansion", () => {
    const html = render(<TroiNamTestimonials />);
    expect(html).toContain("hv3-tt-carousel");
    expect(html).not.toContain('class="hv3-tt-grid"');
    expect(html).not.toContain('class="hv3-tt-row"');
    expect((html.match(/<article/g) ?? [])).toHaveLength(3);
    expect(html).toContain('aria-controls="hv3-tt-extra"');
  });
});
