"use client";

import { useState } from "react";
import type {
  NormalizedZiweiChartV1,
  ZiweiBirthSummaryV1,
} from "@lasoviet/contracts";

import { ZiweiPalace } from "./ziwei-palace";
import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "./ziwei-presentation";
import {
  getPalaceGridPosition,
  getPalaceLifeArea,
  getPalaceRelations,
} from "./ziwei-chart-relations";

export function ZiweiChart({
  chart,
  birthSummary,
  locale,
}: {
  chart: NormalizedZiweiChartV1;
  birthSummary?: ZiweiBirthSummaryV1;
  locale: ZiweiPresentationLocale;
}) {
  const presentation = ziweiPresentation(locale);
  const [selectedPalaceId, setSelectedPalaceId] = useState<string>(chart.soulPalaceId);

  const selectedPalace =
    chart.palaces.find((p) => p.id === selectedPalaceId) ??
    chart.palaces.find((p) => p.id === chart.soulPalaceId) ??
    chart.palaces[0]!;

  const relations = getPalaceRelations(selectedPalace.id, chart.palaces);
  const lifeArea = getPalaceLifeArea(selectedPalace.id, locale);

  const lifePalace = chart.palaces.find((p) => p.id === chart.soulPalaceId);
  const bodyPalace = chart.palaces.find((p) => p.id === chart.bodyPalaceId);

  // Center display data
  const centerTitle = birthSummary?.displayName
    ? (locale === "vi" ? `Lá số của ${birthSummary.displayName}` : `${birthSummary.displayName}'s Chart`)
    : presentation.chrome.chartAria;

  const centerDate = birthSummary
    ? `${birthSummary.normalizedCalendar.date} · ${presentation.calendarKind(birthSummary.normalizedCalendar.kind)}`
    : "";

  const centerTime = birthSummary
    ? (birthSummary.normalizedTime.precision === "exact_minute"
        ? birthSummary.normalizedTime.localTime
        : birthSummary.normalizedTime.precision === "branch_only"
          ? presentation.branch(birthSummary.normalizedTime.branch)
          : presentation.timePrecision(birthSummary.normalizedTime.precision))
    : "";

  // Inspector facts
  const selectedStemText = selectedPalace.heavenlyStemId ? presentation.stem(selectedPalace.heavenlyStemId) : "";
  const selectedBranchText = presentation.branch(selectedPalace.earthlyBranchId);
  const selectedFullName = `${presentation.palace(selectedPalace.id)} (${selectedStemText ? `${selectedStemText} ` : ""}${selectedBranchText})`;

  const oppositePalace = relations.oppositeId ? chart.palaces.find((p) => p.id === relations.oppositeId) : undefined;
  const trinePalaces = relations.trineIds.map((id) => chart.palaces.find((p) => p.id === id)).filter(Boolean);

  const majorStars = selectedPalace.stars.filter((s) => s.category === "major");
  const minorStars = selectedPalace.stars.filter((s) => s.category !== "major");

  return (
    <section aria-label={presentation.chrome.chartAria} className="ziwei-chart-container">
      <div className="ziwei-board-wrapper">
        <div className="ziwei-traditional-board" data-testid="ziwei-chart-grid">
          {/* 12 Perimeter Palaces */}
          {chart.palaces.map((palace) => {
            const pos = getPalaceGridPosition(palace.earthlyBranchId);
            const relationType = relations.getRelation(palace.id);
            return (
              <ZiweiPalace
                bodyPalaceId={chart.bodyPalaceId}
                isSelected={palace.id === selectedPalace.id}
                key={palace.id}
                locale={locale}
                onSelect={() => setSelectedPalaceId(palace.id)}
                palace={palace}
                relationType={relationType}
                soulPalaceId={chart.soulPalaceId}
                style={{ gridArea: pos.gridArea }}
                transformations={chart.transformations}
              />
            );
          })}

          {/* 2x2 Center Area */}
          <div className="ziwei-board-center" style={{ gridArea: "2 / 2 / 4 / 4" }}>
            <div className="center-header">
              <h2 className="center-title">{centerTitle}</h2>
              {centerDate ? (
                <p className="center-birth-data">
                  <span>{centerDate}</span>
                  {centerTime ? <span> · {centerTime}</span> : null}
                </p>
              ) : null}
            </div>

            <div className="center-axes">
              <div className="axis-item">
                <span className="axis-label">{presentation.chrome.soulMarker}:</span>
                <span className="axis-value">{presentation.palace(chart.soulPalaceId)} ({presentation.branch(lifePalace?.earthlyBranchId ?? "")})</span>
              </div>
              <div className="axis-item">
                <span className="axis-label">{presentation.chrome.bodyMarker}:</span>
                <span className="axis-value">{presentation.palace(chart.bodyPalaceId)} ({presentation.branch(bodyPalace?.earthlyBranchId ?? "")})</span>
              </div>
            </div>

            <div className="center-transformations">
              <span className="transformations-label">{locale === "vi" ? "Tứ Hóa:" : "Transformations:"}</span>
              <div className="transformations-list">
                {chart.transformations.map((t) => (
                  <span className={`center-tag tag-${t.id.split(".").at(-1)}`} key={`${t.starId}-${t.id}`}>
                    {presentation.star(t.starId)} · {presentation.transformation(t.id)}
                  </span>
                ))}
              </div>
            </div>

            <p className="center-instruction">
              {locale === "vi"
                ? "Chạm vào một cung để xem tam phương tứ chính và chi tiết."
                : "Select a palace to inspect trines, opposition, and details."}
            </p>
          </div>
        </div>
      </div>

      {/* Deterministic Detail Inspector */}
      <div className="ziwei-detail-inspector" data-testid="ziwei-detail-inspector">
        <div className="inspector-head">
          <p className="eyebrow">{locale === "vi" ? "Chi tiết cung vị đang chọn" : "Selected palace inspection"}</p>
          <h3 className="inspector-title">{selectedFullName}</h3>
          <p className="inspector-domain">{lifeArea.domain}</p>
        </div>

        <div className="inspector-relations-grid">
          <div className="relation-box box-selected">
            <span className="relation-tag-title">{locale === "vi" ? "Bản cung" : "Selected Palace"}</span>
            <p className="relation-palace-name">{presentation.palace(selectedPalace.id)} ({selectedBranchText})</p>
          </div>

          <div className="relation-box box-opposite">
            <span className="relation-tag-title">{locale === "vi" ? "Đối cung (Xung chiếu)" : "Opposition"}</span>
            <p className="relation-palace-name">
              {oppositePalace
                ? `${presentation.palace(oppositePalace.id)} (${presentation.branch(oppositePalace.earthlyBranchId)})`
                : (locale === "vi" ? "Không có" : "None")}
            </p>
          </div>

          <div className="relation-box box-trines">
            <span className="relation-tag-title">{locale === "vi" ? "Tam hợp (Hợp chiếu)" : "Trines"}</span>
            <p className="relation-palace-name">
              {trinePalaces.length > 0
                ? trinePalaces.map((p) => `${presentation.palace(p!.id)} (${presentation.branch(p!.earthlyBranchId)})`).join(", ")
                : (locale === "vi" ? "Không có" : "None")}
            </p>
          </div>
        </div>

        <div className="inspector-stars-breakdown">
          <div className="stars-column">
            <h4>{locale === "vi" ? "Chính tinh tọa thủ" : "Principal Stars"}</h4>
            {majorStars.length === 0 ? (
              <p className="empty-stars-text">{presentation.chrome.noStars} ({locale === "vi" ? "Cung vô chính diệu" : "No major star"})</p>
            ) : (
              <ul className="inspector-stars-list">
                {majorStars.map((s) => {
                  const trans = chart.transformations.find((t) => t.starId === s.id);
                  return (
                    <li key={s.id}>
                      <strong>{presentation.star(s.id)}</strong>
                      <span className="star-brightness-tag">({presentation.brightness(s.brightness)})</span>
                      {trans ? (
                        <span className={`inspector-mutagen mutagen-${trans.id.split(".").at(-1)}`}>
                          {presentation.transformation(trans.id)}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="stars-column">
            <h4>{locale === "vi" ? "Phụ tinh & Vòng Trường Sinh" : "Minor Stars & Cycle"}</h4>
            {selectedPalace.cycleStateId ? (
              <p className="inspector-cycle-state">
                <span>{locale === "vi" ? "Trường Sinh: " : "Cycle state: "}</span>
                <strong>{presentation.cycleState(selectedPalace.cycleStateId)}</strong>
              </p>
            ) : null}
            {minorStars.length > 0 ? (
              <div className="inspector-minor-chips">
                {minorStars.map((s) => {
                  const trans = chart.transformations.find((t) => t.starId === s.id);
                  return (
                    <span className="inspector-chip" key={s.id}>
                      {presentation.star(s.id)}
                      {trans ? ` [${presentation.transformation(trans.id)}]` : ""}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="empty-stars-text">{locale === "vi" ? "Không có phụ tinh đáng kể" : "No minor stars"}</p>
            )}
          </div>
        </div>

        <p className="inspector-footnote">
          {locale === "vi"
            ? "Căn cứ được trích xuất hoàn toàn từ các yếu tố tính toán của lá số. Bấm chọn các cung vị khác trên sơ đồ để đối chiếu tam phương tứ chính tương ứng."
            : "Derived deterministically from chart calculations. Select other palaces on the board to inspect corresponding relations."}
        </p>
      </div>
    </section>
  );
}
