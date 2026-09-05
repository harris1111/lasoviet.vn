import React from "react";
import Link from "next/link";

export type GatedToolKind = "huong-nha" | "xem-chi-tay";

export type GatedToolPreviewProps = {
  kind: GatedToolKind;
  locale: "vi" | "en";
  className?: string;
};

type GatedContent = {
  status: string;
  title: string;
  notice: string;
  subnotice: string;
  ctaText: string;
  ctaHref: string;
};

const GATED_DATA: Record<GatedToolKind, Record<"vi" | "en", GatedContent>> = {
  "huong-nha": {
    vi: {
      status: "Đang chờ chốt phương pháp",
      title: "Phong Thủy Hướng Nhà",
      notice:
        "Trước khi công bố công cụ này, Lá Số Việt cần chốt đúng một trường phái và một bộ dữ liệu đầu vào/đầu ra cụ thể — thay vì gộp nhiều trường phái khác nhau vào một kết quả. Trang này sẽ có nội dung đầy đủ ngay khi quyết định đó được chốt.",
      subnotice:
        'Lá Số Việt không bán vật phẩm phong thuỷ, bùa hộ mệnh hay bất kỳ sản phẩm "hoá giải vận hạn" nào.',
      ctaText: "Lập lá số Tử Vi miễn phí",
      ctaHref: "/tu-vi",
    },
    en: {
      status: "Pending methodology finalization",
      title: "House Direction Feng Shui",
      notice:
        "Prior to releasing this tool, La So Viet requires settling on a single definitive lineage and a concrete input/output schema — rather than amalgamating contradictory schools into an opaque composite. This page will publish in full once that architectural baseline is locked.",
      subnotice:
        'La So Viet does not sell feng shui items, talismanic charms, or any superstitious "remedial misfortune" products.',
      ctaText: "Build free Zi Wei chart",
      ctaHref: "/en/tu-vi",
    },
  },
  "xem-chi-tay": {
    vi: {
      status: "Pilot đang chuẩn bị",
      title: "Xem Chỉ Tay",
      notice:
        "Xem Chỉ Tay dùng ảnh chụp bàn tay — một dạng dữ liệu sinh trắc học. Vì vậy, công cụ này cần cơ chế xin sự đồng ý riêng, chính sách xoá ảnh rõ ràng và hoàn tất trước khi mở, kể cả ở dạng thử nghiệm miễn phí. Trang này sẽ có nội dung đầy đủ khi các điều kiện đó sẵn sàng.",
      subnotice:
        "Sẽ không có phiên bản trả phí cho tới khi độ chính xác, quyền riêng tư và tỷ lệ khiếu nại được đánh giá qua giai đoạn thử nghiệm.",
      ctaText: "Lập lá số Tử Vi miễn phí",
      ctaHref: "/tu-vi",
    },
    en: {
      status: "Pilot in preparation",
      title: "Palmistry",
      notice:
        "Palmistry utilizes palm photography — a sensitive category of biometric data. Consequently, this utility requires explicit individual consent mechanisms, a verified image erasure policy, and complete compliance review prior to activation, even as a free pilot. Full documentation will publish once these governance criteria are verified.",
      subnotice:
        "No premium version will be introduced until empirical accuracy, biometric privacy safeguards, and user dispute metrics have undergone comprehensive evaluation.",
      ctaText: "Build free Zi Wei chart",
      ctaHref: "/en/tu-vi",
    },
  },
};

export function GatedToolPreview({ kind, locale, className }: GatedToolPreviewProps) {
  const isVi = locale === "vi";
  const content = GATED_DATA[kind]?.[locale] || GATED_DATA["huong-nha"][locale];

  const homeHref = isVi ? "/" : "/en";
  const tuviHref = isVi ? "/tu-vi" : "/en/tu-vi";
  const freeToolsHref = isVi ? "/cong-cu-mien-phi" : "/en/cong-cu-mien-phi";
  const kienthucHref = isVi ? "/kien-thuc" : "/en/kien-thuc";

  return (
    <div
      className={className}
      data-screen-label={kind}
      style={{
        colorScheme: "dark",
        backgroundColor: "#0F0D0A",
        color: "#DCD4C3",
        fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #3A3227",
          padding: "0 32px",
          height: "74px",
          display: "flex",
          alignItems: "center",
          gap: "40px",
          maxWidth: "1200px",
          width: "100%",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <Link
          href={homeHref}
          style={{
            fontFamily: '"Source Serif 4", Georgia, serif',
            fontSize: "20px",
            color: "#F6F1E6",
            textDecoration: "none",
          }}
        >
          {isVi ? "Lá Số Việt" : "La So Viet"}
        </Link>
        <nav style={{ display: "flex", gap: "24px", fontSize: "14px", flexWrap: "wrap" }}>
          <Link href={homeHref} style={{ color: "#DCD4C3", textDecoration: "none" }}>
            {isVi ? "Trang chủ" : "Home"}
          </Link>
          <Link href={tuviHref} style={{ color: "#DCD4C3", textDecoration: "none" }}>
            {isVi ? "Tử Vi" : "Zi Wei"}
          </Link>
          <Link href={kienthucHref} style={{ color: "#DCD4C3", textDecoration: "none" }}>
            {isVi ? "Kiến thức" : "Knowledge"}
          </Link>
          <Link
            href={freeToolsHref}
            style={{
              color: "#F2DCA0",
              borderBottom: "1px solid #C9A44D",
              paddingBottom: "2px",
              textDecoration: "none",
            }}
          >
            {isVi ? "Công cụ miễn phí" : "Free tools"}
          </Link>
        </nav>
      </header>

      <main
        style={{
          maxWidth: "680px",
          margin: "0 auto",
          padding: "120px 32px",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: "12px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#C9A44D",
          }}
        >
          {content.status}
        </div>

        <h1
          style={{
            margin: "18px 0 0",
            fontFamily: '"Source Serif 4", Georgia, serif',
            fontWeight: 400,
            fontSize: "32px",
            lineHeight: 1.25,
            color: "#F6F1E6",
          }}
        >
          {content.title}
        </h1>

        <p
          style={{
            margin: "16px 0 0",
            fontSize: "16px",
            lineHeight: 1.75,
            color: "#A79E8B",
          }}
        >
          {content.notice}
        </p>

        <p
          style={{
            margin: "16px 0 0",
            fontSize: "14px",
            lineHeight: 1.7,
            color: "#6E6656",
          }}
        >
          {content.subnotice}
        </p>

        {/* Unavailable action placeholder showing explicitly disabled state */}
        <div
          style={{
            marginTop: "24px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "4px",
            background: "rgba(58, 50, 39, 0.4)",
            border: "1px dashed #3A3227",
            color: "#6E6656",
            fontSize: "13px",
            fontFamily: '"JetBrains Mono", monospace',
          }}
          aria-disabled="true"
        >
          <span>[ {isVi ? "Tính năng chưa mở" : "Feature unavailable"} ]</span>
        </div>

        <div style={{ marginTop: "32px" }}>
          <Link
            href={content.ctaHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "44px",
              padding: "0 24px",
              borderRadius: "4px",
              background: "linear-gradient(103deg, #9A7730 0%, #F2DCA0 34%, #C9A44D 58%, #A8842F 100%)",
              color: "#0F0D0A",
              fontWeight: 600,
              fontSize: "14.5px",
              textDecoration: "none",
            }}
          >
            {content.ctaText}
          </Link>
        </div>
      </main>

      <footer
        style={{
          borderTop: "1px solid #3A3227",
          marginTop: "80px",
          padding: "32px",
          textAlign: "center",
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: "11.5px",
          color: "#6E6656",
        }}
      >
        {isVi ? "© 2026 Lá Số Việt · lasoviet.vn" : "© 2026 La So Viet · lasoviet.vn"}
      </footer>
    </div>
  );
}

export default GatedToolPreview;
