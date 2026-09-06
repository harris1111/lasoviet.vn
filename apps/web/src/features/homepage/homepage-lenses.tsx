import React from "react";
import Link from "next/link";

import { localizedPath } from "./homepage-utilities";

type HomepageLensesProps = {
  locale: "en" | "vi";
};

type LensIconName =
  | "arrow-right"
  | "calendar-day"
  | "elements"
  | "hash"
  | "hexagram"
  | "map-pin"
  | "orbit"
  | "star"
  | "trien";

function renderLensSvg(name: LensIconName) {
  const common = {
    "aria-hidden": "true",
    className: "icon",
    viewBox: "0 0 24 24",
    focusable: "false",
  };

  switch (name) {
    case "arrow-right":
      return React.createElement(
        "svg",
        common,
        React.createElement("path", { d: "M3.5 12h17M13.5 5l7 7-7 7" }),
      );
    case "calendar-day":
      return React.createElement(
        "svg",
        common,
        React.createElement("rect", { x: "4", y: "5.5", width: "16", height: "14.5", rx: "2" }),
        React.createElement("path", { d: "M8.5 3.5v4M15.5 3.5v4M4 10.5h16M11.4 14.8h1.4" }),
      );
    case "elements":
      return React.createElement(
        "svg",
        common,
        React.createElement("circle", { cx: "12", cy: "4.2", r: "1.5" }),
        React.createElement("circle", { cx: "19", cy: "9.2", r: "1.5" }),
        React.createElement("circle", { cx: "16.3", cy: "17.5", r: "1.5" }),
        React.createElement("circle", { cx: "7.7", cy: "17.5", r: "1.5" }),
        React.createElement("circle", { cx: "5", cy: "9.2", r: "1.5" }),
        React.createElement("path", { d: "M12 5.7L18 9.3M17.9 10.6l-1.7 6M15.7 17.5H8.3M7.4 16.6l-1.7-6M6 9.3L11.6 5.6" }),
      );
    case "hash":
      return React.createElement(
        "svg",
        common,
        React.createElement("path", { d: "M9.5 3.5l-3 17M17.5 3.5l-3 17M4 9h16M3.2 15h16" }),
      );
    case "hexagram":
      return React.createElement(
        "svg",
        common,
        React.createElement("path", { d: "M4 6h16M4 10h7M13 10h7M4 14h16M4 18h7M13 18h7" }),
      );
    case "map-pin":
      return React.createElement(
        "svg",
        common,
        React.createElement("path", { d: "M12 20.8s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" }),
        React.createElement("circle", { cx: "12", cy: "9.8", r: "2.5" }),
      );
    case "orbit":
      return React.createElement(
        "svg",
        common,
        React.createElement("circle", { cx: "12", cy: "12", r: "2.1" }),
        React.createElement("ellipse", { cx: "12", cy: "12", rx: "9", ry: "4", transform: "rotate(-28 12 12)" }),
        React.createElement("circle", { cx: "20.1", cy: "7.7", r: "1.1", fill: "currentColor", stroke: "none" }),
      );
    case "star":
      return React.createElement(
        "svg",
        common,
        React.createElement("path", {
          d: "M12 3.5c0 4-1 6.5-4.5 8.5 3.5 2 4.5 4.5 4.5 8.5 0-4 1-6.5 4.5-8.5-3.5-2-4.5-4.5-4.5-8.5z",
        }),
      );
    case "trien":
      return React.createElement(
        "svg",
        common,
        React.createElement("rect", { x: "2.8", y: "2.8", width: "18.4", height: "18.4", rx: "1" }),
        React.createElement("rect", { x: "6.6", y: "6.6", width: "10.8", height: "10.8", rx: ".5" }),
      );
  }
}

const freeTools = [
  { href: "/ngay-tot", icon: "calendar-day" as const, labelVi: "Xem Ngày Tốt", labelEn: "Good days" },
  { href: "/12-con-giap", icon: "orbit" as const, labelVi: "12 Con Giáp", labelEn: "12 Zodiac signs" },
  { href: "/phong-thuy/huong-nha", icon: "map-pin" as const, labelVi: "Phong Thủy Hướng Nhà", labelEn: "House Feng Shui" },
  { href: "/giai-ma-giac-mo", icon: "star" as const, labelVi: "Giải Mã Giấc Mơ", labelEn: "Dream symbols" },
  { href: "/boi-bai", icon: "star" as const, labelVi: "Tarot / Bói Bài", labelEn: "Tarot reading" },
  { href: "/lich-am", icon: "calendar-day" as const, labelVi: "Lịch Âm", labelEn: "Lunar calendar" },
  { href: "/xem-chi-tay", icon: "trien" as const, labelVi: "Xem Chỉ Tay", labelEn: "Palmistry" },
] as const;

export function HomepageLenses({ locale }: HomepageLensesProps) {
  const isVietnamese = locale === "vi";

  return React.createElement(
    "div",
    { id: "dich-vu", className: "container lenses-section" },
    React.createElement(
      "div",
      { className: "section-heading" },
      React.createElement(
        "p",
        { className: "eyebrow" },
        isVietnamese ? "Dịch vụ" : "Services",
      ),
      React.createElement(
        "h2",
        null,
        isVietnamese
          ? "Một hồ sơ sinh duy nhất. Soi tỏ qua 5 lăng kính."
          : "A single birth profile. Illuminated through 5 lenses.",
      ),
      React.createElement(
        "p",
        { className: "section-lead" },
        isVietnamese
          ? "Nhập ngày giờ sinh một lần — hồ sơ của bạn được kích hoạt đồng thời qua 4 bộ môn nguyên bản. Kinh Dịch dùng câu hỏi riêng, không cần hồ sơ sinh."
          : "Enter your birth time once — your profile is activated across 4 original disciplines. I Ching uses dedicated questions without requiring a birth profile.",
      ),
    ),
    React.createElement(
      "div",
      { className: "lenses-grid" },
      // Card 1: Tu Vi
      React.createElement(
        "article",
        { className: "lens-card lens-active" },
        React.createElement("div", { className: "lens-icon-wrap" }, renderLensSvg("star")),
        React.createElement("h3", null, isVietnamese ? "Tử Vi Đẩu Số" : "Zi Wei Dou Shu"),
        React.createElement("p", { className: "lens-sub" }, isVietnamese ? "Tinh hoa Á Đông" : "Eastern mastery"),
        React.createElement(
          "p",
          { className: "lens-copy" },
          isVietnamese
            ? "Đồ hình 12 cung và đại vận 10 năm. Thấu suốt gốc rễ bản mệnh, các nút thắt then chốt và thời điểm chuyển mình."
            : "12-palace chart and 10-year major periods. Understand foundational destiny, key turning points, and life transitions.",
        ),
        React.createElement(
          Link,
          { className: "lens-link", href: localizedPath(locale, "/tao-la-so/tu-vi") },
          React.createElement("span", null, isVietnamese ? "Xem lá số Tử Vi" : "View Zi Wei chart"),
          renderLensSvg("arrow-right"),
        ),
      ),
      // Card 2: Bat Tu
      React.createElement(
        "article",
        { className: "lens-card lens-active" },
        React.createElement("div", { className: "lens-icon-wrap" }, renderLensSvg("elements")),
        React.createElement("h3", null, isVietnamese ? "Bát Tự / Tứ Trụ" : "BaZi / Four Pillars"),
        React.createElement("p", { className: "lens-sub" }, isVietnamese ? "Cân bằng ngũ hành" : "Five elements balance"),
        React.createElement(
          "p",
          { className: "lens-copy" },
          isVietnamese
            ? "Phân tích Kim – Mộc – Thủy – Hỏa – Thổ qua 4 trụ. Nhận diện điểm vượng – khuyết để thuận dòng tự nhiên, chọn thời lập nghiệp."
            : "Analyze the five elements across four pillars. Identify strengths and imbalances to align with natural flow.",
        ),
        React.createElement(
          Link,
          { className: "lens-link", href: localizedPath(locale, "/bat-tu") },
          React.createElement("span", null, isVietnamese ? "Khám phá Bát Tự" : "Explore BaZi"),
          renderLensSvg("arrow-right"),
        ),
      ),
      // Card 3: Astrology (Chiem Tinh / Ban do sao)
      React.createElement(
        "article",
        { className: "lens-card lens-active" },
        React.createElement("div", { className: "lens-icon-wrap" }, renderLensSvg("orbit")),
        React.createElement("h3", null, isVietnamese ? "Bản đồ sao" : "Natal Chart"),
        React.createElement("p", { className: "lens-sub" }, isVietnamese ? "Chiêm tinh phương Tây" : "Western astrology"),
        React.createElement(
          "p",
          { className: "lens-copy" },
          isVietnamese
            ? "Tâm lý học chiều sâu qua vị trí các thiên thể. Giải mã cấu trúc tính cách, xung đột nội tâm và động lực vô thức."
            : "Depth psychology through planetary positions, deciphering personality structure, inner conflicts, and subconscious drives.",
        ),
        React.createElement(
          Link,
          { className: "lens-link", href: localizedPath(locale, "/chiem-tinh") },
          React.createElement("span", null, isVietnamese ? "Khám phá Bản đồ sao" : "Explore Natal Chart"),
          renderLensSvg("arrow-right"),
        ),
      ),
      // Card 4: Numerology (Than So Hoc)
      React.createElement(
        "article",
        { className: "lens-card lens-active" },
        React.createElement("div", { className: "lens-icon-wrap" }, renderLensSvg("hash")),
        React.createElement("h3", null, isVietnamese ? "Thần Số Học" : "Numerology"),
        React.createElement("p", { className: "lens-sub" }, isVietnamese ? "Nhịp điệu đường đời" : "Life path rhythm"),
        React.createElement(
          "p",
          { className: "lens-copy" },
          isVietnamese
            ? "Tần số từ ngày sinh và tên gọi. Nhận diện bài học cần hoàn thiện và xu hướng biến chuyển từng năm."
            : "Vibrations from birth date and name, identifying lessons to master and year-by-year patterns.",
        ),
        React.createElement(
          Link,
          { className: "lens-link", href: localizedPath(locale, "/than-so-hoc") },
          React.createElement("span", null, isVietnamese ? "Khám phá Thần Số Học" : "Explore Numerology"),
          renderLensSvg("arrow-right"),
        ),
      ),
      // Card 5: I Ching (Kinh Dich)
      React.createElement(
        "article",
        { className: "lens-card lens-active" },
        React.createElement(
          "div",
          { className: "lens-icon-wrap" },
          renderLensSvg("hexagram"),
        ),
        React.createElement("h3", null, isVietnamese ? "Kinh Dịch" : "I Ching"),
        React.createElement("p", { className: "lens-sub" }, isVietnamese ? "Chu Dịch cổ truyền" : "Traditional Zhouyi"),
        React.createElement(
          "p",
          { className: "lens-copy" },
          isVietnamese
            ? "Đặt một câu hỏi thật, gieo một quẻ. Không cần hồ sơ sinh — chỉ cần câu hỏi và thời điểm gieo quẻ."
            : "Ask a sincere question and cast a hexagram. No birth profile required.",
        ),
        React.createElement(
          Link,
          { className: "lens-link", href: localizedPath(locale, "/kinh-dich") },
          React.createElement("span", null, isVietnamese ? "Khám phá Kinh Dịch" : "Explore I Ching"),
          renderLensSvg("arrow-right"),
        ),
      ),
    ),
    // Free tools strip
    React.createElement(
      "div",
      {
        className: "free-tools-strip",
        style: {
          marginTop: "56px",
          paddingTop: "40px",
          borderTop: "1px solid var(--lacquer-line, #3A3227)",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "24px",
            flexWrap: "wrap",
          },
        },
        React.createElement(
          "h3",
          {
            style: {
              margin: 0,
              fontSize: "22px",
              color: "var(--pearl-50, #F6F1E6)",
              fontFamily: "var(--font-display)",
            },
          },
          isVietnamese ? "Công cụ miễn phí" : "Free tools",
        ),
        React.createElement(
          Link,
          {
            href: localizedPath(locale, "/cong-cu-mien-phi"),
            style: {
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13.5px",
              color: "var(--gold-400, #C9A44D)",
              textDecoration: "none",
            },
          },
          React.createElement("span", null, isVietnamese ? "Xem tất cả" : "View all"),
          renderLensSvg("arrow-right"),
        ),
      ),
      React.createElement(
        "div",
        {
          className: "free-tools-grid",
          style: {
            marginTop: "24px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          },
        },
        freeTools.map((tool) =>
          React.createElement(
            Link,
            {
              key: tool.href,
              href: localizedPath(locale, tool.href),
              style: {
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "14px 16px",
                background: "var(--lacquer-800, #1C1813)",
                border: "1px solid var(--lacquer-line, #3A3227)",
                borderRadius: "8px",
                color: "var(--pearl-200, #DCD4C3)",
                textDecoration: "none",
                fontSize: "14px",
              },
            },
            renderLensSvg(tool.icon),
            React.createElement("span", null, isVietnamese ? tool.labelVi : tool.labelEn),
          ),
        ),
      ),
    ),
  );
}
