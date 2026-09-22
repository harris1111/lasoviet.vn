"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ZIWEI_PALACE_IDS,
} from "@lasoviet/contracts";

import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "./ziwei-presentation";
import {
  CANONICAL_TOPIC_IDS,
  type CanonicalTopicId,
} from "./ziwei-tabs-state";

export type ZiweiTopicsTabProps = {
  chartId: string;
  locale: ZiweiPresentationLocale;
  openTopicId?: string;
  onOpenTopic: (topicId?: string) => void;
};

// 12 structural static teaser metadata (not personalized excerpt, purely domain scope)
const topicDomainScopes: Record<CanonicalTopicId, { vi: string; en: string }> = {
  life: {
    vi: "Khám phá bản mệnh, tư chất tiên thiên, cá tính cốt lõi và xu hướng định hình cuộc đời.",
    en: "Examine baseline temperament, foundational character, and overarching destiny patterns.",
  },
  siblings: {
    vi: "Tương tác và mức độ hòa hợp trong quan hệ anh chị em, đối tác đồng hành mật thiết.",
    en: "Dynamics and collaborative flow across siblings and close peer partnerships.",
  },
  spouse: {
    vi: "Mẫu hình hôn phối, xu hướng lựa chọn bạn đời, mức độ hòa thuận và các mốc chuyển biến gia đạo.",
    en: "Relational patterns, marital compatibility trends, and key domestic milestones.",
  },
  children: {
    vi: "Duyên phận con cái, phương pháp giáo dục phù hợp và mức độ gắn kết giữa các thế hệ.",
    en: "Generational ties, parenting dynamics, and family continuity patterns.",
  },
  wealth: {
    vi: "Nguồn gốc tài lộc, năng lực quản lý dòng tiền, thời vận hanh thông và rủi ro tài chính.",
    en: "Wealth generation avenues, cash-flow tendencies, and financial risk inflection points.",
  },
  health: {
    vi: "Cấu trúc thể trạng, các điểm nhạy cảm ngũ hành cần dưỡng sinh và cảnh báo thời vận.",
    en: "Constitutional strengths, somatic balance points, and timing considerations for vitality.",
  },
  travel: {
    vi: "Môi trường xã hội bên ngoài, thời cơ xuất ngoại, khả năng ứng biến khi rời xa nơi chôn rau cắt rốn.",
    en: "External social sphere, relocation prospects, and adaptability away from home origin.",
  },
  friends: {
    vi: "Mạng lưới quan hệ xã hội, đối tác cấp dưới, sự hỗ trợ từ bạn bè và môi trường xung quanh.",
    en: "Professional network, subordinate dynamics, and social collaboration circles.",
  },
  career: {
    vi: "Lĩnh vực chuyên môn phù hợp, lộ trình thăng tiến, phong cách lãnh đạo và thời điểm lập nghiệp.",
    en: "Optimal professional arenas, promotion trajectories, and strategic entrepreneurial timing.",
  },
  property: {
    vi: "Điền sản, cơ nghiệp thừa kế, không gian cư trú và khả năng tích lũy tài sản cố định.",
    en: "Real estate inclinations, inherited patrimony, and domestic stability indicators.",
  },
  fortune: {
    vi: "Đời sống nội tâm, phúc trạch tổ tiên, khả năng an tĩnh tinh thần và sự nâng đỡ vô hình.",
    en: "Inner psychological resilience, spiritual tranquility, and ancestral baseline support.",
  },
  parents: {
    vi: "Ảnh hưởng từ phụ mẫu, nền tảng giáo dục gia đình và mối liên kết với thế hệ đi trước.",
    en: "Parental influences, early formative guidance, and intergenerational alignment.",
  },
};

export function ZiweiTopicsTab({
  chartId,
  locale,
  openTopicId,
  onOpenTopic,
}: ZiweiTopicsTabProps) {
  const t = useTranslations("ziwei");
  const presentation = ziweiPresentation(locale);
  const isEn = locale === "en";

  const [activeTopic, setActiveTopic] = useState<CanonicalTopicId | undefined>(
    openTopicId as CanonicalTopicId | undefined,
  );

  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const unlockSelectionHref = isEn
    ? `/en/la-so/${chartId}/chon-luan-giai`
    : `/la-so/${chartId}/chon-luan-giai`;

  function handleSelectTopic(topicId: CanonicalTopicId, btnElement?: HTMLButtonElement) {
    if (btnElement) {
      triggerRef.current = btnElement;
    }
    const next = activeTopic === topicId ? undefined : topicId;
    setActiveTopic(next);
    onOpenTopic(next);
  }

  const handleCloseModal = useCallback(() => {
    setActiveTopic(undefined);
    onOpenTopic(undefined);
    triggerRef.current?.focus();
  }, [onOpenTopic]);

  // Keyboard accessibility & focus trap for mobile dialog / bottom sheet
  useEffect(() => {
    if (!activeTopic) return;

    closeBtnRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCloseModal();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeTopic, handleCloseModal]);

  return (
    <div className="container ziwei-topics-tab-content">
      <div className="section-heading">
        <p className="eyebrow">{t("topicsTab.title")}</p>
        <h2>{t("topicsTab.title")}</h2>
        <p className="section-lead">{t("topicsTab.subtitle")}</p>
      </div>

      <div className="topics-list-container" role="list">
        {CANONICAL_TOPIC_IDS.map((topicKey, index) => {
          const palaceFullId = ZIWEI_PALACE_IDS[index]!;
          const palaceName = presentation.palace(palaceFullId);
          const domainTeaser = topicDomainScopes[topicKey][locale];
          const isSelected = activeTopic === topicKey;

          return (
            <article
              className={`topic-row-item${isSelected ? " is-active" : ""}`}
              key={topicKey}
              role="listitem"
            >
              <div className="topic-row-summary">
                <div className="topic-row-num">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className="topic-row-body">
                  <h3 className="topic-row-title">{palaceName}</h3>
                  <p className="topic-row-teaser">{domainTeaser}</p>
                </div>
                <div className="topic-row-actions">
                  <button
                    aria-expanded={isSelected}
                    className="button button-small button-pill topic-inspect-btn"
                    onClick={(e) => handleSelectTopic(topicKey, e.currentTarget)}
                    type="button"
                  >
                    {isSelected ? t("topicsTab.closePreview") : t("topicsTab.openPreview")}
                  </button>
                </div>
              </div>

              {/* Desktop inline preview */}
              {isSelected ? (
                <div className="topic-desktop-inline-preview">
                  <div className="topic-preview-box">
                    <h4>
                      {t("topicsTab.previewTitle")}: {palaceName}
                    </h4>
                    <p className="topic-preview-notice">{t("topicsTab.notice")}</p>
                    <div className="topic-preview-actions">
                      <Link className="button button-pill" href={unlockSelectionHref}>
                        {t("topicsTab.unlockCta")}
                      </Link>
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {/* Mobile accessible dialog / bottom sheet */}
      {activeTopic ? (
        <div
          aria-labelledby="mobile-sheet-title"
          aria-modal="true"
          className="topic-mobile-sheet-overlay"
          onClick={handleCloseModal}
          role="dialog"
        >
          <div
            className="topic-mobile-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-drag-handle" aria-hidden="true" />
            <div className="sheet-header">
              <h3 id="mobile-sheet-title">
                {presentation.palace(
                  ZIWEI_PALACE_IDS[CANONICAL_TOPIC_IDS.indexOf(activeTopic)]!,
                )}
              </h3>
              <button
                aria-label={t("topicsTab.closePreview")}
                className="sheet-close-btn"
                onClick={handleCloseModal}
                ref={closeBtnRef}
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="sheet-body">
              <p className="sheet-domain-prose">
                {topicDomainScopes[activeTopic][locale]}
              </p>
              <div className="sheet-notice-card">
                <p>{t("topicsTab.notice")}</p>
              </div>
              <div className="sheet-cta-wrap">
                <Link className="button button-pill full-width" href={unlockSelectionHref}>
                  {t("topicsTab.unlockCta")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
