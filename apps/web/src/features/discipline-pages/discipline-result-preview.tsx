import React from "react";
import type { DisciplineKey, PreviewData } from "./discipline-page-model";

export type DisciplineResultPreviewProps<T = unknown> = {
  preview: PreviewData<T>;
  disciplineKey: DisciplineKey;
  locale: "vi" | "en";
  className?: string;
  children?: React.ReactNode;
};

export function DisciplineResultPreview<T = unknown>({
  preview,
  disciplineKey,
  locale,
  className,
  children,
}: DisciplineResultPreviewProps<T>) {
  const isIllustrative = preview.sourceKind === "illustrative";

  return React.createElement(
    "div",
    {
      className: ["discipline-result-frame", className].filter(Boolean).join(" "),
      "data-discipline": disciplineKey,
      "data-source-kind": preview.sourceKind,
    },
    isIllustrative
      ? React.createElement(
          "div",
          {
            className: "discipline-disclosure-badge",
            "data-source-kind": "illustrative",
            role: "note",
          },
          React.createElement("span", { "aria-hidden": "true" }, "\u25CF "),
          React.createElement("span", null, preview.disclosure),
        )
      : React.createElement(
          "div",
          {
            className: "discipline-backend-provenance",
            "data-source-kind": "backend",
            role: "status",
          },
          React.createElement("span", null, preview.provenance),
        ),
    children ||
      React.createElement(
        "div",
        { className: "discipline-preview-placeholder" },
        React.createElement(
          "span",
          { className: "discipline-trust-num" },
          disciplineKey.toUpperCase(),
        ),
        React.createElement(
          "p",
          { className: "discipline-trust-body" },
          isIllustrative
            ? (locale === "vi"
                ? "H\u1ED3 s\u01A1 minh ho\u1EA1 ph\u01B0\u01A1ng ph\u00E1p \u0111ang s\u1EB5n s\u00E0ng cho b\u1ED9 m\u00F4n n\u00E0y."
                : "Methodology preview profile active for this discipline.")
            : (locale === "vi"
                ? "D\u1EEF li\u1EC7u t\u00EDnh to\u00E1n tr\u1EF1c ti\u1EBFp t\u1EEB h\u1EC7 th\u1ED1ng."
                : "Live calculated results from backend engine."),
        ),
      ),
  );
}