import { and, eq, gt, isNull, or } from "drizzle-orm";
import { freeAiArtifacts, freeAiChartBudgets, freeAiRequests, type Database } from "@lasoviet/database";
import type { CurrentActor } from "@lasoviet/contracts";
import { createDatabaseZiweiQueryRepository } from "./ziwei-query.repository.js";

// Read-only port. Admission freezes selection and lineage in its atomic transaction.
// An artifact-key mismatch cannot insert a replacement chartVersion slot here.
export function createFreePalaceRequestRepository(database: Database) {
  const sources = createDatabaseZiweiQueryRepository(database);
  return {
    async readAuthorizedSlot(actor: CurrentActor, chartId: string, now: Date, transaction?: Pick<Database, "select">) {
      const reader = transaction ?? database;
      const source = await sources.readAuthorizedChart(actor, chartId, now, reader);
      if (!source) return null;
      const [slot] = await reader.select({ request: freeAiRequests, artifact: freeAiArtifacts })
        .from(freeAiRequests)
        .innerJoin(freeAiChartBudgets, eq(freeAiChartBudgets.chartVersionId, freeAiRequests.chartVersionId))
        .leftJoin(freeAiArtifacts, and(
          eq(freeAiArtifacts.requestId, freeAiRequests.id),
          eq(freeAiArtifacts.deletionGeneration, freeAiChartBudgets.deletionGeneration),
          or(isNull(freeAiArtifacts.expiresAt), gt(freeAiArtifacts.expiresAt, now)),
        ))
        .where(and(eq(freeAiRequests.chartVersionId, source.chartVersionId), isNull(freeAiChartBudgets.deletedAt)))
        .limit(1);
      return { source, slot: slot ?? null };
    },
  };
}
