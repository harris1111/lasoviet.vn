import type { ReportChartPalaceV1, ReportChartSnapshotV1 } from "@lasoviet/contracts";

import { ziweiPresentation } from "../ziwei/ziwei-presentation";

type Translate = (key: string, values?: Record<string, string | number>) => string;

// Non-strict: an unknown star id inside a paid report must never throw.
const vi = ziweiPresentation("vi", { strict: false });

// Board positions (row, column) by earthly branch, same layout as the free chart.
const BRANCH_POSITION: Record<string, [number, number]> = {
  snake: [1, 1], horse: [1, 2], goat: [1, 3], monkey: [1, 4],
  dragon: [2, 1], rooster: [2, 4], rabbit: [3, 1], dog: [3, 4],
  tiger: [4, 1], ox: [4, 2], rat: [4, 3], pig: [4, 4],
};

function lastSegment(id: string): string {
  return id.split(".").at(-1) ?? "";
}

export function ReportStarChips({ palace, t }: { palace: ReportChartPalaceV1; t: Translate }) {
  const hasMain = palace.stars.some((star) => star.kind === "main");
  return (
    <ul className="report-chips" aria-label={t("reader.stars_label")}>
      {!hasMain && <li className="report-chip is-empty">{t("reader.no_main_star")}</li>}
      {palace.stars.map((star) => (
        <li key={star.starId} className={star.kind === "main" ? "report-chip is-main" : "report-chip"}>
          {vi.star(star.starId)}
          {star.kind === "main" && star.brightnessId && <small>{vi.brightness(star.brightnessId)}</small>}
          {star.transformationId && (
            <span className={`report-hoa report-hoa-${lastSegment(star.transformationId)}`}>
              {vi.transformation(star.transformationId)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ReportMiniChart({
  snapshot,
  palaceId,
  t,
}: {
  snapshot: ReportChartSnapshotV1;
  palaceId: string;
  t: Translate;
}) {
  const lit = snapshot.palaces.find((p) => p.palaceId === palaceId);
  if (!lit) return null;
  const related = new Set<string>([...lit.triadPalaceIds, lit.oppositePalaceId]);
  return (
    <span
      className="report-mini-chart"
      role="img"
      aria-label={t("reader.chart_thumb_label", { palace: vi.palace(palaceId) })}
    >
      {snapshot.palaces.map((p) => {
        const [row, column] = BRANCH_POSITION[lastSegment(p.earthlyBranchId)] ?? [1, 1];
        const state = p.palaceId === palaceId ? " is-lit" : related.has(p.palaceId) ? " is-related" : "";
        return (
          <span
            key={p.palaceId}
            className={`report-mini-cell${state}`}
            style={{ gridRow: row, gridColumn: column }}
          />
        );
      })}
      <span className="report-mini-center" aria-hidden="true" />
    </span>
  );
}

export function ReportDecadalTimeline({ snapshot, t }: { snapshot: ReportChartSnapshotV1; t: Translate }) {
  const current = snapshot.decadal.currentOrdinal;
  return (
    <section className="report-timeline" aria-labelledby="report-timeline-title">
      <h4 id="report-timeline-title" className="report-timeline-title">{t("reader.timeline_title")}</h4>
      <ol className="report-cycles">
        {snapshot.decadal.cycles.slice(0, 9).map((cycle) => {
          const isCurrent = cycle.ordinal === current;
          const isPast = current !== null && cycle.ordinal < current;
          const palace = snapshot.palaces.find((p) => p.palaceId === cycle.palaceId);
          return (
            <li
              key={cycle.ordinal}
              className={`report-cycle${isCurrent ? " is-current" : ""}${isPast ? " is-past" : ""}`}
              aria-current={isCurrent ? "true" : undefined}
            >
              {isCurrent && <span className="report-cycle-tag">{t("reader.timeline_current")}</span>}
              <span className="report-cycle-age">
                {t("reader.timeline_age", { from: cycle.ageRange[0], to: cycle.ageRange[1] })}
              </span>
              <span className="report-cycle-palace">
                {vi.palace(cycle.palaceId).replace(/^Cung /, "")}
                {palace ? ` (${vi.branch(palace.earthlyBranchId)})` : ""}
              </span>
              <span className="report-cycle-years">
                {cycle.yearRange[0]}-{cycle.yearRange[1]}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="report-timeline-note">{t("reader.timeline_note")}</p>
    </section>
  );
}
