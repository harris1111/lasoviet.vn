"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "../../components/site-header";
import type { FreeToolsHubPageModel, ToolCardItem } from "./free-tools-page-model";

function HubIcon({ name, color }: { name: string; color?: string }) {
  const strokeColor = color || "currentColor";
  switch (name) {
    case "calendar-day":
      return (
        <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" focusable="false" style={{ color: strokeColor, width: 26, height: 26 }}>
          <rect x="4" y="5.5" width="16" height="14.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8.5 3.5v4M15.5 3.5v4M4 10.5h16" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M11.4 14.8h1.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case "compass":
      return (
        <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" focusable="false" style={{ color: strokeColor, width: 26, height: 26 }}>
          <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M15 9l-2.1 5.2-5.2 2.1 2.1-5.2L15 9z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "map-pin":
      return (
        <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" focusable="false" style={{ color: strokeColor, width: 26, height: 26 }}>
          <path d="M12 20.8s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="9.8" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case "book-open":
      return (
        <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" focusable="false" style={{ color: strokeColor, width: 26, height: 26 }}>
          <path d="M12 6.6C10.5 5.1 8.4 4.5 5 4.5v13c3.4 0 5.5.6 7 2 1.5-1.4 3.6-2 7-2v-13c-3.4 0-5.5.6-7 2.1z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 6.6v12.9" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case "scroll":
      return (
        <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" focusable="false" style={{ color: strokeColor, width: 26, height: 26 }}>
          <path d="M7 4h11.5v13a3 3 0 0 0 3 3H8a3 3 0 0 1-3-3V6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M9.5 8.4h6.5M9.5 12.2h6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case "user-circle":
      return (
        <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" focusable="false" style={{ color: strokeColor, width: 26, height: 26 }}>
          <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="10" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M6.6 18.6c1.2-2 3.1-3.1 5.4-3.1s4.2 1.1 5.4 3.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case "shield-lock":
      return (
        <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" focusable="false" style={{ color: strokeColor, width: 28, height: 28 }}>
          <path d="M12 3l7.5 3v5.6c0 4.4-3.2 7.1-7.5 8.4-4.3-1.3-7.5-4-7.5-8.4V6L12 3z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10 12.6h4v3h-4z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10.9 12.6v-1.2a1.1 1.1 0 0 1 2.2 0v1.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" focusable="false" style={{ color: strokeColor, width: 14, height: 14 }}>
          <path d="M9 5.5l6.5 6.5L9 18.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" focusable="false" style={{ color: strokeColor, width: 20, height: 20 }}>
          <path d="M5.5 9l6.5 6.5L18.5 9" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    default:
      return null;
  }
}

export type FreeToolsHubProps = {
  model: FreeToolsHubPageModel;
};

export function FreeToolsHub({ model }: FreeToolsHubProps) {
  const { content, locale, slug } = model;
  const isVi = locale === "vi";
  const [openFaq, setOpenFaq] = useState<Record<number, boolean>>({ 0: true });

  const toggleFaq = (index: number) => {
    setOpenFaq((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div
      className="free-tools-hub-root"
      data-screen-label="cong-cu-mien-phi"
      style={{
        fontFamily: "var(--font-ui)",
        color: "var(--text-body)",
        minHeight: "100vh",
        backgroundColor: "var(--surface-canvas)",
      }}
    >
      <SiteHeader
        locale={locale}
        variant="discipline"
        currentPath={isVi ? slug : `/en${slug}`}
        accentColor="var(--gold-400)"
      />

      <main>
        {/* 01 HERO */}
        <section
          style={{ padding: "clamp(48px, 8vw, 88px) 0 clamp(48px, 7vw, 72px)" }}
          data-screen-label="01-hero"
        >
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <nav
              aria-label="Breadcrumb"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13.5px",
                color: "var(--text-faint)",
                marginBottom: "32px",
              }}
            >
              <Link href={isVi ? "/" : "/en"} style={{ color: "var(--text-faint)", textDecoration: "none" }}>
                {content.breadcrumbHome}
              </Link>
              <span style={{ display: "inline-flex", color: "var(--text-faint)" }}>
                <HubIcon name="chevron-right" color="var(--text-faint)" />
              </span>
              <span style={{ color: "var(--text-muted)" }}>{content.breadcrumbCurrent}</span>
            </nav>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11.5px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--gold-600)",
              }}
            >
              {content.eyebrow}
            </div>
            <h1
              style={{
                margin: "16px 0 0",
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                fontSize: "clamp(32px, 4.2vw, 44px)",
                lineHeight: 1.15,
                color: "var(--text-heading)",
                maxWidth: "680px",
              }}
            >
              {content.title}
            </h1>
            <p
              style={{
                margin: "20px 0 0",
                maxWidth: "600px",
                fontSize: "18px",
                lineHeight: 1.6,
                color: "var(--text-body)",
              }}
            >
              {content.description}
            </p>
          </div>
        </section>

        {/* 02 LƯỚI 7 CÔNG CỤ */}
        <section
          style={{ padding: "0 0 clamp(56px, 9vw, 96px)" }}
          data-screen-label="02-luoi-cong-cu"
        >
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "24px",
              }}
            >
              {content.tools.map((t: ToolCardItem) => (
                <Link
                  key={t.key}
                  href={t.href}
                  className="tool-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    background: "var(--surface-panel)",
                    border: "1px solid var(--border-hairline)",
                    borderRadius: "var(--radius-lg, 8px)",
                    padding: "28px",
                    textDecoration: "none",
                    transition: "border-color 120ms ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <HubIcon name={t.icon} color={t.color} />
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: t.color,
                        border: `1px solid ${t.color}`,
                        borderRadius: "var(--radius-pill, 9999px)",
                        padding: "2px 9px",
                        opacity: 0.85,
                      }}
                    >
                      {t.status}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "19px",
                      color: "var(--text-heading)",
                    }}
                  >
                    {t.title}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      lineHeight: 1.6,
                      color: "var(--text-muted)",
                      flex: 1,
                    }}
                  >
                    {t.body}
                  </p>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "13.5px",
                      color: "var(--text-body)",
                    }}
                  >
                    {t.cta}
                    <HubIcon name="chevron-right" color="var(--text-body)" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 03 GHI CHÚ */}
        <section
          style={{
            padding: "clamp(48px, 8vw, 80px) 0",
            background: "var(--surface-deep)",
            borderTop: "1px solid var(--border-hairline)",
            borderBottom: "1px solid var(--border-hairline)",
          }}
          data-screen-label="03-ghi-chu"
        >
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "0 clamp(20px, 5vw, 32px)",
              display: "grid",
              gridTemplateColumns: "minmax(0, 0.6fr) minmax(0, 1fr)",
              gap: "48px",
              alignItems: "start",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <HubIcon name="shield-lock" color="var(--gold-500)" />
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontWeight: 400,
                  fontSize: "clamp(22px, 2.6vw, 26px)",
                  color: "var(--text-heading)",
                }}
              >
                {content.principles.heading}
              </h2>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "14px" }}>
              {content.principles.items.map((item, idx) => (
                <li
                  key={idx}
                  style={{
                    display: "flex",
                    gap: "12px",
                    fontSize: "15px",
                    lineHeight: 1.6,
                    color: "var(--text-body)",
                  }}
                >
                  <span style={{ flex: "none", marginTop: "3px", display: "inline-flex" }}>
                    <HubIcon name="chevron-right" color="var(--text-faint)" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 04 FAQ + CTA */}
        <section
          style={{ padding: "clamp(56px, 9vw, 96px) 0" }}
          data-screen-label="04-faq-cta"
        >
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                fontSize: "clamp(26px, 3.2vw, 34px)",
                color: "var(--text-heading)",
              }}
            >
              {content.faqHeading}
            </h2>
            <div style={{ marginTop: "24px", maxWidth: "760px" }}>
              {content.faqs.map((f, i) => {
                const isOpen = !!openFaq[i];
                return (
                  <div
                    key={f.num}
                    style={{ borderBottom: "1px solid var(--border-hairline)" }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(i)}
                      style={{
                        width: "100%",
                        minHeight: "44px",
                        padding: "24px 0",
                        display: "flex",
                        alignItems: "baseline",
                        gap: "20px",
                        background: "none",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        color: "var(--text-heading)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "12px",
                          color: "var(--gold-600)",
                          flex: "none",
                        }}
                      >
                        {f.num}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontFamily: "var(--font-display)",
                          fontSize: "20px",
                          lineHeight: 1.4,
                        }}
                      >
                        {f.q}
                      </span>
                      <span
                        style={{
                          flex: "none",
                          transition: "transform 220ms ease",
                          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                          display: "inline-flex",
                        }}
                      >
                        <HubIcon name="chevron-down" color="var(--accent-gold)" />
                      </span>
                    </button>
                    {isOpen && (
                      <p
                        style={{
                          margin: 0,
                          padding: "0 44px 26px",
                          maxWidth: "720px",
                          fontSize: "16px",
                          lineHeight: 1.7,
                          color: "var(--text-body)",
                        }}
                      >
                        {f.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: "80px",
                padding: "56px",
                background: "var(--surface-panel)",
                border: "1px solid var(--border-hairline)",
                borderRadius: "var(--radius-lg, 8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "32px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ maxWidth: "520px" }}>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontWeight: 400,
                    fontSize: "clamp(24px, 2.8vw, 30px)",
                    color: "var(--text-heading)",
                  }}
                >
                  {content.conversion.heading}
                </h2>
                <p
                  style={{
                    margin: "12px 0 0",
                    fontSize: "15px",
                    lineHeight: 1.6,
                    color: "var(--text-muted)",
                  }}
                >
                  {content.conversion.body}
                </p>
              </div>
              <Link
                href={content.conversion.buttonHref}
                className="button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: "48px",
                  padding: "0 28px",
                  borderRadius: "var(--radius-sm, 4px)",
                  background: "linear-gradient(103deg, #9A7730 0%, #F2DCA0 34%, #C9A44D 58%, #A8842F 100%)",
                  color: "#0F0D0A",
                  fontWeight: 600,
                  fontSize: "15px",
                  textDecoration: "none",
                }}
              >
                {content.conversion.buttonText}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: "1px solid var(--border-hairline)",
          padding: "64px 0 40px",
        }}
        data-screen-label="footer"
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr)",
              gap: "48px",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "20px",
                  color: "var(--text-heading)",
                }}
              >
                {isVi ? "Lá Số Việt" : "La So Viet"}
              </div>
              <p
                style={{
                  margin: "12px 0 0",
                  maxWidth: "320px",
                  fontSize: "13.5px",
                  lineHeight: 1.65,
                  color: "var(--text-faint)",
                }}
              >
                {isVi
                  ? "Thư viện tri thức Việt đương đại — lập và luận giải lá số dựa trên dữ liệu và phương pháp có thể kiểm chứng."
                  : "Contemporary Vietnamese knowledge library — verifiable calculations and clear interpretive evidence."}
              </p>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                {isVi ? "Sản phẩm" : "Products"}
              </div>
              <div style={{ marginTop: "14px", display: "grid", gap: "10px", fontSize: "14px" }}>
                <Link href={isVi ? "/tu-vi" : "/en/tu-vi"} style={{ color: "var(--text-body)", textDecoration: "none" }}>
                  {isVi ? "Lập lá số Tử Vi" : "Build Zi Wei chart"}
                </Link>
                <Link href={isVi ? "/cong-cu-mien-phi" : "/en/cong-cu-mien-phi"} style={{ color: "var(--text-body)", textDecoration: "none" }}>
                  {isVi ? "Công cụ miễn phí" : "Free tools"}
                </Link>
                <Link href={isVi ? "/kien-thuc" : "/en/kien-thuc"} style={{ color: "var(--text-body)", textDecoration: "none" }}>
                  {isVi ? "Kiến thức" : "Knowledge"}
                </Link>
              </div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                {isVi ? "Pháp lý" : "Legal"}
              </div>
              <div style={{ marginTop: "14px", display: "grid", gap: "10px", fontSize: "14px" }}>
                <Link href={isVi ? "/dieu-khoan" : "/en/dieu-khoan"} style={{ color: "var(--text-body)", textDecoration: "none" }}>
                  {isVi ? "Điều khoản sử dụng" : "Terms of use"}
                </Link>
                <Link href={isVi ? "/quyen-rieng-tu" : "/en/quyen-rieng-tu"} style={{ color: "var(--text-body)", textDecoration: "none" }}>
                  {isVi ? "Quyền riêng tư" : "Privacy"}
                </Link>
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: "48px",
              paddingTop: "24px",
              borderTop: "1px solid var(--border-hairline)",
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "12.5px", color: "var(--text-faint)" }}>
              {isVi
                ? "© 2026 Lá Số Việt. Nội dung tham khảo văn hoá, không thay thế tư vấn chuyên môn."
                : "© 2026 La So Viet. Cultural reference content, not a substitute for professional counsel."}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
