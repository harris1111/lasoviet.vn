import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase } from "../client.js";
import { runMigrations } from "../migrate.js";
import { authUsers } from "./auth.js";
import {
  birthProfileReadingContextMutationReceipts,
  birthProfileReadingContextRevisions,
  birthProfileReadingContexts,
  birthProfiles,
} from "./birth-profile.js";

describe("reading context database schema", () => {
  let container:
    | Awaited<ReturnType<PostgreSqlContainer["start"]>>
    | undefined;
  let databaseUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_reading_context_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
  }, 120_000);

  afterAll(async () => {
    if (container) {
      await container.stop();
    }
  }, 30_000);

  it("upgrades a baseline database through the real reading context migration", async () => {
    const baselineDatabaseName = "lasoviet_reading_context_upgrade";
    const upgradeDatabaseUrl = new URL(databaseUrl);
    upgradeDatabaseUrl.pathname = `/${baselineDatabaseName}`;
    const baselineDirectory = await mkdtemp(
      join(tmpdir(), "lasoviet-reading-context-baseline-"),
    );
    let baselineClient: ReturnType<typeof postgres> | undefined;
    let verificationClient: ReturnType<typeof postgres> | undefined;

    try {
      const migrationRoot = new URL("../../drizzle/", import.meta.url);
      const journal = JSON.parse(
        await readFile(new URL("meta/_journal.json", migrationRoot), "utf8"),
      ) as {
        version: string;
        dialect: string;
        entries: Array<{
          idx: number;
          version: string;
          when: number;
          tag: string;
          breakpoints: boolean;
        }>;
      };
      const baselineJournal = {
        ...journal,
        entries: journal.entries.filter((entry) => entry.idx <= 26),
      };

      await mkdir(join(baselineDirectory, "meta"));
      await Promise.all(
        baselineJournal.entries.map((entry) =>
          copyFile(
            new URL(`${entry.tag}.sql`, migrationRoot),
            join(baselineDirectory, `${entry.tag}.sql`),
          ),
        ),
      );
      await writeFile(
        join(baselineDirectory, "meta", "_journal.json"),
        JSON.stringify(baselineJournal),
      );

      const adminClient = postgres(databaseUrl);
      try {
        await adminClient.unsafe(`CREATE DATABASE ${baselineDatabaseName}`);
      } finally {
        await adminClient.end();
      }

      baselineClient = postgres(upgradeDatabaseUrl.toString());
      await migrate(drizzle(baselineClient), {
        migrationsFolder: baselineDirectory,
      });
      const [baselineTableCheck] = await baselineClient<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'birth_profile_reading_contexts'
        ) AS exists
      `;
      expect(baselineTableCheck?.exists).toBe(false);
      await baselineClient.end();
      baselineClient = undefined;

      await expect(runMigrations(upgradeDatabaseUrl.toString())).resolves.toMatchObject({
        appliedMigrations: expect.any(Array),
      });

      verificationClient = postgres(upgradeDatabaseUrl.toString());
      const tables = await verificationClient<{ tableName: string }[]>`
        SELECT table_name AS "tableName"
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'birth_profile_reading_context_mutation_receipts',
            'birth_profile_reading_context_revisions',
            'birth_profile_reading_contexts'
          )
        ORDER BY table_name
      `;
      expect(tables.map((table) => table.tableName)).toEqual([
        "birth_profile_reading_context_mutation_receipts",
        "birth_profile_reading_context_revisions",
        "birth_profile_reading_contexts",
      ]);
    } finally {
      if (baselineClient) {
        await baselineClient.end();
      }
      if (verificationClient) {
        await verificationClient.end();
      }

      const cleanupClient = postgres(databaseUrl);
      try {
        await cleanupClient.unsafe(
          `DROP DATABASE IF EXISTS ${baselineDatabaseName} WITH (FORCE)`,
        );
      } finally {
        await cleanupClient.end();
      }
      await rm(baselineDirectory, { force: true, recursive: true });
    }
  }, 120_000);

  it("applies the reading context migration and enforces context ownership and lifecycle", async () => {
    await expect(runMigrations(databaseUrl)).resolves.toMatchObject({
      appliedMigrations: expect.any(Array),
    });

    const database = createDatabase(databaseUrl);
    await database.insert(authUsers).values([
      {
        id: "reading-context-user-1",
        name: "Reading Context User",
        email: "reading-context-1@example.test",
      },
      {
        id: "reading-context-user-2",
        name: "Reading Context User Two",
        email: "reading-context-2@example.test",
      },
    ]);
    await database.insert(birthProfiles).values([
      { id: "reading-context-profile-1", userId: "reading-context-user-1" },
      { id: "reading-context-profile-2", userId: "reading-context-user-2" },
    ]);

    await database.insert(birthProfileReadingContextRevisions).values({
      id: "reading-context-revision-1",
      profileId: "reading-context-profile-1",
      revisionNumber: 1,
      lifeStage: "early_career",
      topConcern: "career",
    });
    await expect(
      database.insert(birthProfileReadingContextRevisions).values({
        id: "reading-context-revision-duplicate",
        profileId: "reading-context-profile-1",
        revisionNumber: 1,
        lifeStage: "studying",
      }),
    ).rejects.toBeDefined();
    await database.insert(birthProfileReadingContexts).values({
      profileId: "reading-context-profile-1",
      currentRevisionId: "reading-context-revision-1",
      stateVersion: 1,
      lastRevisionNumber: 1,
    });
    await database.insert(birthProfileReadingContextMutationReceipts).values({
      profileId: "reading-context-profile-1",
      idempotencyKey: "reading-context-set-1",
      commandType: "set",
      requestFingerprint:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      resultStateVersion: 1,
      resultRevisionId: "reading-context-revision-1",
      resultRevisionNumber: 1,
      resultKind: "created",
    });

    const [clearedContext] = await database
      .update(birthProfileReadingContexts)
      .set({
        currentRevisionId: null,
        stateVersion: 2,
      })
      .where(
        eq(
          birthProfileReadingContexts.profileId,
          "reading-context-profile-1",
        ),
      )
      .returning({
        profileId: birthProfileReadingContexts.profileId,
        currentRevisionId: birthProfileReadingContexts.currentRevisionId,
        stateVersion: birthProfileReadingContexts.stateVersion,
      });
    expect(clearedContext).toEqual({
      profileId: "reading-context-profile-1",
      currentRevisionId: null,
      stateVersion: 2,
    });

    await expect(
      database.insert(birthProfileReadingContextRevisions).values({
        id: "reading-context-revision-invalid-enum",
        profileId: "reading-context-profile-1",
        revisionNumber: 2,
        lifeStage: "invalid",
      }),
    ).rejects.toBeDefined();
    await expect(
      database.insert(birthProfileReadingContextRevisions).values({
        id: "reading-context-revision-empty",
        profileId: "reading-context-profile-1",
        revisionNumber: 2,
      }),
    ).rejects.toBeDefined();
    await expect(
      database.insert(birthProfileReadingContextRevisions).values({
        id: "reading-context-revision-zero",
        profileId: "reading-context-profile-1",
        revisionNumber: 0,
        topConcern: "money",
      }),
    ).rejects.toBeDefined();
    await expect(
      database.insert(birthProfileReadingContexts).values({
        profileId: "reading-context-profile-2",
        currentRevisionId: "reading-context-revision-1",
        stateVersion: 1,
        lastRevisionNumber: 1,
      }),
    ).rejects.toBeDefined();
    await expect(
      database.insert(birthProfileReadingContextMutationReceipts).values({
        profileId: "reading-context-profile-1",
        idempotencyKey: "invalid-receipt",
        commandType: "invalid",
        requestFingerprint: "not-a-sha256",
        resultStateVersion: 1,
        resultRevisionId: "reading-context-revision-1",
        resultRevisionNumber: 1,
        resultKind: "created",
      }),
    ).rejects.toBeDefined();

    await database
      .delete(birthProfiles)
      .where(eq(birthProfiles.id, "reading-context-profile-1"));

    await expect(
      database
        .select()
        .from(birthProfileReadingContextRevisions)
        .where(
          eq(
            birthProfileReadingContextRevisions.profileId,
            "reading-context-profile-1",
          ),
        ),
    ).resolves.toEqual([]);
    await expect(
      database
        .select()
        .from(birthProfileReadingContexts)
        .where(
          eq(
            birthProfileReadingContexts.profileId,
            "reading-context-profile-1",
          ),
        ),
    ).resolves.toEqual([]);
    await expect(
      database
        .select()
        .from(birthProfileReadingContextMutationReceipts)
        .where(
          eq(
            birthProfileReadingContextMutationReceipts.profileId,
            "reading-context-profile-1",
          ),
        ),
    ).resolves.toEqual([]);

    await database.$client.end();
  }, 120_000);
});
