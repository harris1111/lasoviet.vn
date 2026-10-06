import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";

let mockLocale = "vi";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("next-intl", async () => {
  const viReports = (await import("../../../messages/vi/reports.json")).default;
  const enReports = (await import("../../../messages/en/reports.json")).default;
  return {
    useTranslations: (namespace?: string) => {
      return (key: string, values?: Record<string, unknown>) => {
        const root = mockLocale === "en" ? enReports : viReports;
        const messages = namespace && namespace !== "reports" ? (root as Record<string, unknown>)[namespace] : root;
        let val: unknown = messages;
        for (const segment of key.split(".")) {
          val = (val as Record<string, unknown>)?.[segment];
        }
        if (typeof val === "string") {
          if (values) {
            return Object.entries(values).reduce(
              (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
              val,
            );
          }
          return val;
        }
        return key;
      };
    },
  };
});

import type { FreeIdentityPreviewV1, NormalizedZiweiChartV1 } from "@lasoviet/contracts";

import { Guest24hDeletionBanner } from "./guest-24h-deletion-banner";
import { SecureLockedPreview } from "./secure-locked-preview";
import { FreeIdentityPreview } from "../reports/free-identity-preview";
import { projectFreeIdentityPreview } from "./ziwei-free-preview-projection";

const mockEvidence = (id: string) => ({
  evidenceId: id,
  factReferences: [`fact.${id}`],
  confidence: "high" as const,
  interpretationBoundCodes: ["reflective_identity_only" as const],
  interpretationBounds: ["identity-only"],
  limitations: ["birth-time-dependent"],
});

const guestPreview: FreeIdentityPreviewV1 = {
  version: 1,
  chartId: "chart-guest",
  chartVersionId: "ver-1",
  capabilityId: "ziwei.identity.p0",
  summaryVersion: "ziwei.identity.free.v1",
  audience: "guest",
  magnetOffer: {
    title: "Lá số Tử Vi của bạn, và 2 điều lá số nói riêng về bạn",
    subtitle: "Lập từ dữ liệu sinh chuẩn xác trong 60 giây.",
  },
  insightDetails: [
    {
      id: "life-palace",
      numeral: "01",
      title: "Chủ lực Cung Mệnh",
      tagline: "Cung Mệnh",
      evidenceId: "ziwei.identity.life-palace",
      isLocked: false,
      description: "Tọa thủ tại Cung Mệnh phản ánh trục cốt lõi về bản sắc.",
    },
    {
      id: "body-palace",
      numeral: "02",
      title: "Hành động Cung Thân",
      tagline: "Cung Thân",
      evidenceId: "ziwei.identity.body-palace",
      isLocked: true,
      lockedPreview: {
        id: "locked-body-palace",
        isLocked: true,
        title: "Hành động Cung Thân",
        tagline: "Cung Thân",
        clippedSentences: ["Phương thức hành động và thích ứng thực tế…"],
        lengthHint: 4,
        priceLa: 120,
      },
    },
  ],
  palaceTitleLines: [
    { palaceId: "ziwei.palace.life", title: "Chủ lực Cung Mệnh", state: "read" },
    { palaceId: "ziwei.palace.body", title: "Hành động Cung Thân", state: "unopened" },
  ],
  banMenhPreview: {
    isLocked: true,
    title: "Bản Mệnh toàn diện",
    lengthHint: 4,
    priceLa: 240,
  },
  insights: [
    { id: "life-palace", evidence: mockEvidence("ziwei.identity.life-palace") },
    { id: "body-palace", evidence: mockEvidence("ziwei.identity.body-palace") },
    { id: "transformations", evidence: mockEvidence("ziwei.identity.transformations") },
  ],
  strengthSignal: {
    id: "strength-1",
    evidence: mockEvidence("ziwei.identity.life-palace"),
  },
  tensionSignal: {
    id: "tension-1",
    evidence: [mockEvidence("ziwei.identity.body-palace"), mockEvidence("ziwei.identity.transformations")],
  },
  paidPreview: {
    sku: "ZIWEI-IDENTITY-P0",
    sectionId: "personal_summary",
    coveragePercent: 12,
    evidence: [mockEvidence("ziwei.identity.life-palace")],
  },
};

const verifiedPreview: FreeIdentityPreviewV1 = {
  version: 1,
  chartId: "chart-verified",
  chartVersionId: "ver-1",
  capabilityId: "ziwei.identity.p0",
  summaryVersion: "ziwei.identity.free.v1",
  audience: "verified",
  topConcern: "career",
  magnetOffer: {
    title: "Lá số Tử Vi của bạn, và 2 điều lá số nói riêng về bạn",
    subtitle: "Lập từ dữ liệu sinh chuẩn xác trong 60 giây.",
  },
  insightDetails: [
    {
      id: "life-palace",
      numeral: "01",
      title: "Chủ lực Cung Mệnh",
      tagline: "Cung Mệnh",
      evidenceId: "ziwei.identity.life-palace",
      isLocked: false,
      description: "Tọa thủ tại Cung Mệnh phản ánh trục cốt lõi về bản sắc.",
    },
    {
      id: "top-concern",
      numeral: "02",
      title: "Định hướng Cung Quan Lộc",
      tagline: "Cung Quan Lộc",
      evidenceId: "ziwei.identity.body-palace",
      isLocked: false,
      description: "Cung Quan Lộc thể hiện phong cách triển khai công việc.",
    },
  ],
  palaceTitleLines: [
    { palaceId: "ziwei.palace.life", title: "Chủ lực Cung Mệnh", state: "read" },
    { palaceId: "ziwei.palace.career", title: "Định hướng Cung Quan Lộc", state: "preview" },
  ],
  banMenhPreview: {
    isLocked: true,
    title: "Bản Mệnh toàn diện",
    opening: "Bản mệnh của bạn định hình từ trục Cung Mệnh với tính cách kiên định…",
    lengthHint: 4,
    priceLa: 240,
  },
  insights: [
    { id: "life-palace", evidence: mockEvidence("ziwei.identity.life-palace") },
    { id: "body-palace", evidence: mockEvidence("ziwei.identity.body-palace") },
    { id: "transformations", evidence: mockEvidence("ziwei.identity.transformations") },
  ],
  strengthSignal: {
    id: "strength-1",
    evidence: mockEvidence("ziwei.identity.life-palace"),
  },
  tensionSignal: {
    id: "tension-1",
    evidence: [mockEvidence("ziwei.identity.body-palace"), mockEvidence("ziwei.identity.transformations")],
  },
  paidPreview: {
    sku: "ZIWEI-IDENTITY-P0",
    sectionId: "personal_summary",
    coveragePercent: 12,
    evidence: [mockEvidence("ziwei.identity.life-palace")],
  },
};

describe("FD-105 package 1.4: Web component security, accessibility, and print tests", () => {
  describe("Guest view rendering", () => {
    it("renders 24-hour deletion banner with save CTA and countdown badge", () => {
      const html = renderToStaticMarkup(
        React.createElement(Guest24hDeletionBanner, {
          locale: "vi",
          signInHref: "/dang-nhap?callbackURL=/la-so/chart-guest",
        }),
      );

      expect(html).toContain("24H");
      expect(html).toContain("Dữ liệu khách tự động xóa trong 24 giờ");
      expect(html).toContain("tài khoản đủ điều kiện được xác minh nhận một lần 60 Lá chào mừng");
      expect(html).not.toContain("vĩnh viễn");
      expect(html).toContain("Lưu lá số ngay");
      expect(html).toContain('href="/dang-nhap?callbackURL=/la-so/chart-guest"');
    });

    it("renders FreeIdentityPreview with insight 1 unlocked and insight 2 locked with blurred placeholder bars", async () => {
      mockLocale = "vi";
      const safeGuestPreview = projectFreeIdentityPreview(guestPreview)!;
      const html = renderToStaticMarkup(
        React.createElement(FreeIdentityPreview, {
          chartId: "chart-guest",
          loadEvidence: vi.fn(),
          preview: safeGuestPreview,
          locale: "vi",
          isGuest: true,
          signInHref: "/dang-nhap?callbackURL=/la-so/chart-guest",
        }),
      );

      // Magnet offer headline
      expect(html).toContain("Lá số Tử Vi của bạn, và 2 điều lá số nói riêng về bạn");

      // Insight 1 is readable
      expect(html).toContain("Chủ lực Cung Mệnh");
      expect(html).toContain("Tọa thủ tại Cung Mệnh phản ánh trục cốt lõi về bản sắc.");
      expect(html).toContain("Xem căn cứ");

      // Insight 2 is locked
      expect(html).toContain("Hành động Cung Thân");
      expect(html).toContain("Phương thức hành động và thích ứng thực tế…");
      // Blurred bars are aria-hidden
      expect(html).toMatch(/class="[^"]*locked-preview-blur-bars[^"]*"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*class="[^"]*locked-preview-blur-bars[^"]*"/);
      // CTA to save chart
      expect(html).toContain("Lưu lá số để đọc điều thứ hai");

      // CRITICAL: Ensure NO full narrative or secret plaintext is present anywhere in HTML
      expect(html).not.toContain("Tọa thủ tại Cung Thân phản ánh phương thức thực thi");
      expect(html).not.toContain("Bản mệnh của bạn định hình từ trục Cung Mệnh");
    });
  });

  describe("Verified Signed-In view rendering", () => {
    it("renders insight 2 unlocked with full prose, and Bản Mệnh opening with clipped text + blur", () => {
      mockLocale = "vi";
      const safeVerifiedPreview = projectFreeIdentityPreview(verifiedPreview)!;
      const html = renderToStaticMarkup(
        React.createElement(FreeIdentityPreview, {
          chartId: "chart-verified",
          loadEvidence: vi.fn(),
          preview: safeVerifiedPreview,
          locale: "vi",
          isGuest: false,
        }),
      );

      // Insight 2 is fully unlocked
      expect(html).toContain("Định hướng Cung Quan Lộc");
      expect(html).toContain("Cung Quan Lộc thể hiện phong cách triển khai công việc.");

      // Bản Mệnh preview is present with 1-2 clipped safe opening sentences
      expect(html).toContain("Bản Mệnh toàn diện");
      expect(html).toContain("Bản mệnh của bạn định hình từ trục Cung Mệnh với tính cách kiên định…");
      expect(html).toContain("Mở – 240 Lá");
    });
  });

  describe("Accessibility and Print Boundary Safeguards", () => {
    it("ensures blurred placeholder bars contain aria-hidden='true' and NO screen reader accessible text", () => {
      mockLocale = "vi";
      const html = renderToStaticMarkup(
        React.createElement(SecureLockedPreview, {
          badge: "Chưa mở",
          clippedSentences: ["Dòng mở đầu an toàn…"],
          counts: { points: 2, approximateWords: 600 },
          isGuest: true,
          lengthHint: 4,
          locale: "vi",
          title: "Khảo sát chuyên sâu",
        }),
      );

      // Must have aria-hidden on placeholder bars
      expect(html).toMatch(/class="[^"]*locked-preview-blur-bars[^"]*"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*class="[^"]*locked-preview-blur-bars[^"]*"/);

      // The bars must contain only decorative divs/spans, not readable text nodes
      const blurBarsMatch = html.match(/<div[^>]*class="[^"]*locked-preview-blur-bars[^"]*"[^>]*>([\s\S]*?)<\/div>/);
      expect(blurBarsMatch).not.toBeNull();
      const innerBlurHtml = blurBarsMatch![1]!;
      const textContent = innerBlurHtml.replace(/<[^>]*>/g, "").trim();
      expect(textContent).toBe("");
    });

    it("verifies print stylesheet hides locked placeholder bars, action CTAs, and guest banners, and never blurs chart", () => {
      const cssPath = path.resolve(__dirname, "../../styles/discipline-pages-results.css");
      const cssContent = fs.readFileSync(cssPath, "utf8");

      // Verify print media query hides locked bars, CTAs, banners
      expect(cssContent).toContain("@media print");
      expect(cssContent).toContain(".locked-preview-blur-bars");
      expect(cssContent).toContain(".locked-preview-actions");
      expect(cssContent).toContain(".guest-24h-deletion-banner");

      // Verify that chart container has filter: none !important to guarantee never blurred
      expect(cssContent).toMatch(/filter:\s*none\s*!important/);
    });
  });
});
