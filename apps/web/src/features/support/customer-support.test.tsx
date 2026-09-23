import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "selection.title": "Chọn luận giải",
      "selection.supportTitle": "Cần hỗ trợ về gói luận giải?",
      "selection.supportDescription": "Gửi email cho Lá Số Việt để được giải đáp thắc mắc về các gói luận giải và quyền lợi.",
      "selection.supportAction": "Gửi email hỗ trợ",
      "home.support.title": "Cần đồng hành hoặc hỗ trợ?",
      "home.support.description": "Gửi email cho Lá Số Việt để được giải đáp mọi thắc mắc, riêng tư và bảo mật.",
      "home.support.action": "Gửi email hỗ trợ",
    };
    return map[key] ?? key;
  },
}));

import { renderToStaticMarkup } from "react-dom/server";

import { customerContactConfig } from "@lasoviet/config/customer-contact";
import { SiteFooter } from "../../components/site-footer";
import { SupportCard } from "../../components/ui/support-card";
import { OrderHistory } from "../account/order-history";
import { VietQrCheckout } from "../commerce/vietqr-checkout";
import { HomepageSupport } from "../homepage/homepage-support";
import { PaidTopicSelector } from "../reports/paid-topic-selector";

describe("Customer support & contact invariants (LSV-26 / UI-08)", () => {
  describe("Contact display flags", () => {
    it("has typed customer-contact config with email visible and others disabled", () => {
      expect(customerContactConfig.email.value).toBe("support@lasoviet.net");
      expect(customerContactConfig.email.visible).toBe(true);
      expect(customerContactConfig.phone.visible).toBe(false);
      expect(customerContactConfig.zalo.visible).toBe(false);
      expect(customerContactConfig.address.visible).toBe(false);
      expect(customerContactConfig.legalEntity.visible).toBe(false);
      expect(customerContactConfig.social.visible).toBe(false);
    });

    it("respects visibility flag in SupportCard primitive", () => {
      const visibleHtml = renderToStaticMarkup(
        <SupportCard
          description="Support description"
          title="Support Title"
          visible={true}
        />,
      );
      expect(visibleHtml).toContain("mailto:support@lasoviet.net");

      const hiddenHtml = renderToStaticMarkup(
        <SupportCard
          description="Support description"
          title="Support Title"
          visible={false}
        />,
      );
      expect(hiddenHtml).toBe("");
    });
  });

  describe("SiteFooter policy links & path parity", () => {
    it("renders policy links and configured support email with VI/EN path parity", () => {
      const viHtml = renderToStaticMarkup(<SiteFooter locale="vi" />);
      expect(viHtml).toContain('href="/dieu-khoan"');
      expect(viHtml).toContain('href="/chinh-sach-bao-mat"');
      expect(viHtml).toContain('href="/dieu-khoan#thanh-toan"');
      expect(viHtml).toContain("mailto:support@lasoviet.net");
      expect(viHtml).toContain("support@lasoviet.net");

      const enHtml = renderToStaticMarkup(<SiteFooter locale="en" />);
      expect(enHtml).toContain('href="/en/dieu-khoan"');
      expect(enHtml).toContain('href="/en/chinh-sach-bao-mat"');
      expect(enHtml).toContain('href="/en/dieu-khoan#thanh-toan"');
      expect(enHtml).toContain("mailto:support@lasoviet.net");
      expect(enHtml).toContain("support@lasoviet.net");
    });
  });

  describe("Support card placement on required surfaces", () => {
    it("renders support card on homepage before final CTA", () => {
      const html = renderToStaticMarkup(<HomepageSupport />);
      expect(html).toContain("mailto:support@lasoviet.net");
      expect(html).toContain("Cần đồng hành hoặc hỗ trợ?");
      expect(html).toContain("Gửi email hỗ trợ");
    });

    it("renders support card on topic selection surface", () => {
      const html = renderToStaticMarkup(
        <PaidTopicSelector
          locale="vi"
          topics={{
            version: 1,
            chartId: "chart-test",
            chartVersionId: "v1",
            offers: [
              {
                sku: "ZIWEI-IDENTITY-P0",
                method: "ziwei",
                price: 79000,
                currency: "VND",
                sections: ["overview"],
              },
            ],
          }}
        />,
      );

      expect(html).toContain('data-testid="topic-support-card"');
      expect(html).toContain("mailto:support@lasoviet.net");
      expect(html).toContain("Cần hỗ trợ về gói luận giải?");
    });

    it("renders support card on checkout expired surface with safe code in mailto subject", () => {
      const html = renderToStaticMarkup(
        <VietQrCheckout
          initialStatus={{
            order: {
              id: "internal-uuid-order-expired-999",
              status: "expired",
              amount: 79000,
              currency: "VND",
              locale: "vi",
              productTitle: "Báo cáo",
              paymentCode: "LSVEXPIREDCODE",
              chartId: "chart-1",
              createdAt: "2026-09-08T00:00:00Z",
              creditApplied: 0,
              creditExpiresAt: null,
              supportUrl: "/lien-he?order=LSVEXPIREDCODE",
            },
            paymentInstructions: null,
            reportId: null,
          }}
          labels={{
            status: {
              expired: "Hết hạn",
              failed: "Thất bại",
              paid: "Đã thanh toán",
              pending: "Chờ thanh toán",
              refunded: "Hoàn tiền",
            },
          } as any}
        />,
      );

      expect(html).toContain('data-testid="checkout-expired-support"');
      expect(html).toContain(
        "mailto:support@lasoviet.net?subject=%5BL%C3%A1%20S%E1%BB%91%20Vi%E1%BB%87t%5D%20H%E1%BB%97%20tr%E1%BB%A3%20%C4%91%C6%A1n%20h%C3%A0ng%20LSVEXPIREDCODE",
      );
      expect(html).not.toContain("internal-uuid-order-expired-999");
    });

    it("renders support card on checkout failed surface with safe code in mailto subject", () => {
      const html = renderToStaticMarkup(
        <VietQrCheckout
          initialStatus={{
            order: {
              id: "internal-uuid-order-failed-888",
              status: "failed",
              amount: 79000,
              currency: "VND",
              locale: "vi",
              productTitle: "Báo cáo",
              paymentCode: "LSVFAILEDCODE",
              chartId: "chart-1",
              createdAt: "2026-09-08T00:00:00Z",
              creditApplied: 0,
              creditExpiresAt: null,
              supportUrl: "/lien-he?order=LSVFAILEDCODE",
            },
            paymentInstructions: null,
            reportId: null,
          }}
          labels={{
            status: {
              expired: "Hết hạn",
              failed: "Thất bại",
              paid: "Đã thanh toán",
              pending: "Chờ thanh toán",
              refunded: "Hoàn tiền",
            },
          } as any}
        />,
      );

      expect(html).toContain('data-testid="checkout-failed-support"');
      expect(html).toContain(
        "mailto:support@lasoviet.net?subject=%5BL%C3%A1%20S%E1%BB%91%20Vi%E1%BB%87t%5D%20H%E1%BB%97%20tr%E1%BB%A3%20%C4%91%C6%A1n%20h%C3%A0ng%20LSVFAILEDCODE",
      );
      expect(html).not.toContain("internal-uuid-order-failed-888");
    });

    it("renders support card on account order history surface", () => {
      const html = renderToStaticMarkup(
        <OrderHistory
          locale="vi"
          orders={{
            version: 1,
            totalCount: 1,
            orders: [
              {
                id: "internal-uuid-order-hist-777",
                orderId: "internal-uuid-order-hist-777",
                invoiceNumber: "LSV-INV-999",
                chartId: "chart-1",
                profileId: "prof-1",
                profileDisplayName: "Nguyễn Văn A",
                sku: "ZIWEI-IDENTITY-P0",
                productTitle: "Bản mệnh & tiềm năng",
                productName: "Bản mệnh & tiềm năng",
                amount: 79000,
                currency: "VND",
                status: "paid",
                orderStatus: "paid",
                locale: "vi",
                createdAt: "2026-09-08T00:00:00Z",
                paidAt: "2026-09-08T00:05:00Z",
                reportId: "rep-1",
                readUrl: "/bao-cao/rep-1",
                supportUrl: "/lien-he?order=LSV-INV-999",
              },
            ],
            items: [],
          }}
        />,
      );

      expect(html).toContain('data-testid="account-orders-support"');
      expect(html).toContain(
        "mailto:support@lasoviet.net?subject=%5BL%C3%A1%20S%E1%BB%91%20Vi%E1%BB%87t%5D%20H%E1%BB%97%20tr%E1%BB%A3%20%C4%91%C6%A1n%20h%C3%A0ng",
      );
      expect(html).not.toContain("internal-uuid-order-hist-777");
    });
  });

  describe("Grep-style forbidden customer copy assertions", () => {
    it("ensures web surfaces never leak Zalo, phone numbers, addresses, legal entity, or social", () => {
      const footerHtml = renderToStaticMarkup(<SiteFooter locale="vi" />);
      const supportHtml = renderToStaticMarkup(
        <SupportCard
          description="Hỗ trợ qua email."
          title="Hỗ trợ"
        />,
      );

      const combined = `${footerHtml} ${supportHtml}`;
      expect(combined).not.toMatch(
        /zalo|hotline|0\d{9}|điện thoại|địa chỉ|công ty tnhh|cổ phần|facebook|tiktok|instagram|youtube/i,
      );
    });
  });
});
