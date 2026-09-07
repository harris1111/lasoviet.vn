import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { NormalizedZiweiChartV1, ZiweiBirthSummaryV1 } from "@lasoviet/contracts";

import { ZiweiResultSummary } from "./ziwei-result-summary";

const chart: NormalizedZiweiChartV1 = {
  version: 1,
  systemId: "ziwei",
  palaces: [
    {
      id: "ziwei.palace.life",
      earthlyBranchId: "ziwei.branch.tiger",
      stars: [
        { id: "ziwei.star.ziwei", brightness: "ziwei.brightness.exalted" },
        { id: "ziwei.star.tianfu", brightness: "ziwei.brightness.prosperous" },
      ],
    },
    {
      id: "ziwei.palace.career",
      earthlyBranchId: "ziwei.branch.horse",
      stars: [{ id: "ziwei.star.wuqu", brightness: "ziwei.brightness.favorable" }],
    },
    ...[
      "siblings", "spouse", "children", "wealth", "health",
      "travel", "friends", "property", "fortune", "parents",
    ].map((name, index) => ({
      id: `ziwei.palace.${name}` as NormalizedZiweiChartV1["palaces"][number]["id"],
      earthlyBranchId: [
        "ziwei.branch.rat", "ziwei.branch.ox", "ziwei.branch.rabbit",
        "ziwei.branch.dragon", "ziwei.branch.snake", "ziwei.branch.goat",
        "ziwei.branch.monkey", "ziwei.branch.rooster", "ziwei.branch.dog", "ziwei.branch.pig",
      ][index] as NormalizedZiweiChartV1["palaces"][number]["earthlyBranchId"],
      stars: [],
    })),
  ],
  transformations: [
    { starId: "ziwei.star.wuqu", id: "ziwei.transformation.prosperity" },
    { starId: "ziwei.star.taiyang", id: "ziwei.transformation.power" },
    { starId: "ziwei.star.wenchang", id: "ziwei.transformation.fame" },
    { starId: "ziwei.star.lianzhen", id: "ziwei.transformation.obstacle" },
  ],
  soulPalaceId: "ziwei.palace.life",
  bodyPalaceId: "ziwei.palace.career",
  horoscopeCapabilities: [{ id: "ziwei.horoscope.annual", supported: true }],
  warnings: [],
  provenance: {
    version: 1,
    engineId: "ziwei.iztro",
    engineVersion: "2.6.0",
    adapterId: "ziwei.iztro-adapter",
    adapterVersion: "1",
    schemaId: "ziwei.chart.v1",
    ruleSetId: "ziwei.default",
    inputHash: "a".repeat(64),
    configHash: "b".repeat(64),
    rawSnapshotHash: "c".repeat(64),
    calculatedAt: "2026-09-02T00:00:00+00:00",
    limitations: [],
  },
};

const birthSummary: ZiweiBirthSummaryV1 = {
  normalizedCalendar: { kind: "solar", date: "1990-05-15" },
  normalizedTime: { precision: "exact_minute", localTime: "06:30" },
  timezoneProvenance: { source: "offset", offsetMinutes: 420 },
  gender: "female",
};

describe("ZiweiResultSummary", () => {
  it("renders deterministic summary in Vietnamese without raw IDs", () => {
    const html = renderToStaticMarkup(
      <ZiweiResultSummary chart={chart} birthSummary={birthSummary} locale="vi" />,
    );

    // Birth details
    expect(html).toContain("1990-05-15");
    expect(html).toContain("Dương lịch");
    expect(html).toContain("06:30");
    expect(html).toContain("Chính xác theo phút");
    expect(html).toContain("UTC+7");
    expect(html).toContain("Nữ");

    // Life palace: branch + stars
    expect(html).toContain("Dần");
    expect(html).toContain("Tử Vi");
    expect(html).toContain("Thiên Phủ");

    // Body palace: functional palace + branch
    expect(html).toContain("Cung Quan Lộc");
    expect(html).toContain("Ngọ");

    // Transformations
    expect(html).toContain("Vũ Khúc");
    expect(html).toContain("Hóa Lộc");
    expect(html).toContain("Thái Dương");
    expect(html).toContain("Hóa Quyền");

    // No raw IDs or private data leaked
    expect(html).not.toContain("ziwei.palace");
    expect(html).not.toContain("ziwei.star");
    expect(html).not.toContain("ziwei.branch");
    expect(html).not.toContain("consent");
  });

  it("renders deterministic summary in English", () => {
    const html = renderToStaticMarkup(
      <ZiweiResultSummary chart={chart} birthSummary={birthSummary} locale="en" />,
    );

    expect(html).toContain("1990-05-15");
    expect(html).toContain("Solar calendar");
    expect(html).toContain("06:30");
    expect(html).toContain("Exact minute");
    expect(html).toContain("Female");

    expect(html).toContain("Tiger");
    expect(html).toContain("Zi Wei");
    expect(html).toContain("Tian Fu");

    expect(html).toContain("Career Palace");
    expect(html).toContain("Horse");

    expect(html).toContain("Wu Qu");
    expect(html).toContain("Prosperity");
  });
});
