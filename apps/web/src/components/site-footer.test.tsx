import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("links to terms, privacy, and payment policies in Vietnamese with exact paths", () => {
    const html = renderToStaticMarkup(<SiteFooter locale="vi" />);
    expect(html).toContain('href="/nap-la"');
    expect(html).toContain("Nạp Lá");

    expect(html).toContain('href="/dieu-khoan"');
    expect(html).toContain("Điều khoản");

    expect(html).toContain('href="/chinh-sach-bao-mat"');
    expect(html).toContain("Quyền riêng tư");

    expect(html).toContain('href="/dieu-khoan#thanh-toan"');
    expect(html).toContain("Chính sách thanh toán");
  });

  it("links to terms, privacy, and payment policies in English with the /en prefix parity", () => {
    const html = renderToStaticMarkup(<SiteFooter locale="en" />);
    expect(html).toContain('href="/en/nap-la"');
    expect(html).toContain("Top up Lá");

    expect(html).toContain('href="/en/dieu-khoan"');
    expect(html).toContain("Terms");

    expect(html).toContain('href="/en/chinh-sach-bao-mat"');
    expect(html).toContain("Privacy");

    expect(html).toContain('href="/en/dieu-khoan#thanh-toan"');
    expect(html).toContain("Payment policy");
  });

  it("renders configured support email when visible in both locales", () => {
    const htmlVi = renderToStaticMarkup(<SiteFooter locale="vi" />);
    expect(htmlVi).toContain("mailto:lasoviet.net@gmail.com");
    expect(htmlVi).toContain("lasoviet.net@gmail.com");

    const htmlEn = renderToStaticMarkup(<SiteFooter locale="en" />);
    expect(htmlEn).toContain("mailto:lasoviet.net@gmail.com");
    expect(htmlEn).toContain("lasoviet.net@gmail.com");
  });

  it("never leaks forbidden customer-facing copy such as Zalo, phone, address, legal entity, or social", () => {
    const htmlVi = renderToStaticMarkup(<SiteFooter locale="vi" />);
    expect(htmlVi).not.toMatch(/zalo|hotline|điện thoại|địa chỉ|facebook|tiktok|instagram|youtube/i);

    const htmlEn = renderToStaticMarkup(<SiteFooter locale="en" />);
    expect(htmlEn).not.toMatch(/zalo|hotline|phone|telephone|street address|facebook|tiktok|instagram|youtube/i);
  });
});
