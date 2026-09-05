import React from "react";
import { SiteHeader } from "../../components/site-header";
import type { DisciplinePageModel } from "./discipline-page-model";
import {
  DisciplineFooter,
  DisciplineFreeValueSection,
  DisciplineGlossarySection,
  DisciplineHeroSection,
  DisciplineKnowledgeFaqSection,
  DisciplineLimitationsSection,
  DisciplineMethodSection,
  DisciplineSampleResultSection,
} from "./discipline-page-sections";
import { DisciplineResultPreview } from "./discipline-result-preview";

export type DisciplinePageShellProps = {
  model: DisciplinePageModel;
  children?: React.ReactNode;
};

const SAMPLE_RESULT_ANCHORS: Record<string, string> = {
  "bat-tu": "tu-tru-mau",
  "kinh-dich": "que-mau",
  "chiem-tinh": "ban-do-sao-mau",
  "than-so-hoc": "vi-du-tinh",
};

const METHOD_ANCHORS: Record<string, string> = {
  "bat-tu": "cach-tinh",
  "kinh-dich": "cach-gieo-que",
  "chiem-tinh": "cach-tinh",
  "than-so-hoc": "cach-tinh",
};

export function DisciplinePageShell({ model, children }: DisciplinePageShellProps) {
  const { key, locale, theme, content, preview, methodRows, limitations, faqs, glossary, freeValueItems } = model;
  const isVi = locale === "vi";
  const currentPath = isVi ? model.slug : "/en" + model.slug;
  const sampleResultAnchor = SAMPLE_RESULT_ANCHORS[key] || "sample-result";
  const methodAnchor = METHOD_ANCHORS[key] || "cach-tinh";

  return React.createElement(
    "div",
    {
      className: "discipline-page-root",
      "data-discipline": key,
      "data-screen-label": theme.screenLabel,
      style: {
        "--discipline-accent": theme.accentColor,
        "--discipline-accent-deep": theme.accentDeep,
        "--discipline-accent-tint": theme.accentTint,
      } as React.CSSProperties,
    },
    React.createElement(SiteHeader, {
      locale,
      variant: "discipline",
      currentPath,
      accentColor: theme.accentColor,
    }),
    content.marquee && content.marquee.length > 0 &&
      React.createElement(
        "div",
        {
          style: {
            borderBottom: "1px solid var(--border-hairline)",
            background: "var(--surface-deep)",
            overflow: "hidden",
            padding: "12px 0",
          },
          "aria-hidden": "true",
        },
        React.createElement(
          "div",
          { className: "ls-marquee-track" },
          content.marquee.map((text, i) =>
            React.createElement("span", { key: i }, text),
          ),
        ),
      ),
    React.createElement(
      "main",
      null,
      React.createElement(DisciplineHeroSection, {
        hero: content.hero,
        disciplineName: content.hero.title,
        homeHref: isVi ? "/" : "/en",
        homeLabel: isVi ? "Trang ch\u1EE7" : "Home",
      }),
      React.createElement(DisciplineFreeValueSection, {
        eyebrow: content.freeValue.eyebrow,
        title: content.freeValue.title,
        items: freeValueItems,
      }),
      React.createElement(
        DisciplineSampleResultSection,
        {
          sectionId: sampleResultAnchor,
          eyebrow: content.sampleResult.eyebrow,
          title: content.sampleResult.title,
          note: content.sampleResult.note,
          subnote: content.sampleResult.subnote,
        },
        children ||
          React.createElement(DisciplineResultPreview, {
            preview,
            disciplineKey: key,
            locale,
          }),
      ),
      React.createElement(DisciplineGlossarySection, {
        eyebrow: content.glossary.eyebrow,
        title: content.glossary.title,
        items: glossary,
      }),
      React.createElement(DisciplineMethodSection, {
        sectionId: methodAnchor,
        eyebrow: content.method.eyebrow,
        title: content.method.title,
        note: content.method.note,
        rows: methodRows,
        footnote: content.method.footnote,
      }),
      React.createElement(DisciplineLimitationsSection, {
        eyebrow: content.limitations.eyebrow,
        title: content.limitations.title,
        items: limitations,
      }),
      React.createElement(DisciplineKnowledgeFaqSection, {
        eyebrow: content.knowledgeFaq.eyebrow,
        title: content.knowledgeFaq.title,
        note: content.knowledgeFaq.note,
        linkText: content.knowledgeFaq.linkText,
        linkHref: content.knowledgeFaq.linkHref,
        faqHeading: content.knowledgeFaq.faqHeading,
        faqs,
        ctaHeading: content.knowledgeFaq.ctaHeading,
        ctaBody: content.knowledgeFaq.ctaBody,
        ctaButtonText: content.knowledgeFaq.ctaButtonText,
        ctaButtonHref: content.knowledgeFaq.ctaButtonHref,
      }),
    ),
    React.createElement(DisciplineFooter, {
      locale,
      disciplineTitle: content.hero.title,
    }),
  );
}