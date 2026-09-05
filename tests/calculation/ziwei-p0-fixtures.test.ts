import { describe, expect, it } from "vitest";

import {
  evaluateZiweiP0Fixtures,
  readZiweiP0FixtureManifest,
  runIztroP0Fixtures,
} from "../../packages/test-fixtures/ziwei/run-iztro-fixtures.js";

describe("Zi Wei P0 fixtures", () => {
  it("runs the approved manifest through the real adapter", async () => {
    const [manifest, results] = await Promise.all([
      readZiweiP0FixtureManifest(),
      runIztroP0Fixtures(),
    ]);

    expect(manifest.version).toBe(1);
    expect(manifest.engine).toMatchObject({
      id: "ziwei.iztro",
      version: "2.6.0",
      ruleSetId: "ziwei.default",
    });
    expect(results).toHaveLength(11);

    for (const result of results) {
      expect(result.normalized.normalizedTime.precision).toBe(
        result.fixture.expected.normalizedPrecision ?? result.fixture.precision,
      );
      expect(result.fixture.source).not.toHaveLength(0);
      expect(result.fixture.differences).not.toHaveLength(0);

      if (result.fixture.expected.result === "ineligible") {
        expect(result).toMatchObject({
          status: "ineligible",
          timeError: result.fixture.expected.timeError,
        });
        continue;
      }

      expect(result.status).toBe("calculated");
      expect(result.chart).toMatchObject({ ok: true });
      if (result.chart === undefined || !result.chart.ok) {
        continue;
      }
      const palaceIds = result.chart.output.palaces.map((palace) => palace.id);
      expect(palaceIds).toHaveLength(result.fixture.expected.palaceCount);
      expect(new Set(palaceIds).size).toBe(result.fixture.expected.palaceCount);
      expect(result.chart.provenance).toMatchObject({
        engineId: manifest.engine.id,
        engineVersion: manifest.engine.version,
        adapterVersion: manifest.engine.adapterVersion,
        ruleSetId: manifest.engine.ruleSetId,
      });
      if (result.fixture.expected.timezoneSource !== undefined) {
        expect(result.normalized.timezoneProvenance.source).toBe(
          result.fixture.expected.timezoneSource,
        );
      }
      if (result.fixture.expected.limitation !== undefined) {
        expect(result.normalized.limitations).toContain(
          result.fixture.expected.limitation,
        );
      }
      if (result.fixture.expected.adapterTimeIndex !== undefined) {
        expect(result.adapterTimeIndex).toBe(
          result.fixture.expected.adapterTimeIndex,
        );
      }
    }

    const evaluations = evaluateZiweiP0Fixtures(results);
    expect(evaluations).toHaveLength(11);
    expect(evaluations.every((evaluation) => evaluation.pass)).toBe(true);
    expect(evaluations.flatMap((evaluation) => evaluation.differences)).not.toContainEqual(
      expect.objectContaining({ code: "UNEXPLAINED_MISMATCH" }),
    );
  });
});
