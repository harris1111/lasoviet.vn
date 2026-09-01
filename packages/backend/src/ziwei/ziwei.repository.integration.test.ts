import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authUsers,
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  createDatabase,
  runMigrations,
  ziweiChartVersions,
  ziweiCharts,
} from "@lasoviet/database";

import { createDatabaseZiweiCalculationRepository } from "./ziwei.repository.js";

describe("Ziwei calculation repository", () => {
  let container:
    | Awaited<ReturnType<PostgreSqlContainer["start"]>>
    | undefined;
  let databaseUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_ziwei_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
  }, 120_000);

  afterAll(async () => {
    if (container) {
      await container.stop();
    }
  }, 30_000);

  it("uses one immutable run and chart version for concurrent duplicate requests", async () => {
    const database = createDatabase(databaseUrl);
    const now = new Date("2026-09-01T00:00:00Z");
    await database.insert(authUsers).values({
      id: "ziwei-user",
      name: "Zi Wei User",
      email: "ziwei-user@example.test",
    });
    await database.insert(birthProfiles).values({
      id: "ziwei-profile",
      userId: "ziwei-user",
      createdAt: now,
      updatedAt: now,
    });
    await database.insert(birthProfileRevisions).values({
      id: "ziwei-revision",
      profileId: "ziwei-profile",
      revisionNumber: 1,
      originalInput: {
        version: 1,
        calendar: { kind: "solar", date: "1990-01-01" },
        time: { precision: "exact_minute", localTime: "12:00" },
        timezone: { offsetMinutes: 420 },
        gender: "male",
        consentVersion: "2026-09-01",
      },
      normalizedInput: {
        version: 1,
        normalizedCalendar: { kind: "solar", date: "1990-01-01" },
        normalizedTime: { precision: "exact_minute", localTime: "12:00" },
        timezoneProvenance: { source: "offset", offsetMinutes: 420 },
        utcInstant: "1990-01-01T05:00:00.000Z",
        normalizationWarnings: [],
        limitations: [],
      },
      normalizationWarnings: [],
      limitations: [],
      consentVersion: "2026-09-01",
      createdAt: now,
    });
    const repository = createDatabaseZiweiCalculationRepository(database);
    const input = {
      profileId: "ziwei-profile",
      revisionId: "ziwei-revision",
      idempotencyKey: "input-hash:2.6.0:1:config-hash",
      chart: {
        version: 1,
        systemId: "ziwei",
        palaces: [],
        transformations: [],
        soulPalaceId: "ziwei.palace.life",
        bodyPalaceId: "ziwei.palace.life",
        horoscopeCapabilities: [],
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
          calculatedAt: "2026-09-01T00:00:00+00:00",
          limitations: [],
        },
      },
      rawSnapshot: { private: true },
      now,
    } as const;

    const [first, second] = await Promise.all([
      repository.create(input),
      repository.create(input),
    ]);

    expect(first).toMatchObject({ chartId: expect.any(String) });
    expect(second).toMatchObject({
      chartId: first.chartId,
      chartVersionId: first.chartVersionId,
    });
    expect(
      await database.select().from(calculationRuns).where(
        eq(calculationRuns.idempotencyKey, input.idempotencyKey),
      ),
    ).toHaveLength(1);
    expect(await database.select().from(ziweiCharts)).toHaveLength(1);
    expect(await database.select().from(ziweiChartVersions)).toHaveLength(1);

    await database.insert(authUsers).values({
      id: "ziwei-user-other",
      name: "Other Zi Wei User",
      email: "other-ziwei-user@example.test",
    });
    await database.insert(birthProfiles).values({
      id: "ziwei-profile-other",
      userId: "ziwei-user-other",
      createdAt: now,
      updatedAt: now,
    });
    await database.insert(birthProfileRevisions).values({
      id: "ziwei-revision-other",
      profileId: "ziwei-profile-other",
      revisionNumber: 1,
      originalInput: {
        version: 1,
        calendar: { kind: "solar", date: "1990-01-01" },
        time: { precision: "exact_minute", localTime: "12:00" },
        timezone: { offsetMinutes: 420 },
        gender: "male",
        consentVersion: "2026-09-01",
      },
      normalizedInput: {
        version: 1,
        normalizedCalendar: { kind: "solar", date: "1990-01-01" },
        normalizedTime: { precision: "exact_minute", localTime: "12:00" },
        timezoneProvenance: { source: "offset", offsetMinutes: 420 },
        utcInstant: "1990-01-01T05:00:00.000Z",
        normalizationWarnings: [],
        limitations: [],
      },
      normalizationWarnings: [],
      limitations: [],
      consentVersion: "2026-09-01",
      createdAt: now,
    });
    const other = await repository.create({
      ...input,
      profileId: "ziwei-profile-other",
      revisionId: "ziwei-revision-other",
    });

    expect(other.chartId).not.toBe(first.chartId);
    expect(await database.select().from(calculationRuns)).toHaveLength(2);
    await database.$client.end();
  }, 120_000);
});
