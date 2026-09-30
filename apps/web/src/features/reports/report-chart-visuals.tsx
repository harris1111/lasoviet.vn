import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import { nextChartPalace, reportChartPosition } from "./report-chart-navigation";

import type { ReportChartPalaceV1, ReportChartSnapshotV1 } from "@lasoviet/contracts";

import { ziweiPresentation } from "../ziwei/ziwei-presentation";
import { computePalaceScores, type PalaceScore } from "./report-palace-score";
import { starElement, ZIWEI_ELEMENT_LABELS_VI, type ZiweiElement } from "./report-star-elements";

type Translate = (key: string, values?: Record<string, string | number>) => string;

// Non-strict: an unknown star id inside a paid report must never throw.
const vi = ziweiPresentation("vi", { strict: false });

const BRIGHTNESS_SHORT: Record<string, string> = {
  "ziwei.brightness.exalted": "M",
  "ziwei.brightness.prosperous": "V",
  "ziwei.brightness.favorable": "Đ",
  "ziwei.brightness.neutral": "B",
  "ziwei.brightness.unfavorable": "H",
  "ziwei.brightness.weak": "N",
};

const ELEMENT_ORDER: ZiweiElement[] = ["kim", "moc", "thuy", "hoa", "tho"];

function lastSegment(id: string): string {
  return id.split(".").at(-1) ?? "";
}

function elementClass(starId: string): string {
  const element = starElement(starId);
  return element ? ` el-${element}` : "";
}

function palaceShortName(palaceId: string): string {
  return vi.palace(palaceId).replace(/^Cung /, "");
}

export type ReportChartVariant = "full" | "compact" | "thumb";

export type ReportChartProps = {
  snapshot: ReportChartSnapshotV1;
  selectedPalaceId: string;
  t: Translate;
  variant?: ReportChartVariant;
  meta?: { yearLabel?: string; genderLabel?: string; menhLabel?: string; cucLabel?: string; bodyPalaceLabel?: string; targetYear: number };
  onSelect?: (palaceId: string) => void;
};

function cellLabel(palace: ReportChartPalaceV1, cycle?: { ageRange: [number, number] }): string {
  const mains = palace.stars.filter((s) => s.kind === "main");
  const starText = mains.length
    ? mains
        .map((s) => `${vi.star(s.starId)}${s.brightnessId ? ` ${vi.brightness(s.brightnessId)}` : ""}${s.transformationId ? ` ${vi.transformation(s.transformationId)}` : ""}`)
        .join(", ")
    : "Không có chính tinh";
  const marks = [palace.isLife ? "cung Mệnh" : null, palace.isBody ? "cung Thân" : null].filter(Boolean).join(", ");
  const age = cycle ? `. Đại vận ${cycle.ageRange[0]} đến ${cycle.ageRange[1]} tuổi` : "";
  return `${vi.palace(palace.palaceId)}, ${vi.branch(palace.earthlyBranchId)}${marks ? `, ${marks}` : ""}. ${starText}${age}`;
}

function MainStars({ palace, variant }: { palace: ReportChartPalaceV1; variant: ReportChartVariant }) {
  const mains = palace.stars.filter((s) => s.kind === "main");
  if (mains.length === 0) {
    return (
      <span className="c-main">
        <b className="none">Vô chính diệu</b>
      </span>
    );
  }
  if (variant === "compact") {
    return (
      <span className="c-main">
        <b>{mains.map((s) => vi.star(s.starId)).join(", ")}</b>
      </span>
    );
  }
  return (
    <span className="c-main">
      {mains.map((star) => (
        <b key={star.starId} className={elementClass(star.starId).trim()}>
          {vi.star(star.starId)}
          {star.brightnessId && <i>{BRIGHTNESS_SHORT[star.brightnessId] ?? vi.brightness(star.brightnessId)}</i>}
          {star.transformationId && (
            <em className={`report-hoa report-hoa-${lastSegment(star.transformationId)}`}>
              {vi.transformation(star.transformationId).replace(/^Hóa /, "")}
            </em>
          )}
        </b>
      ))}
    </span>
  );
}

function AuxStars({ palace }: { palace: ReportChartPalaceV1 }) {
  const aux = palace.stars.filter((s) => s.kind === "aux");
  if (aux.length === 0) return null;
  const half = Math.ceil(aux.length / 2);
  const column = (list: typeof aux, key: string) => (
    <span className="c-col" key={key}>
      {list.map((star) => (
        <span key={star.starId} className={elementClass(star.starId).trim()}>
          {vi.star(star.starId)}
        </span>
      ))}
    </span>
  );
  return (
    <span className="c-aux">
      {column(aux.slice(0, half), "left")}
      {column(aux.slice(half), "right")}
    </span>
  );
}

export function ReportChart({
  snapshot,
  selectedPalaceId,
  t,
  variant = "full",
  meta,
  onSelect,
}: ReportChartProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef(new Map<string, HTMLElement>());
  const [centres, setCentres] = useState<Record<string, [number, number]>>({});
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const measure = () => {
      const bounds = board.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const next: Record<string, [number, number]> = {};
      for (const [id, element] of cellRefs.current) {
        const cell = element.getBoundingClientRect();
        next[id] = [100 * (cell.left - bounds.left + cell.width / 2) / bounds.width, 100 * (cell.top - bounds.top + cell.height / 2) / bounds.height];
      }
      setCentres((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    return () => observer.disconnect();
  }, [snapshot]);
  const refFor = (id: string) => (node: HTMLElement | null) => {
    if (node) cellRefs.current.set(id, node);
    else cellRefs.current.delete(id);
  };
  const centreFor = (id: string): readonly [number, number] | undefined => {
    if (centres[id]) return centres[id];
    const palace = snapshot.palaces.find((item) => item.palaceId === id);
    const position = palace && reportChartPosition(palace.earthlyBranchId);
    return position ? [(position[1] - 0.5) * 25, (position[0] - 0.5) * 25] : undefined;
  };
  const selected = snapshot.palaces.find((p) => p.palaceId === selectedPalaceId);
  const related = new Set<string>(
    selected ? [...selected.triadPalaceIds, selected.oppositePalaceId] : [],
  );
  const cycleByPalace = new Map(snapshot.decadal.cycles.map((c) => [c.palaceId, c]));
  const currentCycle = snapshot.decadal.cycles.find((c) => c.ordinal === snapshot.decadal.currentOrdinal);

  const cells = snapshot.palaces.map((palace) => {
    const [row, column] = reportChartPosition(palace.earthlyBranchId) ?? [1, 1];
    const isSelected = palace.palaceId === selectedPalaceId;
    const className = `cell${isSelected ? " is-sel" : ""}${related.has(palace.palaceId) ? " is-rel" : ""}`;
    const style = { gridRow: row, gridColumn: column };
    const cycle = cycleByPalace.get(palace.palaceId);

    if (variant === "thumb") {
      return <span ref={refFor(palace.palaceId)} key={palace.palaceId} className={className} style={style} />;
    }

    const marks = (
      <span className="c-mark">
        {palace.isLife && <em className="mk-menh">Mệnh</em>}
        {palace.isBody && <em className="mk-than">Thân</em>}
        {currentCycle?.palaceId === palace.palaceId && <em className="mk-dv">Đại vận</em>}
        {snapshot.annual.palaceId === palace.palaceId && <em className="mk-ln">{snapshot.annual.targetYear}</em>}
      </span>
    );

    const body = (
      <>
        <span className="c-top">
          <span className="c-sd">
            {palace.heavenlyStemId ? `${vi.stem(palace.heavenlyStemId)} ` : ""}
            {vi.branch(palace.earthlyBranchId)}
          </span>
          <span className="c-age">{cycle ? `${cycle.ageRange[0]}-${cycle.ageRange[1]}` : ""}</span>
          <span className="c-nm">{palaceShortName(palace.palaceId)}</span>
        </span>
        <MainStars palace={palace} variant={variant} />
        {variant === "full" && <AuxStars palace={palace} />}
        <span className="c-bot">
          {marks}
          <span className="c-cyc">{palace.cycleStateId ? vi.cycleState(palace.cycleStateId) : ""}</span>
          <span className="c-yrs">{cycle ? `${cycle.yearRange[0]}-${cycle.yearRange[1]}` : ""}</span>
        </span>
      </>
    );

    if (!onSelect) {
      return (
        <span ref={refFor(palace.palaceId)} key={palace.palaceId} className={className} style={style}>
          {body}
        </span>
      );
    }
    return (
      <button
        ref={refFor(palace.palaceId)}
        key={palace.palaceId}
        type="button"
        tabIndex={isSelected ? 0 : -1}
        onKeyDown={(event) => {
          const nextId = nextChartPalace(snapshot.palaces, palace.palaceId, event.key);
          const next = nextId ? cellRefs.current.get(nextId) : null;
          if (!next) return;
          event.preventDefault();
          event.currentTarget.tabIndex = -1;
          next.tabIndex = 0;
          next.focus();
        }}
        className={className}
        style={style}
        aria-pressed={isSelected}
        aria-label={cellLabel(palace, cycle)}
        onClick={() => onSelect(palace.palaceId)}
      >
        {body}
      </button>
    );
  });

  let centre: React.ReactNode;
  if (variant === "thumb") {
    centre = <span className="center" />;
  } else if (variant === "compact" || !meta) {
    centre = (
      <div className="center">
        <h3>{selected ? palaceShortName(selected.palaceId) : ""}</h3>
      </div>
    );
  } else {
    centre = (
      <div className="center">
        <p className="c-brand">Lá Số Việt</p>
        <h3>{t("reader.chart_title")}</h3>
        <dl>
          {meta.yearLabel && (
            <>
              <dt>{t("reader.chart_birth_year")}</dt>
              <dd>{meta.yearLabel}</dd>
            </>
          )}
          {meta.genderLabel && (
            <>
              <dt>{t("reader.chart_gender")}</dt>
              <dd>{meta.genderLabel}</dd>
            </>
          )}
          {meta.menhLabel && (
            <>
              <dt>{t("reader.chart_menh")}</dt>
              <dd>{meta.menhLabel}</dd>
            </>
          )}
          {meta.cucLabel && (
            <>
              <dt>{t("reader.chart_cuc")}</dt>
              <dd>{meta.cucLabel}</dd>
            </>
          )}
          {meta.bodyPalaceLabel && (
            <>
              <dt>{t("reader.chart_body_palace")}</dt>
              <dd>{meta.bodyPalaceLabel}</dd>
            </>
          )}
          <dt>{t("reader.chart_target_year")}</dt>
          <dd>{meta.targetYear}</dd>
        </dl>
        <p className="c-note">{t("reader.chart_no_birth_time")}</p>
        <span className="c-seal" aria-hidden="true" />
      </div>
    );
  }

  const origin = selected && centreFor(selected.palaceId);
  const triad = selected?.triadPalaceIds.map(centreFor);
  const opposite = selected && centreFor(selected.oppositePalaceId);
  const boardClass = `board${variant === "full" ? "" : ` ${variant}`}`;
  return (
    <div className="report-chart">
      <div ref={boardRef} className={boardClass} role={onSelect ? undefined : "img"} aria-label={onSelect ? undefined : t("reader.chart_title")}>
        {cells}
        {centre}
        {origin && triad?.every(Boolean) && opposite && (
          <svg className="report-chart-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polygon points={[origin, ...triad].map((point) => point!.join(",")).join(" ")} />
            <line x1={origin[0]} y1={origin[1]} x2={opposite[0]} y2={opposite[1]} />
          </svg>
        )}
      </div>
      {variant === "full" && (
        <div className="board-key">
          <span className="bk-grp">
            <b>{t("reader.key_brightness")}</b> M Miếu · V Vượng · Đ Đắc · B Bình · H Hãm
          </span>
          <span className="bk-grp">
            <b>{t("reader.key_element")}</b>
            {ELEMENT_ORDER.map((element) => (
              <span key={element} className={`bk-el el-${element}`}>
                {ZIWEI_ELEMENT_LABELS_VI[element]}
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
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

const RADAR_SIZE = 320;
const RADAR_RADIUS = 116;

export function ReportPalaceRadar({
  snapshot,
  scores,
  t,
}: {
  snapshot: ReportChartSnapshotV1;
  scores: Map<string, PalaceScore>;
  t: Translate;
}) {
  const centre = RADAR_SIZE / 2;
  const point = (index: number, value: number): [number, number] => {
    const angle = ((-90 + index * 30) * Math.PI) / 180;
    const distance = (value / 100) * RADAR_RADIUS;
    return [centre + distance * Math.cos(angle), centre + distance * Math.sin(angle)];
  };
  const palaces = snapshot.palaces;
  const shape = palaces
    .map((palace, i) => point(i, scores.get(palace.palaceId)?.score ?? 0).map((n) => n.toFixed(1)).join(","))
    .join(" ");

  return (
    <figure className="report-radar">
      <svg
        viewBox={`-34 -6 ${RADAR_SIZE + 68} ${RADAR_SIZE + 12}`}
        role="img"
        aria-label={t("reader.radar_label")}
      >
        {[20, 40, 60, 80, 100].map((ring) => (
          <polygon
            key={ring}
            className="rd-ring"
            points={palaces.map((_, i) => point(i, ring).map((n) => n.toFixed(1)).join(",")).join(" ")}
          />
        ))}
        {palaces.map((palace, i) => {
          const [x, y] = point(i, 100);
          return <line key={palace.palaceId} className="rd-axis" x1={centre} y1={centre} x2={x.toFixed(1)} y2={y.toFixed(1)} />;
        })}
        <polygon className="rd-shape" points={shape} />
        {palaces.map((palace, i) => {
          const [x, y] = point(i, scores.get(palace.palaceId)?.score ?? 0);
          return (
            <circle key={palace.palaceId} className="rd-dot" cx={x.toFixed(1)} cy={y.toFixed(1)} r={3}>
              <title>{`${palaceShortName(palace.palaceId)}: ${scores.get(palace.palaceId)?.score ?? 0}`}</title>
            </circle>
          );
        })}
        {palaces.map((palace, i) => {
          const angle = ((-90 + i * 30) * Math.PI) / 180;
          const distance = RADAR_RADIUS + 24;
          const x = centre + distance * Math.cos(angle);
          const y = centre + distance * Math.sin(angle);
          const anchor = Math.abs(x - centre) < 6 ? "middle" : x > centre ? "start" : "end";
          return (
            <text key={palace.palaceId} className="rd-lb" x={x.toFixed(1)} y={(y + 3.5).toFixed(1)} textAnchor={anchor}>
              {palaceShortName(palace.palaceId)}
            </text>
          );
        })}
      </svg>
      <figcaption>{t("reader.radar_caption")}</figcaption>
    </figure>
  );
}

export function ReportScoreBadge({ score, t }: { score: PalaceScore; t: Translate }) {
  return (
    <span className={`report-sc report-sc-${score.band}`} title={t(`reader.score_band_${score.band}`)}>
      {score.score}
    </span>
  );
}

const SCORE_EXPLAIN_KEYS = ["base", "brightness", "transformation", "support", "block", "facing", "borrow"] as const;

export function ReportScoreExplainer({ t }: { t: Translate }) {
  return (
    <details className="report-how">
      <summary>{t("reader.score_how_title")}</summary>
      <p>{t("reader.score_how_intro")}</p>
      <dl>
        {SCORE_EXPLAIN_KEYS.map((key) => (
          <div key={key}>
            <dt>{t(`reader.score_how_${key}_label`)}</dt>
            <dd>{t(`reader.score_how_${key}_body`)}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function ReportDecadalTimeline({
  snapshot,
  t,
  teasers,
  onOpenPalace,
  onOpenCurrent,
}: {
  snapshot: ReportChartSnapshotV1;
  t: Translate;
  teasers?: Map<number, string>;
  onOpenPalace?: (palaceId: string) => void;
  onOpenCurrent?: () => void;
}) {
  const current = snapshot.decadal.currentOrdinal;
  const cycles = snapshot.decadal.cycles;
  return (
    <section className="report-timeline" aria-labelledby="report-timeline-title">
      <h4 id="report-timeline-title" className="report-timeline-title">
        {t("reader.timeline_title")}
      </h4>
      <ol className="report-cycles">
        {cycles.slice(0, 8).map((cycle) => {
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
                {palaceShortName(cycle.palaceId)}
                {palace ? ` (${vi.branch(palace.earthlyBranchId)})` : ""}
              </span>
              <span className="report-cycle-years">
                {cycle.yearRange[0]}-{cycle.yearRange[1]}
              </span>
            </li>
          );
        })}
      </ol>
      <details className="report-how" open>
        <summary>{t("reader.timeline_how_title")}</summary>
        <p>{t("reader.timeline_how_body")}</p>
      </details>
      {teasers && teasers.size > 0 && (
        <div className="report-cycle-list">
          {cycles.map((cycle) => {
            const teaser = teasers.get(cycle.ordinal);
            if (!teaser) return null;
            const isCurrent = cycle.ordinal === current;
            return (
              <article key={cycle.ordinal} className={`report-cycle-row${isCurrent ? " is-current" : ""}`}>
                <h5>
                  {t("reader.timeline_age", { from: cycle.ageRange[0], to: cycle.ageRange[1] })}
                  <small>
                    {cycle.yearRange[0]}-{cycle.yearRange[1]} · {vi.palace(cycle.palaceId).toLowerCase()}
                  </small>
                  {isCurrent && <span className="report-cycle-tag">{t("reader.timeline_living")}</span>}
                </h5>
                <p>{teaser}</p>
                {isCurrent
                  ? onOpenCurrent && (
                      <button type="button" className="report-cycle-cta is-primary" onClick={onOpenCurrent}>
                        {t("reader.timeline_read_full")}
                      </button>
                    )
                  : onOpenPalace && (
                      <button type="button" className="report-cycle-cta" onClick={() => onOpenPalace(cycle.palaceId)}>
                        {t("reader.timeline_read_palace", { palace: palaceShortName(cycle.palaceId) })}
                      </button>
                    )}
              </article>
            );
          })}
        </div>
      )}
      <p className="report-timeline-note">{t("reader.timeline_note")}</p>
    </section>
  );
}

export { computePalaceScores };
