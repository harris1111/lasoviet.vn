import React from "react";
import type { PublicContentV1 } from "@lasoviet/contracts";
import { PRIVACY_POLICY_CONTENT } from "./privacy-policy-content";

export type PrivacyPolicyPageProps = {
  locale: "vi" | "en";
  content: PublicContentV1;
};

export function PrivacyPolicyPage({ locale, content }: PrivacyPolicyPageProps) {
  const policy = PRIVACY_POLICY_CONTENT[locale];

  return (
    <main className="content-page privacy-policy-page">
      <article className="content-article container">
        <p className="eyebrow">{locale === "vi" ? "Lá Số Việt" : "La So Viet"}</p>
        <h1>{policy.title || content.title}</h1>
        <p className="effective-date-notice" style={{ fontSize: "14px", color: "var(--pearl-400)", marginBottom: "16px" }}>
          <strong>{policy.effectiveDateLabel}:</strong> {policy.effectiveDate}
        </p>
        <p className="content-summary">{policy.summary}</p>

        <div className="policy-sections-list" style={{ marginTop: "32px" }}>
          {policy.sections.map((section) => (
            <section key={section.id} id={section.id} className="policy-section-block" style={{ marginBottom: "28px" }}>
              <h2 style={{ fontSize: "20px", marginBottom: "12px", color: "var(--pearl-100)" }}>{section.title}</h2>
              {section.paragraphs.map((p, idx) => (
                <p key={idx} style={{ lineHeight: 1.6, marginBottom: "8px" }}>{p}</p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul style={{ paddingLeft: "20px", lineHeight: 1.6, marginTop: "8px" }}>
                  {section.bullets.map((b, bIdx) => (
                    <li key={bIdx} style={{ marginBottom: "6px" }}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <footer style={{ marginTop: "40px", borderTop: "1px solid var(--pearl-800)", paddingTop: "16px" }}>
          <p style={{ fontSize: "13px", color: "var(--pearl-400)" }}>
            {locale === "vi"
              ? "Nội dung chính sách được bảo vệ theo các cam kết kỹ thuật của Lá Số Việt."
              : "Policy content is protected under the technical architecture of Lá Số Việt."}
          </p>
        </footer>
      </article>
    </main>
  );
}
