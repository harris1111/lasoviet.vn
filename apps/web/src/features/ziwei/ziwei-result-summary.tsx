import type {
  NormalizedZiweiChartV1,
  ZiweiBirthSummaryV1,
} from "@lasoviet/contracts";

import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "./ziwei-presentation";

export type ZiweiResultSummaryProps = {
  chart: NormalizedZiweiChartV1;
  birthSummary: ZiweiBirthSummaryV1;
  locale: ZiweiPresentationLocale;
};

function formatTimezone(
  provenance: ZiweiBirthSummaryV1["timezoneProvenance"],
): string {
  if (provenance.source === "iana") {
    return provenance.ianaZone;
  }
  const total = provenance.offsetMinutes;
  const sign = total >= 0 ? "+" : "-";
  const abs = Math.abs(total);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return minutes === 0
    ? `UTC${sign}${hours}`
    : `UTC${sign}${hours}:${minutes.toString().padStart(2, "0")}`;
}

export function ZiweiResultSummary({
  chart,
  birthSummary,
  locale,
}: ZiweiResultSummaryProps) {
  const presentation = ziweiPresentation(locale);

  const lifePalace = chart.palaces.find((p) => p.id === chart.soulPalaceId);
  const bodyPalace = chart.palaces.find((p) => p.id === chart.bodyPalaceId);

  const calendarType = presentation.calendarKind(
    birthSummary.normalizedCalendar.kind,
  );
  const isLeap =
    birthSummary.normalizedCalendar.kind === "lunar" &&
    birthSummary.normalizedCalendar.isLeapMonth;
  const calendarLabel = isLeap
    ? `${calendarType} (${locale === "vi" ? "Tháng nhuận" : "Leap month"})`
    : calendarType;

  const timeValue =
    birthSummary.normalizedTime.precision === "exact_minute"
      ? birthSummary.normalizedTime.localTime
      : birthSummary.normalizedTime.precision === "branch_only"
        ? presentation.branch(birthSummary.normalizedTime.branch)
        : birthSummary.normalizedTime.precision === "range"
          ? `${birthSummary.normalizedTime.startLocalTime} - ${birthSummary.normalizedTime.endLocalTime}`
          : presentation.timePrecision("unknown");

  const timeLabel = `${timeValue} (${presentation.timePrecision(birthSummary.normalizedTime.precision)})`;

  const lifeStarsLabel =
    lifePalace && lifePalace.stars.length > 0
      ? lifePalace.stars
          .map(
            (s) =>
              `${presentation.star(s.id)} (${presentation.brightness(s.brightness)})`,
          )
          .join(", ")
      : presentation.chrome.noStars;

  const lifeBranchLabel = lifePalace
    ? presentation.branch(lifePalace.earthlyBranchId)
    : "";

  const bodyPlacementLabel = presentation.palace(chart.bodyPalaceId);
  const bodyBranchLabel = bodyPalace
    ? presentation.branch(bodyPalace.earthlyBranchId)
    : "";

  const labels = {
    vi: {
      sectionAria: "Tóm tắt lá số",
      birthInfo: "Thông tin sinh",
      fullName: "Họ và tên",
      birthDate: "Ngày sinh",
      birthTime: "Giờ sinh",
      timezone: "Múi giờ",
      birthPlace: "Nơi sinh",
      gender: "Giới tính",
      chartCore: "Trục bản mệnh",
      lifePalace: "Cung Mệnh",
      bodyPalace: "Cung Thân",
      transformations: "Tứ Hóa",
    },
    en: {
      sectionAria: "Chart summary",
      birthInfo: "Birth data",
      fullName: "Full name",
      birthDate: "Birth date",
      birthTime: "Birth time",
      timezone: "Timezone",
      birthPlace: "Birth place",
      gender: "Gender",
      chartCore: "Core chart axes",
      lifePalace: "Life Palace",
      bodyPalace: "Body Palace",
      transformations: "Four Transformations",
    },
  }[locale];

  return (
    <section aria-label={labels.sectionAria} className="ziwei-result-summary">
      <div className="result-summary-card">
        <h2 className="result-summary-heading">{labels.birthInfo}</h2>
        <dl className="result-summary-list">
          {birthSummary.displayName ? (
            <>
              <dt>{labels.fullName}</dt>
              <dd>{birthSummary.displayName}</dd>
            </>
          ) : null}
          <dt>{labels.birthDate}</dt>
          <dd>
            {birthSummary.normalizedCalendar.date} · {calendarLabel}
          </dd>
          <dt>{labels.birthTime}</dt>
          <dd>{timeLabel}</dd>
          <dt>{labels.timezone}</dt>
          <dd>{formatTimezone(birthSummary.timezoneProvenance)}</dd>
          {birthSummary.placeLabel ? (
            <>
              <dt>{labels.birthPlace}</dt>
              <dd>{birthSummary.placeLabel}</dd>
            </>
          ) : null}
          {birthSummary.gender ? (
            <>
              <dt>{labels.gender}</dt>
              <dd>{presentation.gender(birthSummary.gender)}</dd>
            </>
          ) : null}
        </dl>
      </div>

      <div className="result-summary-card">
        <h2 className="result-summary-heading">{labels.chartCore}</h2>
        <dl className="result-summary-list">
          <dt>{labels.lifePalace}</dt>
          <dd>
            {lifeBranchLabel} · {lifeStarsLabel}
          </dd>
          <dt>{labels.bodyPalace}</dt>
          <dd>
            {bodyPlacementLabel} · {bodyBranchLabel}
          </dd>
          <dt>{labels.transformations}</dt>
          <dd className="result-summary-transformations">
            {chart.transformations.map((t) => (
              <span className="transformation-tag" key={`${t.starId}-${t.id}`}>
                {presentation.star(t.starId)} · {presentation.transformation(t.id)}
              </span>
            ))}
          </dd>
        </dl>
      </div>
    </section>
  );
}
