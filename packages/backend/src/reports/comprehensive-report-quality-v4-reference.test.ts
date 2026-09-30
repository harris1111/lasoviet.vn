import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { resolveZiweiReportQualityConfig } from "@lasoviet/config";

import {
  findBannedOpener,
  findBannedPhrase,
  findMachineSubheading,
  overviewArcProblem,
  starDensityProblem,
} from "./comprehensive-report-beginner-gates.js";
import { KNOWN_CANONICAL_IDENTIFIERS_VI } from "./comprehensive-report-validator-v4.js";

const root = fileURLToPath(new URL("../../../../prototype/revamp-2026-09/", import.meta.url));
const context: { window: { LSV?: any }; LSV?: any } = { window: {} };
context.LSV = context.window.LSV = {};
vm.createContext(context);
for (const file of ["doc-bao-cao-tuong-tac-data.js", "doc-bao-cao-tuong-tac-palaces.js"]) {
  vm.runInContext(readFileSync(root + file, "utf8"), context);
}
const LSV = context.LSV;
const config = resolveZiweiReportQualityConfig(
  "ziwei.comprehensive.report.v4.2-sectioned-beginner",
  "ziwei.comprehensive.quality.v2.4-beginner",
);
if (config.version !== "ziwei.comprehensive.quality.v2.4-beginner") throw new Error("wrong config");
const STAR_LABELS = Object.entries(KNOWN_CANONICAL_IDENTIFIERS_VI)
  .filter(([id]) => id.startsWith("ziwei.star."))
  .map(([, label]) => label.replace(/^sao\s+/u, ""));

const references: Array<[string, string]> = [
  ...LSV.CHAPTERS.filter((c: any) => Array.isArray(c.detail)).map((c: any) => [c.id, c.detail.join("\n\n")]),
  ...Object.entries(LSV.PALACE_READINGS).map(([branch, r]: [string, any]) => [`palace ${branch}`, r.detail.join("\n\n")]),
];

describe("founder-approved reference texts pass the v2.4 gates", () => {
  it.each(references)("%s", (id, text) => {
    expect(findBannedPhrase(text, config.bannedPhrases)).toBeNull();
    expect(findBannedOpener(text, config.bannedOpeners)).toBeNull();
    expect(findMachineSubheading(text)).toBeNull();
    expect(starDensityProblem(text, STAR_LABELS, config.maxDistinctStarNamesPer80Syllables)).toBeNull();
    if (id === "tong-quan") expect(overviewArcProblem(text, STAR_LABELS, config.overviewMinimumParagraphs)).toBeNull();
  });
});
