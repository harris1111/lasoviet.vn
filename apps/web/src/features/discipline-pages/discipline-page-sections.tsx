import React from "react";
import Link from "next/link";
import type {
  DisciplineFaqItem,
  DisciplineFreeItem,
  DisciplineGlossaryItem,
  DisciplineHeroContent,
  DisciplineMethodRow,
  DisciplinePageContent,
} from "./discipline-page-model";

export type DisciplineHeroSectionProps = {
  hero: DisciplineHeroContent;
  disciplineName: string;
  homeHref?: string;
  homeLabel?: string;
  rightCardContent?: React.ReactNode;
};

export function DisciplineHeroSection({
  hero,
  disciplineName,
  homeHref = "/",
  homeLabel = "Trang ch\u1EE7",
  rightCardContent,
}: DisciplineHeroSectionProps) {
  return React.createElement(
    "section",
    { className: "discipline-hero", "data-screen-label": "01-hero" },
    React.createElement(
      "div",
      { className: "discipline-container" },
      React.createElement(
        "nav",
        { className: "discipline-breadcrumb", "aria-label": "Breadcrumb" },
        React.createElement(Link, { href: homeHref }, homeLabel),
        React.createElement("span", { "aria-hidden": "true" }, " / "),
        React.createElement("span", null, disciplineName),
      ),
      React.createElement(
        "div",
        { className: "discipline-hero-grid" },
        React.createElement(
          "div",
          null,
          React.createElement("div", { className: "discipline-badge" }, hero.eyebrow),
          React.createElement("h1", { className: "discipline-hero-title" }, hero.title),
          React.createElement("p", { className: "discipline-hero-subtitle" }, hero.subtitle),
          hero.note && React.createElement("p", { className: "discipline-hero-note" }, hero.note),
          React.createElement(
            "div",
            { className: "discipline-hero-cta" },
            React.createElement(
              Link,
              { className: "button", href: hero.ctaPrimaryHref },
              hero.ctaPrimaryText,
            ),
            hero.ctaSecondaryHref &&
              React.createElement(
                Link,
                { className: "discipline-hero-secondary-link", href: hero.ctaSecondaryHref },
                hero.ctaSecondaryText,
                React.createElement("span", { "aria-hidden": "true" }, " \u2192"),
              ),
          ),
          hero.previewDisclaimer &&
            React.createElement(
              "p",
              { className: "discipline-hero-disclaimer" },
              hero.previewDisclaimer,
            ),
        ),
        React.createElement(
          "div",
          { className: "discipline-hero-card" },
          React.createElement(
            "div",
            { className: "discipline-hero-card-header" },
            React.createElement("span", { className: "discipline-hero-card-title" }, hero.previewBadge),
          ),
          rightCardContent || null,
        ),
      ),
    ),
  );
}

export type DisciplineFreeValueSectionProps = {
  eyebrow: string;
  title: string;
  items: readonly DisciplineFreeItem[];
};

export function DisciplineFreeValueSection({
  eyebrow,
  title,
  items,
}: DisciplineFreeValueSectionProps) {
  return React.createElement(
    "section",
    { className: "discipline-free-value-section", "data-screen-label": "02-nhan-duoc-gi" },
    React.createElement(
      "div",
      { className: "discipline-container" },
      React.createElement("div", { className: "discipline-section-eyebrow" }, eyebrow),
      React.createElement("h2", { className: "discipline-section-title" }, title),
      React.createElement(
        "div",
        { className: "discipline-free-value-grid" },
        items.map((item) =>
          React.createElement(
            "div",
            { key: item.num, className: "discipline-trust-item" },
            React.createElement("div", { className: "discipline-trust-num" }, item.num),
            React.createElement("div", { className: "discipline-trust-title" }, item.title),
            React.createElement("p", { className: "discipline-trust-body" }, item.body),
          ),
        ),
      ),
    ),
  );
}

export type DisciplineSampleResultSectionProps = {
  eyebrow: string;
  title: string;
  note: string;
  subnote?: string;
  sectionId?: string;
  children?: React.ReactNode;
};

export function DisciplineSampleResultSection({
  eyebrow,
  title,
  note,
  subnote,
  sectionId = "sample-result",
  children,
}: DisciplineSampleResultSectionProps) {
  return React.createElement(
    "section",
    { id: sectionId, className: "discipline-sample-section", "data-screen-label": "03-sample-result" },
    React.createElement(
      "div",
      { className: "discipline-container" },
      React.createElement("div", { className: "discipline-section-eyebrow" }, eyebrow),
      React.createElement("h2", { className: "discipline-section-title" }, title),
      note && React.createElement("p", { className: "discipline-sample-desc" }, note),
      children,
      subnote && React.createElement("p", { className: "discipline-sample-subnote" }, subnote),
    ),
  );
}

export type DisciplineGlossarySectionProps = {
  eyebrow: string;
  title: string;
  items: readonly DisciplineGlossaryItem[];
};

export function DisciplineGlossarySection({
  eyebrow,
  title,
  items,
}: DisciplineGlossarySectionProps) {
  return React.createElement(
    "section",
    { className: "discipline-glossary-section", "data-screen-label": "04-thuat-ngu" },
    React.createElement(
      "div",
      { className: "discipline-container" },
      React.createElement("div", { className: "discipline-section-eyebrow" }, eyebrow),
      React.createElement("h2", { className: "discipline-section-title" }, title),
      React.createElement(
        "div",
        { className: "discipline-glossary-grid" },
        items.map((item) =>
          React.createElement(
            "div",
            { key: item.term, className: "discipline-glossary-card" },
            React.createElement("div", { className: "discipline-glossary-term" }, item.term),
            React.createElement("p", { className: "discipline-glossary-body" }, item.body),
          ),
        ),
      ),
    ),
  );
}

export type DisciplineMethodSectionProps = {
  eyebrow: string;
  title: string;
  note?: string;
  rows: readonly DisciplineMethodRow[];
  footnote?: string;
  sectionId?: string;
};

export function DisciplineMethodSection({
  eyebrow,
  title,
  note,
  rows,
  footnote,
  sectionId = "cach-tinh",
}: DisciplineMethodSectionProps) {
  return React.createElement(
    "section",
    { id: sectionId, className: "discipline-method-section", "data-screen-label": "05-cach-tinh" },
    React.createElement(
      "div",
      { className: "discipline-container" },
      React.createElement("div", { className: "discipline-section-eyebrow" }, eyebrow),
      React.createElement("h2", { className: "discipline-section-title" }, title),
      note && React.createElement("p", { className: "discipline-sample-desc" }, note),
      React.createElement(
        "div",
        { className: "discipline-method-table" },
        rows.map((row) =>
          React.createElement(
            "div",
            { key: row.label, className: "discipline-method-row" },
            React.createElement("span", { className: "discipline-method-label" }, row.label),
            React.createElement("span", { className: "discipline-method-val" }, row.value),
          ),
        ),
      ),
      footnote && React.createElement("p", { className: "discipline-method-footnote" }, footnote),
    ),
  );
}

export type DisciplineLimitationsSectionProps = {
  eyebrow: string;
  title: string;
  items: readonly string[];
};

export function DisciplineLimitationsSection({
  eyebrow,
  title,
  items,
}: DisciplineLimitationsSectionProps) {
  return React.createElement(
    "section",
    { className: "discipline-limitations-section", "data-screen-label": "06-gioi-han" },
    React.createElement(
      "div",
      { className: "discipline-container discipline-limitations-grid" },
      React.createElement(
        "div",
        null,
        React.createElement("div", { className: "discipline-section-eyebrow" }, eyebrow),
        React.createElement("h2", { className: "discipline-section-title" }, title),
      ),
      React.createElement(
        "ul",
        { className: "discipline-limitations-list" },
        items.map((item, i) =>
          React.createElement(
            "li",
            { key: i, className: "discipline-limitations-item" },
            React.createElement("span", { "aria-hidden": "true" }, "\u203A "),
            React.createElement("span", null, item),
          ),
        ),
      ),
    ),
  );
}

export type DisciplineKnowledgeFaqSectionProps = {
  eyebrow: string;
  title: string;
  note?: string;
  linkText?: string;
  linkHref?: string;
  faqHeading: string;
  faqs: readonly DisciplineFaqItem[];
  ctaHeading: string;
  ctaBody: string;
  ctaButtonText: string;
  ctaButtonHref: string;
};

export function DisciplineKnowledgeFaqSection({
  eyebrow,
  title,
  note,
  linkText,
  linkHref,
  faqHeading,
  faqs,
  ctaHeading,
  ctaBody,
  ctaButtonText,
  ctaButtonHref,
}: DisciplineKnowledgeFaqSectionProps) {
  return React.createElement(
    "section",
    { className: "discipline-knowledge-faq-section", "data-screen-label": "07-kien-thuc-faq" },
    React.createElement(
      "div",
      { className: "discipline-container" },
      React.createElement("div", { className: "discipline-section-eyebrow" }, eyebrow),
      React.createElement("h2", { className: "discipline-section-title" }, title),
      note && React.createElement("p", { className: "discipline-sample-desc" }, note),
      linkText &&
        linkHref &&
        React.createElement(
          "div",
          { style: { marginTop: "28px" } },
          React.createElement(
            Link,
            { href: linkHref, style: { color: "var(--discipline-accent, var(--accent-gold))" } },
            linkText,
            " \u2192",
          ),
        ),
      React.createElement(
        "h2",
        { className: "discipline-section-title", style: { marginTop: "80px" } },
        faqHeading,
      ),
      React.createElement(
        "div",
        { className: "discipline-faq-list" },
        faqs.map((f) =>
          React.createElement(
            "details",
            { key: f.num, className: "discipline-faq-item" },
            React.createElement(
              "summary",
              { className: "discipline-faq-summary" },
              f.q,
              React.createElement("span", { "aria-hidden": "true" }, "+"),
            ),
            React.createElement("p", { className: "discipline-faq-answer" }, f.a),
          ),
        ),
      ),
      React.createElement(
        "div",
        { className: "discipline-conversion-card" },
        React.createElement(
          "div",
          { style: { maxWidth: "520px" } },
          React.createElement("h3", { className: "discipline-conversion-heading" }, ctaHeading),
          React.createElement("p", { className: "discipline-conversion-body" }, ctaBody),
        ),
        React.createElement(
          Link,
          { className: "button", href: ctaButtonHref },
          ctaButtonText,
        ),
      ),
    ),
  );
}

export type DisciplineFooterProps = {
  locale: "vi" | "en";
  disciplineTitle: string;
};

export function DisciplineFooter({ locale, disciplineTitle }: DisciplineFooterProps) {
  const isVi = locale === "vi";
  return React.createElement(
    "footer",
    { className: "discipline-footer", "data-screen-label": "footer" },
    React.createElement(
      "div",
      { className: "discipline-container" },
      React.createElement(
        "div",
        { className: "discipline-footer-grid" },
        React.createElement(
          "div",
          null,
          React.createElement("div", { className: "discipline-footer-brand" }, isVi ? "L\u00E1 S\u1ED1 Vi\u1EC7t" : "La So Viet"),
          React.createElement(
            "p",
            { className: "discipline-footer-desc" },
            isVi
              ? "Th\u01B0 vi\u1EC7n tri th\u1EE9c Vi\u1EC7t \u0111\u01B0\u01A1ng \u0111\u1EA1i \u2014 l\u1EADp v\u00E0 lu\u1EADn gi\u1EA3i l\u00E1 s\u1ED1 d\u1EF1a tr\u00EAn d\u1EEF li\u1EC7u v\u00E0 ph\u01B0\u01A1ng ph\u00E1p c\u00F3 th\u1EC3 ki\u1EC3m ch\u1EE9ng."
              : "Contemporary Vietnamese knowledge library \u2014 verifiable calculations and clear interpretive evidence.",
          ),
        ),
        React.createElement(
          "div",
          null,
          React.createElement("div", { className: "discipline-footer-heading" }, isVi ? "S\u1EA2N PH\u1EA8M" : "PRODUCTS"),
          React.createElement(
            "div",
            { className: "discipline-footer-links" },
            React.createElement(Link, { href: isVi ? "/tu-vi" : "/en/tu-vi" }, isVi ? "L\u1EADp l\u00E1 s\u1ED1 T\u1EED Vi" : "Build Zi Wei chart"),
            React.createElement(Link, { href: isVi ? "/kien-thuc" : "/en/kien-thuc" }, isVi ? "Ki\u1EBFn th\u1EE9c" : "Knowledge"),
            React.createElement(Link, { href: isVi ? "/cong-cu-mien-phi" : "/en/cong-cu-mien-phi" }, isVi ? "C\u00F4ng c\u1EE5 mi\u1EC5n ph\u00ED" : "Free tools"),
          ),
        ),
        React.createElement(
          "div",
          null,
          React.createElement("div", { className: "discipline-footer-heading" }, isVi ? "PH\u00C1P L\u00DD" : "LEGAL"),
          React.createElement(
            "div",
            { className: "discipline-footer-links" },
            React.createElement(Link, { href: isVi ? "/dieu-khoan" : "/en/dieu-khoan" }, isVi ? "\u0110i\u1EC1u kho\u1EA3n s\u1EED d\u1EE5ng" : "Terms of use"),
            React.createElement(Link, { href: isVi ? "/quyen-rieng-tu" : "/en/quyen-rieng-tu" }, isVi ? "Quy\u1EC1n ri\u00EAng t\u01B0" : "Privacy"),
          ),
        ),
      ),
      React.createElement(
        "div",
        { className: "discipline-footer-bottom" },
        React.createElement(
          "span",
          null,
          isVi
            ? "\u00A9 2026 L\u00E1 S\u1ED1 Vi\u1EC7t. N\u1ED9i dung tham kh\u1EA3o v\u0103n ho\u00E1, kh\u00F4ng thay th\u1EBF t\u01B0 v\u1EA5n chuy\u00EAn m\u00F4n."
            : "\u00A9 2026 La So Viet. Cultural reference content, not a substitute for professional counsel.",
        ),
        React.createElement(
          "span",
          null,
          disciplineTitle + (isVi ? ": \u0111ang x\u00E2y d\u1EF1ng \u2014 ch\u01B0a c\u00F3 phi\u00EAn b\u1EA3n ch\u00EDnh th\u1EE9c" : ": in development \u2014 preview only"),
        ),
      ),
    ),
  );
}