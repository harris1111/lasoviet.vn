import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type {
  BirthProfileV1,
  NormalizedBirthProfileV1,
  NormalizedZiweiChartV1,
} from "@lasoviet/contracts";
import {
  normalizeBirthProfile,
  resolveZiweiTimeIndex,
} from "../../backend/src/birth-profile/birth-profile.service.js";
import {
  IztroAdapter,
  iztroDefaultConfig,
  iztroTimeIndex,
} from "../../engine-adapters/src/index.js";

type FixtureExpected = {
  result: "calculated" | "ineligible";
  normalizedPrecision?: NormalizedBirthProfileV1["normalizedTime"]["precision"];
  timezoneSource?: NormalizedBirthProfileV1["timezoneProvenance"]["source"];
  limitation?: string;
  palaceCount?: number;
  adapterTimeIndex?: number;
  timeError?: string;
  normalizedFacts?: {
    soulPalaceEarthlyBranchId: string;
    bodyPalaceEarthlyBranchId: string;
    principalStar: {
      palaceId: string;
      starId: string;
    };
  };
  referenceMethod?: "trusted-overlap" | "method-incompatible";
};

export type ZiweiP0Fixture = {
  id: string;
  boundaryClass: string;
  birthProfileFixture?: string;
  input?: BirthProfileV1;
  inputOverrides?: Partial<BirthProfileV1>;
  expected: FixtureExpected;
  precision: BirthProfileV1["time"]["precision"];
  source: string;
  reviewStatus: "reviewed" | "reviewed-with-limitations";
  differences: string;
};

export type ZiweiP0FixtureManifest = {
  version: 1;
  engine: {
    id: string;
    version: string;
    adapterVersion: string;
    ruleSetId: string;
  };
  fixtures: ZiweiP0Fixture[];
};

export type ZiweiP0FixtureResult = {
  fixture: ZiweiP0Fixture;
  normalized: NormalizedBirthProfileV1;
  adapterTimeIndex?: number;
  status: "calculated" | "ineligible";
  timeError?: string;
  chart?: Awaited<ReturnType<IztroAdapter["calculate"]>>;
};

export type ZiweiP0FixtureDifference = {
  code: "UNEXPLAINED_MISMATCH" | "REFERENCE_METHOD_INCOMPATIBLE";
  field: string;
  expected: string;
  actual: string;
};

export type ZiweiP0FixtureEvaluation = {
  fixtureId: string;
  pass: boolean;
  differences: ZiweiP0FixtureDifference[];
};

const root = new URL("../../../", import.meta.url);
const manifestUrl = new URL("./p0-fixtures.json", import.meta.url);

async function readJson<T>(url: URL): Promise<T> {
  return JSON.parse(await readFile(url, "utf8")) as T;
}

function mergeInput(
  input: BirthProfileV1,
  overrides: Partial<BirthProfileV1> | undefined,
): BirthProfileV1 {
  return {
    ...input,
    ...overrides,
    calendar: overrides?.calendar ?? input.calendar,
    time: overrides?.time ?? input.time,
    timezone: overrides?.timezone ?? input.timezone,
  };
}

export async function readZiweiP0FixtureManifest(): Promise<ZiweiP0FixtureManifest> {
  return readJson<ZiweiP0FixtureManifest>(manifestUrl);
}

async function fixtureInput(fixture: ZiweiP0Fixture): Promise<BirthProfileV1> {
  if (fixture.input !== undefined) {
    return fixture.input;
  }
  if (fixture.birthProfileFixture === undefined) {
    throw new Error(`FIXTURE_INPUT_MISSING:${fixture.id}`);
  }
  const source = await readJson<{ input: BirthProfileV1 }>(
    new URL(fixture.birthProfileFixture, root),
  );
  return mergeInput(source.input, fixture.inputOverrides);
}

export async function runIztroP0Fixtures(
  adapter = new IztroAdapter(),
): Promise<ZiweiP0FixtureResult[]> {
  const manifest = await readZiweiP0FixtureManifest();
  return Promise.all(
    manifest.fixtures.map(async (fixture) => {
      const normalized = normalizeBirthProfile(await fixtureInput(fixture));
      if (!normalized.ok) {
        throw new Error(`FIXTURE_NORMALIZATION_FAILED:${fixture.id}:${normalized.error.code}`);
      }
      const time = resolveZiweiTimeIndex(normalized.value);
      if (!time.ok) {
        return {
          fixture,
          normalized: normalized.value,
          status: "ineligible",
          timeError: time.error.code,
        };
      }
      return {
        fixture,
        normalized: normalized.value,
        adapterTimeIndex: iztroTimeIndex(normalized.value),
        status: "calculated",
        chart: await adapter.calculate(
          { birthProfile: normalized.value },
          iztroDefaultConfig,
        ),
      };
    }),
  );
}

export function fixtureSourcePath(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, root));
}

function palaceBranch(chart: NormalizedZiweiChartV1, palaceId: string): string | undefined {
  return chart.palaces.find((palace) => palace.id === palaceId)?.earthlyBranchId;
}

export function evaluateZiweiP0Fixtures(
  results: ZiweiP0FixtureResult[],
): ZiweiP0FixtureEvaluation[] {
  return results.map((result) => {
    const differences: ZiweiP0FixtureDifference[] = [];
    const facts = result.fixture.expected.normalizedFacts;
    if (
      result.fixture.expected.result === "ineligible"
      || facts === undefined
      || result.chart === undefined
      || !result.chart.ok
    ) {
      return {
        fixtureId: result.fixture.id,
        pass: result.fixture.expected.result === "ineligible"
          ? result.status === "ineligible" && result.timeError === result.fixture.expected.timeError
          : false,
        differences,
      };
    }
    const actualFacts = {
      soulPalaceEarthlyBranchId: palaceBranch(
        result.chart.output,
        result.chart.output.soulPalaceId,
      ),
      bodyPalaceEarthlyBranchId: palaceBranch(
        result.chart.output,
        result.chart.output.bodyPalaceId,
      ),
      hasPrincipalStar: result.chart.output.palaces
        .find((palace) => palace.id === facts.principalStar.palaceId)
        ?.stars.some((star) => star.id === facts.principalStar.starId) ?? false,
    };
    if (result.fixture.expected.referenceMethod === "method-incompatible") {
      differences.push({
        code: "REFERENCE_METHOD_INCOMPATIBLE",
        field: "referenceMethod",
        expected: "trusted-overlap",
        actual: "method-incompatible",
      });
    }
    for (const [field, expected, actual] of [
      ["soulPalaceEarthlyBranchId", facts.soulPalaceEarthlyBranchId, actualFacts.soulPalaceEarthlyBranchId],
      ["bodyPalaceEarthlyBranchId", facts.bodyPalaceEarthlyBranchId, actualFacts.bodyPalaceEarthlyBranchId],
      ["principalStar", `${facts.principalStar.palaceId}:${facts.principalStar.starId}`, actualFacts.hasPrincipalStar ? `${facts.principalStar.palaceId}:${facts.principalStar.starId}` : "missing"],
    ] as const) {
      if (expected !== actual) {
        differences.push({
          code: "UNEXPLAINED_MISMATCH",
          field,
          expected,
          actual: actual ?? "missing",
        });
      }
    }
    return {
      fixtureId: result.fixture.id,
      pass: !differences.some((difference) => difference.code === "UNEXPLAINED_MISMATCH"),
      differences,
    };
  });
}
