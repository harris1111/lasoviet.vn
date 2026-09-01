import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { BirthProfileV1, NormalizedBirthProfileV1 } from "@lasoviet/contracts";
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
