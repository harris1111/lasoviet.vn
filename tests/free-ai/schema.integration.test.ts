import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { createRequire } from "node:module";
const postgres: typeof import("../../packages/database/node_modules/postgres").default = createRequire(new URL("../../packages/database/package.json", import.meta.url))("postgres");
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runMigrations } from "../../packages/database/src/migrate.js";

describe("free AI database constraints", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let db: ReturnType<typeof postgres>;
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    await runMigrations(container.getConnectionUri());
    db = postgres(container.getConnectionUri());
  }, 120000);
  afterAll(async () => { if (db) await db.end(); if (container) await container.stop(); });

  async function seed(chart: string) {
    const [subject] = await db`INSERT INTO free_ai_quota_subjects(kind) VALUES ('guest') RETURNING id`;
    await db`INSERT INTO free_ai_chart_budgets(chart_version_id) VALUES (${chart})`;
    const [request] = await db`INSERT INTO free_ai_requests(chart_version_id,subject_id,palace_id,locale,deletion_generation,admission_day,pricing_snapshot_id,lineage_hash)
      VALUES (${chart},${subject!.id},'ziwei.palace.life','vi',0,'2026-10-02','price','hash') RETURNING id`;
    return { subject: subject!.id, request: request!.id };
  }
  it("enforces chart slot and atomic rollback without touching legacy tables", async () => {
    const { subject } = await seed("slot");
    await expect(db.begin(async (tx) => {
      await tx`INSERT INTO free_ai_daily_budgets(utc_day) VALUES ('2026-10-02')`;
      await tx`INSERT INTO free_ai_requests(chart_version_id,subject_id,palace_id,locale,deletion_generation,admission_day,pricing_snapshot_id,lineage_hash)
        VALUES ('slot',${subject},'ziwei.palace.wealth','en',0,'2026-10-02','new-price','new-key')`;
    })).rejects.toMatchObject({ code: "23505" });
    expect(await db`SELECT * FROM free_ai_daily_budgets WHERE utc_day='2026-10-02'`).toHaveLength(0);
    expect(await db`SELECT to_regclass('commerce_orders') AS orders, to_regclass('generated_preview_requests') AS previews`).toEqual([expect.objectContaining({ orders: "commerce_orders", previews: "generated_preview_requests" })]);
  });
  it("enforces unique admissions/settlements and keeps quota after private artifact deletion", async () => {
    const { subject, request } = await seed("retention");
    await db`INSERT INTO free_ai_admissions(request_id,subject_id) VALUES (${request},${subject})`;
    await expect(db`INSERT INTO free_ai_admissions(request_id,subject_id) VALUES (${request},${subject})`).rejects.toMatchObject({ code: "23505" });
    await db`INSERT INTO free_ai_settlements(request_id,attempt_id,outcome,actual_micro_vnd) VALUES (${request},'123e4567-e89b-42d3-a456-426614174000','resolved',1200000)`;
    await expect(db`INSERT INTO free_ai_settlements(request_id,attempt_id,outcome,actual_micro_vnd) VALUES (${request},'123e4567-e89b-42d3-a456-426614174001','resolved',1200000)`).rejects.toMatchObject({ code: "23505" });
    await db`INSERT INTO free_ai_artifacts(request_id,deletion_generation) VALUES (${request},0)`;
    await db`DELETE FROM free_ai_artifacts WHERE request_id=${request}`;
    expect(await db`SELECT * FROM free_ai_admissions WHERE request_id=${request}`).toHaveLength(1);
    await expect(db`UPDATE free_ai_chart_budgets SET reserved_micro_vnd=-1 WHERE chart_version_id='retention'`).rejects.toMatchObject({ code: "23514" });
    await expect(db`UPDATE free_ai_requests SET fenced_at=clock_timestamp() WHERE id=${request}`).rejects.toMatchObject({ code: "23514" });
  });
});
