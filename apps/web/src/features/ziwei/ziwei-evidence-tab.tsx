"use client";

import React from "react";
import type {
  NormalizedZiweiChartV1,
  ZiweiEvidenceViewV1,
} from "@lasoviet/contracts";
import { useTranslations } from "next-intl";

import { EvidenceDrawer } from "../evidence/evidence-drawer";
import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "./ziwei-presentation";

export type ZiweiEvidenceTabProps = {
  chart: NormalizedZiweiChartV1;
  chartId: string;
  locale: ZiweiPresentationLocale;
  loadEvidence(chartId: string, evidenceId: string): Promise<
    | { ok: true; value: ZiweiEvidenceViewV1 }
    | { ok: false; error: { code: string } }
  >;
  openEvidenceId?: string;
};

export function ZiweiEvidenceTab({
  chart,
  chartId,
  locale,
  loadEvidence,
}: ZiweiEvidenceTabProps) {
  const t = useTranslations("ziwei");
  const presentation = ziweiPresentation(locale);

  // Exactly the 3 authorized free evidence references available in FreeIdentityPreview
  const evidenceReferences = [
    {
      id: "life-palace",
      evidenceId: "life-palace",
      title: presentation.evidence("life-palace"),
      description:
        locale === "vi"
          ? "Căn cứ vị trí chính tinh và phụ tinh tọa thủ tại Cung Mệnh đối chiếu cùng trục đối xung."
          : "Astronomical basis of principal and auxiliary stars placed in the Life Palace.",
    },
    {
      id: "body-palace",
      evidenceId: "body-palace",
      title: presentation.evidence("body-palace"),
      description:
        locale === "vi"
          ? "Căn cứ vị trí Cung Thân và mức độ tương hỗ giữa các cung tam hợp mệnh - tài - quan."
          : "Astronomical basis of the Body Palace placement and trine palace interactions.",
    },
    {
      id: "transformations",
      evidenceId: "transformations",
      title: presentation.evidence("transformations"),
      description:
        locale === "vi"
          ? "Căn cứ 4 hóa khí (Hóa Lộc, Hóa Quyền, Hóa Khoa, Hóa Kỵ) an định theo thiên can năm sinh."
          : "Astronomical basis of the Four Transformations derived from the birth year stem.",
    },
  ];

  return (
    <div className="container ziwei-evidence-tab-content">
      <div className="section-heading">
        <p className="eyebrow">{t("evidenceTab.title")}</p>
        <h2>{t("evidenceTab.title")}</h2>
        <p className="section-lead">{t("evidenceTab.subtitle")}</p>
      </div>

      <div className="evidence-cards-matrix">
        {evidenceReferences.map((item) => (
          <article className="evidence-matrix-card" key={item.id}>
            <div className="matrix-card-head">
              <span className="matrix-badge">
                {locale === "vi" ? "Căn cứ xác thực" : "Verified source"}
              </span>
              <h3>{item.title}</h3>
            </div>
            <p className="matrix-card-desc">{item.description}</p>
            <div className="matrix-card-action">
              <EvidenceDrawer
                chart={chart}
                chartId={chartId}
                evidenceId={item.evidenceId}
                locale={locale}
                loadEvidence={loadEvidence}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
