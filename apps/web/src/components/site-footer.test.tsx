import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("links to the terms page in Vietnamese", () => {
    const html = renderToStaticMarkup(<SiteFooter locale="vi" />);
    expect(html).toContain('href="/dieu-khoan"');
    expect(html).toContain("Điều khoản");
  });

  it("links to the terms page in English with the locale prefix", () => {
    const html = renderToStaticMarkup(<SiteFooter locale="en" />);
    expect(html).toContain('href="/en/dieu-khoan"');
    expect(html).toContain("Terms");
  });

  it("still links to the privacy policy", () => {
    const html = renderToStaticMarkup(<SiteFooter locale="vi" />);
    expect(html).toContain('href="/chinh-sach-bao-mat"');
  });
});
