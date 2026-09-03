import { and, desc, eq, gte, lt, lte, or } from "drizzle-orm";

import type {
  AdminAuditPageV1,
  AdminAuditSearchFiltersV1,
} from "@lasoviet/contracts";
import { adminAuditLogs, type Database } from "@lasoviet/database";

import type { AuditQueryRepository } from "./audit-query.service.js";

export function createDatabaseAuditQueryRepository(database: Database): AuditQueryRepository {
  return {
    async search(filters: AdminAuditSearchFiltersV1): Promise<AdminAuditPageV1> {
      const conditions = [
        filters.dateFrom === undefined ? undefined : gte(adminAuditLogs.createdAt, new Date(filters.dateFrom)),
        filters.dateTo === undefined ? undefined : lte(adminAuditLogs.createdAt, new Date(filters.dateTo)),
        filters.actorId === undefined ? undefined : eq(adminAuditLogs.actorId, filters.actorId),
        filters.operation === undefined ? undefined : eq(adminAuditLogs.operation, filters.operation),
        filters.targetType === undefined ? undefined : eq(adminAuditLogs.targetType, filters.targetType),
        filters.targetId === undefined ? undefined : eq(adminAuditLogs.targetId, filters.targetId),
        filters.traceId === undefined ? undefined : eq(adminAuditLogs.traceId, filters.traceId),
        filters.result === undefined ? undefined : eq(adminAuditLogs.policyResult, filters.result),
      ].filter((condition): condition is NonNullable<typeof condition> => condition !== undefined);
      const cursor = filters.cursor?.split("|");
      if (cursor?.length === 2) {
        const createdAt = new Date(cursor[0]!);
        if (!Number.isNaN(createdAt.getTime())) {
          const afterCursor = or(
            lt(adminAuditLogs.createdAt, createdAt),
            and(eq(adminAuditLogs.createdAt, createdAt), lt(adminAuditLogs.id, cursor[1]!)),
          );
          if (afterCursor !== undefined) conditions.push(afterCursor);
        }
      }
      const where = conditions.length === 0 ? undefined : and(...conditions);
      const rows = await database.select().from(adminAuditLogs).where(where)
        .orderBy(desc(adminAuditLogs.createdAt), desc(adminAuditLogs.id))
        .limit(filters.pageSize + 1);
      return {
        pageSize: filters.pageSize,
        nextCursor: rows.length > filters.pageSize
          ? `${rows[filters.pageSize - 1]!.createdAt.toISOString()}|${rows[filters.pageSize - 1]!.id}`
          : null,
        items: rows.slice(0, filters.pageSize).map((row) => ({
          id: row.id,
          actorId: row.actorId,
          roleAssignmentId: row.roleAssignmentId,
          capability: row.capability,
          operation: row.operation,
          target: { type: row.targetType, id: row.targetId },
          requestId: row.requestId,
          traceId: row.traceId,
          result: row.policyResult as "allowed" | "denied",
          redactionLevel: "redacted" as const,
          reasonCode: row.reasonCode as AdminAuditPageV1["items"][number]["reasonCode"],
          idempotencyKey: row.idempotencyKey,
          beforeVersion: row.beforeVersion,
          afterVersion: row.afterVersion,
          resultSummary: row.resultSummary,
          createdAt: row.createdAt.toISOString(),
        })),
      };
    },
  };
}
