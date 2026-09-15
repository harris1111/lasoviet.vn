import { ZIWEI_PALACE_IDS } from "@lasoviet/contracts";
import { describe, expect, it } from "vitest";

import {
  buildComprehensiveReportPalaceSectionDigest,
  buildComprehensiveReportSectionDigest,
} from "./comprehensive-report-section-digest-v4.js";

const narrative = (title: string, prose: string, evidenceKeys: string[]) => ({
  title,
  narrative: prose,
  evidenceKeys,
});
const snippet = (text: string, maxChars = 240) => text.trim().slice(0, maxChars).trimEnd();
const firstSentence = (text: string) => {
  const boundary = text.search(/[.!?](?:\s|$)/u);
  return (boundary < 0 ? text : text.slice(0, boundary + 1)).trim();
};

describe("comprehensive report section V4 digest", () => {
  it("is canonical across input order, deduplicates and sorts evidence without mutation", () => {
    const input = [
      { key: "coreAxis", value: narrative("Trục", "Câu đầu. Câu sau.", ["b", "a", "b"]) },
      { key: "overview", value: narrative("Tổng quan", "Nhận định đầu tiên. Phần còn lại.", ["z", "a"]) },
    ];
    const before = JSON.stringify(input);
    const forward = buildComprehensiveReportSectionDigest(input);
    const reverse = buildComprehensiveReportSectionDigest([...input].reverse());

    expect(forward).toEqual(reverse);
    expect(forward.entries.map((entry) => entry.key)).toEqual(["overview", "coreAxis"]);
    expect(forward.entries[0]!.claim).toBe("Nhận định đầu tiên.");
    expect(forward.entries[1]!.evidenceKeys).toEqual(["a", "b"]);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("retains reserved aggregate parents before ordinary entries at the 8000-char cap", () => {
    const configurations = Array.from({ length: 12 }, (_, index) => {
      const prefix = `T${index}`;

      return {
        title: `${prefix}${"t".repeat(120 - prefix.length)}`,
        narrative: `C${index} ${"c".repeat(238)}.`,
        evidenceKeys: Array.from(
          { length: 6 },
          (_, evidenceIndex) =>
            `configuration.${index}.evidence.${String(evidenceIndex).padStart(2, "0")}.${"e".repeat(80)}`,
        ),
      };
    });
    const actions = Array.from({ length: 5 }, (_, index) => ({
      recommendation: `R${index}${"r".repeat(158)}`,
      rationale: `A${index} ${"a".repeat(238)}.`,
      avoid: `V${index}${"v".repeat(158)}`,
      evidenceKeys: Array.from(
        { length: 6 },
        (_, evidenceIndex) =>
          `action.${index}.evidence.${String(evidenceIndex).padStart(2, "0")}.${"e".repeat(80)}`,
      ),
    }));
    const input = [
      {
        key: "keyConfigurations",
        value: configurations,
      },
      {
        key: "practicalDirection",
        value: actions,
      },
      {
        key: "palace:ziwei.palace.life",
        value: {
          ...narrative("Mệnh", "p".repeat(4_900), ["life.evidence"]),
          palaceId: "ziwei.palace.life",
        },
      },
    ] as const;
    expect(configurations.every((configuration) => configuration.title.length <= 120)).toBe(true);
    expect(configurations.every((configuration) => configuration.narrative.length <= 5_000)).toBe(true);
    expect(JSON.stringify(input).length).toBeGreaterThan(8_000);

    const digest = buildComprehensiveReportSectionDigest(input);
    const reversedDigest = buildComprehensiveReportSectionDigest([...input].reverse());
    const configurationEntry = digest.entries.find((entry) => entry.key === "keyConfigurations")!;
    const actionEntry = digest.entries.find((entry) => entry.key === "practicalDirection")!;
    expect(digest.entries.map((entry) => entry.key)).toEqual([
      "keyConfigurations",
      "palace:ziwei.palace.life",
      "practicalDirection",
    ]);
    expect(configurationEntry.configurations).toHaveLength(12);
    expect(actionEntry.actions).toHaveLength(5);
    expect(configurationEntry.configurations.every((item) => item.headline && item.claim)).toBe(true);
    expect(
      actionEntry.actions.every((item) => item.recommendation && item.rationale && item.avoid),
    ).toBe(true);
    expect(configurationEntry.configurations.map((item) => item.headline)).toEqual(
      configurations.map((item) => snippet(item.title, 160)),
    );
    expect(actionEntry.actions.map((item) => item.avoid)).toEqual(
      actions.map((item) => snippet(item.avoid, 160)),
    );
    expect(configurationEntry.configurations[0]!.evidenceKeys).toEqual([
      `configuration.0.evidence.00.${"e".repeat(80)}`,
      `configuration.0.evidence.01.${"e".repeat(80)}`,
      `configuration.0.evidence.02.${"e".repeat(80)}`,
      `configuration.0.evidence.03.${"e".repeat(80)}`,
      `configuration.0.evidence.04.${"e".repeat(80)}`,
      `configuration.0.evidence.05.${"e".repeat(80)}`,
    ]);
    expect(configurationEntry.configurations[11]!.evidenceKeys).toEqual([]);
    expect(actionEntry.actions.every((item) => item.evidenceKeys.length >= 0)).toBe(true);
    expect(JSON.stringify(digest).length).toBeLessThanOrEqual(8_000);
    expect(JSON.stringify(reversedDigest)).toBe(JSON.stringify(digest));
  });

  it("builds palace-only digests from passed palace checkpoints and excludes non-palaces", () => {
    const input = [
      { key: "overview", value: narrative("Tổng quan", "Không đưa vào.", ["overview"]) },
      ...ZIWEI_PALACE_IDS.map((palaceId, index) => ({
        key: `palace:${palaceId}`,
        value: { ...narrative(`Cung ${index}`, `Cung ${index} có nhận định.`, [`p${index}`]), palaceId },
      })),
    ];
    const digest = buildComprehensiveReportPalaceSectionDigest([...input].reverse());
    expect(digest.entries).toHaveLength(ZIWEI_PALACE_IDS.length);
    expect(digest.entries.every((entry) => entry.key.startsWith("palace:"))).toBe(true);
    expect(digest.entries.map((entry) => entry.key)).toEqual(
      ZIWEI_PALACE_IDS.map((id) => `palace:${id}`),
    );
  });

  it("retains every bounded configuration item, evidence key, and canonical order", () => {
    const configurations = Array.from({ length: 12 }, (_, index) => ({
      title: `Cách cục ${index} ${"t".repeat(100)}`,
      narrative: `Luận điểm ${index} ${"n".repeat(230)}. Phần sau không dùng.`,
      evidenceKeys: [`configuration.${index}.b`, `configuration.${index}.a`, `configuration.${index}.a`],
    }));
    const input = [{ key: "keyConfigurations", value: configurations }];
    const before = JSON.stringify(input);
    const forward = buildComprehensiveReportSectionDigest(input);
    const reverse = buildComprehensiveReportSectionDigest([...input].reverse());
    const entry = forward.entries[0]!;

    expect(forward).toEqual(reverse);
    expect(entry.configurations).toHaveLength(12);
    expect(entry.configurations.map((item) => item.headline)).toEqual(
      configurations.map((item) => snippet(item.title, 160)),
    );
    expect(entry.configurations.map((item) => item.claim)).toEqual(
      configurations.map((item) => snippet(firstSentence(item.narrative), 160)),
    );
    expect(entry.configurations.every((item) => item.evidenceKeys.length === 2)).toBe(true);
    expect(entry.configurations[11]!.evidenceKeys).toEqual(["configuration.11.a", "configuration.11.b"]);
    expect(JSON.stringify(forward).length).toBeLessThanOrEqual(8_000);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("retains every bounded practical action triplet, evidence key, and canonical order", () => {
    const actions = Array.from({ length: 5 }, (_, index) => ({
      recommendation: `Khuyến nghị ${index} ${"r".repeat(220)}`,
      rationale: `Lý do ${index} ${"a".repeat(225)}. Phần sau không dùng.`,
      avoid: `Tránh ${index} ${"v".repeat(230)}`,
      evidenceKeys: [`action.${index}.b`, `action.${index}.a`, `action.${index}.a`],
    }));
    const input = [{ key: "practicalDirection", value: actions }];
    const before = JSON.stringify(input);
    const forward = buildComprehensiveReportSectionDigest(input);
    const reverse = buildComprehensiveReportSectionDigest([...input].reverse());
    const entry = forward.entries[0]!;

    expect(forward).toEqual(reverse);
    expect(entry.actions).toHaveLength(5);
    expect(entry.actions.map((item) => item.recommendation)).toEqual(
      actions.map((item) => snippet(item.recommendation, 160)),
    );
    expect(entry.actions.map((item) => item.rationale)).toEqual(
      actions.map((item) => snippet(firstSentence(item.rationale), 160)),
    );
    expect(entry.actions.map((item) => item.avoid)).toEqual(
      actions.map((item) => snippet(item.avoid, 160)),
    );
    expect(entry.actions.every((item) => item.evidenceKeys.length === 2)).toBe(true);
    expect(entry.actions[4]!.evidenceKeys).toEqual(["action.4.a", "action.4.b"]);
    expect(JSON.stringify(forward).length).toBeLessThanOrEqual(8_000);
    expect(JSON.stringify(input)).toBe(before);
  });
});
