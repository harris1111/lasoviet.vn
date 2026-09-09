import { and, eq, gte, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import type { CurrentActor, Result } from "@lasoviet/contracts";
import {
  auditLogs,
  commerceAlertDeliveries,
  commercePaymentEvents,
  commerceReconciliationState,
  commerceUnmatchedPayments,
  type Database,
} from "@lasoviet/database";
import type {
  CircuitOpenAlertPayload,
  ReportTerminalFailureAlertPayload,
  StalePaymentAlertPayload,
  TelegramAlertProvider,
  TelegramAlertResult,
} from "./telegram-alert.js";
import type { createAdminAccessService } from "../admin-access/capability.service.js";

export type AdminAccessService = ReturnType<typeof createAdminAccessService>;

export type ReconciliationOperationsOptions = {
  database: Database;
  telegramAlert?: TelegramAlertProvider;
  adminAccessService?: AdminAccessService;
  now?: () => Date;
};

export type CircuitEvaluationResult = {
  circuitStatus: "closed" | "open";
  transitioned: boolean;
  reasonCode?: string;
  openedAt?: Date;
  totalReceived: number;
  autoMatched: number;
  staleCount: number;
};

export type StaleScanResult = {
  scanned: number;
  alerted: number;
  unconfigured: boolean;
};

export type MaintenanceRunResult = {
  circuitStatus: "closed" | "open";
  circuitTransitioned: boolean;
  staleAlerted: number;
};

export type CircuitResetError =
  | "ADMIN_AUTH_REQUIRED"
  | "ADMIN_FORBIDDEN"
  | "ROLE_ASSIGNMENT_INACTIVE";

export type CircuitResetResult = Result<
  {
    previousStatus: "closed" | "open";
    newStatus: "closed";
    reset: boolean;
  },
  CircuitResetError
>;

export type ReconciliationOperations = {
  evaluateCircuitBreaker(): Promise<CircuitEvaluationResult>;
  scanAndAlertStalePayments(): Promise<StaleScanResult>;
  runMaintenance(): Promise<MaintenanceRunResult>;
  resetCircuit(actor: CurrentActor): Promise<CircuitResetResult>;
  getCircuitStatus(): Promise<"closed" | "open">;
  dispatchPendingAlerts(filterKind?: "stale_payment" | "circuit_open" | "report_terminal_failure"): Promise<{ delivered: number; failed: number; unconfigured: boolean }>;
};

const CIRCUIT_LOCK_KEY = "commerce:reconciliation_circuit";
const STALE_SCAN_LOCK_KEY = "commerce:reconciliation_stale_scan";

export function createReconciliationOperations(
  options: ReconciliationOperationsOptions,
): ReconciliationOperations {
  const { database, telegramAlert, adminAccessService } = options;
  const getNow = options.now ?? (() => new Date());

  async function ensureSingletonState(tx: Database) {
    const currentNow = getNow();
    await tx
      .insert(commerceReconciliationState)
      .values({
        id: "singleton",
        circuitStatus: "closed",
        updatedAt: currentNow,
      })
      .onConflictDoNothing();
  }

  async function dispatchPendingAlerts(filterKind?: "stale_payment" | "circuit_open" | "report_terminal_failure"): Promise<{
    delivered: number;
    failed: number;
    unconfigured: boolean;
  }> {
    if (!telegramAlert || !telegramAlert.isConfigured()) {
      return { delivered: 0, failed: 0, unconfigured: true };
    }

    const currentNow = getNow();
    const leaseMs = 60_000;
    const leasedUntil = new Date(currentNow.getTime() + leaseMs);

    // Atomically claim up to 25 eligible deliveries using native Postgres FOR UPDATE SKIP LOCKED
    const claimedRows = await database.transaction(async (tx) => {
      const result = await tx.execute<{
        id: string;
        idempotency_key: string;
        alert_kind: string;
        payload: Record<string, unknown>;
        status: string;
        lease_token: string;
      }>(sql`
        UPDATE commerce_alert_deliveries
        SET status = 'sending',
            lease_token = gen_random_uuid()::text,
            leased_until = ${leasedUntil.toISOString()}::timestamptz,
            attempt_count = attempt_count + 1,
            updated_at = ${currentNow.toISOString()}::timestamptz
        WHERE id IN (
          SELECT id FROM commerce_alert_deliveries
          WHERE (status = 'pending' OR (status = 'failed_retryable' AND (leased_until IS NULL OR leased_until <= ${currentNow.toISOString()}::timestamptz)) OR (status = 'sending' AND leased_until <= ${currentNow.toISOString()}::timestamptz))
            AND (${filterKind ?? null}::text IS NULL OR alert_kind = ${filterKind ?? null}::text)
          ORDER BY created_at ASC
          LIMIT 25
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id, idempotency_key, alert_kind, payload, status, lease_token
      `);
      return Array.from(result);
    });

    if (claimedRows.length === 0) {
      return { delivered: 0, failed: 0, unconfigured: false };
    }

    let deliveredCount = 0;
    let failedCount = 0;

    // Send external Telegram alerts OUTSIDE of any database transaction
    for (const delivery of claimedRows) {
      const alertKind = delivery.alert_kind;
      const payload = delivery.payload;
      let result: TelegramAlertResult;

      if (alertKind === "stale_payment") {
        const p = payload as StalePaymentAlertPayload;
        result = await telegramAlert.sendStalePaymentAlert({
          providerEventId: p.providerEventId,
          amount: Number(p.amount),
          receivedAt: p.receivedAt,
          reason: String(p.reason),
        });
      } else if (alertKind === "circuit_open") {
        const p = payload as CircuitOpenAlertPayload;
        result = await telegramAlert.sendCircuitOpenAlert({
          openedAt: p.openedAt,
          reasonCode: String(p.reasonCode),
          idempotencyKey: String(p.idempotencyKey),
          autoMatched: p.autoMatched !== undefined ? Number(p.autoMatched) : undefined,
          totalReceived: p.totalReceived !== undefined ? Number(p.totalReceived) : undefined,
          staleCount: p.staleCount !== undefined ? Number(p.staleCount) : undefined,
        });
      } else if (alertKind === "report_terminal_failure") {
        const p = payload as ReportTerminalFailureAlertPayload;
        result = await telegramAlert.sendReportTerminalFailureAlert({
          reportVersionId: String(p.reportVersionId),
          failureStage: String(p.failureStage),
          errorCode: String(p.errorCode),
          failedAt: p.failedAt,
          idempotencyKey: String(p.idempotencyKey),
        });
      } else {
        result = { status: "retryable_failure", error: "UNKNOWN_ALERT_KIND" };
      }

      const updateNow = getNow();
      const leaseToken = delivery.lease_token;
      if (result.status === "delivered") {
        deliveredCount++;
        await database
          .update(commerceAlertDeliveries)
          .set({
            status: "sent",
            sentAt: updateNow,
            leasedUntil: null,
            leaseToken: null,
            lastError: null,
            updatedAt: updateNow,
          })
          .where(
            and(
              eq(commerceAlertDeliveries.id, delivery.id),
              eq(commerceAlertDeliveries.status, "sending"),
              eq(commerceAlertDeliveries.leaseToken, leaseToken),
            ),
          );
      } else if (result.status === "retryable_failure") {
        failedCount++;
        await database
          .update(commerceAlertDeliveries)
          .set({
            status: "failed_retryable",
            lastError: result.error,
            leasedUntil: null,
            leaseToken: null,
            updatedAt: updateNow,
          })
          .where(
            and(
              eq(commerceAlertDeliveries.id, delivery.id),
              eq(commerceAlertDeliveries.status, "sending"),
              eq(commerceAlertDeliveries.leaseToken, leaseToken),
            ),
          );
      } else {
        await database
          .update(commerceAlertDeliveries)
          .set({
            status: "pending",
            leasedUntil: null,
            leaseToken: null,
            updatedAt: updateNow,
          })
          .where(
            and(
              eq(commerceAlertDeliveries.id, delivery.id),
              eq(commerceAlertDeliveries.status, "sending"),
              eq(commerceAlertDeliveries.leaseToken, leaseToken),
            ),
          );
      }
    }

    return { delivered: deliveredCount, failed: failedCount, unconfigured: false };
  }

  async function evaluateCircuitBreaker(): Promise<CircuitEvaluationResult> {
    const evalResult = await database.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${CIRCUIT_LOCK_KEY}))`);
      await ensureSingletonState(tx);

      const currentNow = getNow();
      const [currentState] = await tx
        .select()
        .from(commerceReconciliationState)
        .where(eq(commerceReconciliationState.id, "singleton"))
        .for("update");

      const window24hStart = new Date(currentNow.getTime() - 24 * 60 * 60 * 1000);
      const cutoff6h = new Date(currentNow.getTime() - 6 * 60 * 60 * 1000);

      // 1. Gather rolling 24h events
      const matchedEvents = await tx
        .select({
          providerEventId: commercePaymentEvents.providerEventId,
          matchMethod: commercePaymentEvents.matchMethod,
          createdAt: commercePaymentEvents.createdAt,
        })
        .from(commercePaymentEvents)
        .where(
          and(
            gte(commercePaymentEvents.createdAt, window24hStart),
            lte(commercePaymentEvents.createdAt, currentNow),
          ),
        );

      const unmatchedEvents = await tx
        .select({
          providerEventId: commerceUnmatchedPayments.providerEventId,
          receivedAt: commerceUnmatchedPayments.receivedAt,
        })
        .from(commerceUnmatchedPayments)
        .where(
          and(
            gte(commerceUnmatchedPayments.receivedAt, window24hStart),
            lte(commerceUnmatchedPayments.receivedAt, currentNow),
          ),
        );

      const eventMap = new Map<string, boolean>();
      for (const row of matchedEvents) {
        const isAuto =
          row.matchMethod === "invoice_number" || row.matchMethod === "payment_code";
        eventMap.set(row.providerEventId, isAuto);
      }
      for (const row of unmatchedEvents) {
        if (!eventMap.has(row.providerEventId)) {
          eventMap.set(row.providerEventId, false);
        }
      }

      const totalReceived = eventMap.size;
      let autoMatched = 0;
      for (const isAuto of eventMap.values()) {
        if (isAuto) autoMatched++;
      }

      const matchRateLow =
        totalReceived >= 20 && autoMatched / totalReceived < 0.95;

      // 2. Gather unclaimed unmatched payments > 6 hours
      const staleRows = await tx
        .select({
          id: commerceUnmatchedPayments.id,
        })
        .from(commerceUnmatchedPayments)
        .where(
          and(
            isNull(commerceUnmatchedPayments.claimedAt),
            lt(commerceUnmatchedPayments.receivedAt, cutoff6h),
          ),
        );

      const staleCount = staleRows.length;
      const staleThresholdExceeded = staleCount >= 3;

      if (currentState?.circuitStatus === "open") {
        return {
          circuitStatus: "open" as const,
          transitioned: false,
          reasonCode: currentState.reasonCode ?? undefined,
          openedAt: currentState.openedAt ?? undefined,
          totalReceived,
          autoMatched,
          staleCount,
        };
      }

      if (matchRateLow || staleThresholdExceeded) {
        const reasonCode =
          matchRateLow && staleThresholdExceeded
            ? "MATCH_RATE_LOW_AND_STALE_PAYMENTS"
            : matchRateLow
              ? "MATCH_RATE_LOW"
              : "STALE_UNMATCHED_PAYMENTS";

        const openedAt = currentNow;
        const idempotencyKey = `circuit-open:${openedAt.toISOString()}`;

        await tx
          .update(commerceReconciliationState)
          .set({
            circuitStatus: "open",
            openedAt,
            reasonCode,
            alertIdempotencyKey: idempotencyKey,
            updatedAt: currentNow,
          })
          .where(eq(commerceReconciliationState.id, "singleton"));

        await tx.insert(auditLogs).values({
          actorId: null,
          action: "commerce.circuit_breaker.opened",
          targetType: "commerce_reconciliation_state",
          targetId: "singleton",
          reasonCode,
          requestId: null,
          metadata: {
            previousStatus: "closed",
            newStatus: "open",
            reasonCode,
            totalReceived,
            autoMatched,
            staleCount,
          },
          createdAt: currentNow,
        });

        // Enqueue durable alert delivery transactionally
        await tx
          .insert(commerceAlertDeliveries)
          .values({
            idempotencyKey,
            alertKind: "circuit_open",
            payload: {
              openedAt: openedAt.toISOString(),
              reasonCode,
              idempotencyKey,
              autoMatched,
              totalReceived,
              staleCount,
            },
            status: "pending",
            createdAt: currentNow,
            updatedAt: currentNow,
          })
          .onConflictDoNothing();

        return {
          circuitStatus: "open" as const,
          transitioned: true,
          reasonCode,
          openedAt,
          totalReceived,
          autoMatched,
          staleCount,
        };
      }

      return {
        circuitStatus: "closed" as const,
        transitioned: false,
        totalReceived,
        autoMatched,
        staleCount,
      };
    });

    // Dispatch any enqueued alert delivery OUTSIDE the transaction
    await dispatchPendingAlerts("circuit_open");

    return evalResult;
  }

  async function scanAndAlertStalePayments(): Promise<StaleScanResult> {
    const scanResult = await database.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${STALE_SCAN_LOCK_KEY}))`);

      const currentNow = getNow();
      const cutoff6h = new Date(currentNow.getTime() - 6 * 60 * 60 * 1000);

      const staleUnclaimed = await tx
        .select({
          id: commerceUnmatchedPayments.id,
          providerEventId: commerceUnmatchedPayments.providerEventId,
          amount: commerceUnmatchedPayments.amount,
          reason: commerceUnmatchedPayments.reason,
          receivedAt: commerceUnmatchedPayments.receivedAt,
        })
        .from(commerceUnmatchedPayments)
        .where(
          and(
            isNull(commerceUnmatchedPayments.claimedAt),
            isNull(commerceUnmatchedPayments.staleAlertedAt),
            lt(commerceUnmatchedPayments.receivedAt, cutoff6h),
          ),
        )
        .orderBy(commerceUnmatchedPayments.receivedAt)
        .for("update");

      if (staleUnclaimed.length === 0) {
        return {
          scanned: 0,
        };
      }

      for (const row of staleUnclaimed) {
        await tx
          .update(commerceUnmatchedPayments)
          .set({ staleAlertedAt: currentNow })
          .where(eq(commerceUnmatchedPayments.id, row.id));

        // Enqueue durable alert delivery transactionally with unique key per provider event
        await tx
          .insert(commerceAlertDeliveries)
          .values({
            idempotencyKey: `stale-payment:${row.providerEventId}`,
            alertKind: "stale_payment",
            payload: {
              providerEventId: row.providerEventId,
              amount: row.amount,
              receivedAt: row.receivedAt.toISOString(),
              reason: row.reason,
            },
            status: "pending",
            createdAt: currentNow,
            updatedAt: currentNow,
          })
          .onConflictDoNothing();
      }

      return {
        scanned: staleUnclaimed.length,
      };
    });

    // Dispatch alert deliveries OUTSIDE transaction
    const dispatchResult = await dispatchPendingAlerts("stale_payment");

    return {
      scanned: scanResult.scanned,
      alerted: dispatchResult.delivered,
      unconfigured: dispatchResult.unconfigured,
    };
  }

  async function runMaintenance(): Promise<MaintenanceRunResult> {
    const staleResult = await scanAndAlertStalePayments();
    const circuitResult = await evaluateCircuitBreaker();
    await dispatchPendingAlerts();
    return {
      circuitStatus: circuitResult.circuitStatus,
      circuitTransitioned: circuitResult.transitioned,
      staleAlerted: staleResult.alerted,
    };
  }

  async function resetCircuit(actor: CurrentActor): Promise<CircuitResetResult> {
    if (actor.kind !== "account") {
      return {
        ok: false,
        error: {
          code: "ADMIN_AUTH_REQUIRED",
          messageKey: "admin.admin_auth_required",
          retryable: false,
        },
      };
    }

    if (!adminAccessService) {
      return {
        ok: false,
        error: {
          code: "ADMIN_FORBIDDEN",
          messageKey: "admin.admin_forbidden",
          retryable: false,
        },
      };
    }

    const access = await adminAccessService.resolveAdminAccess(actor);
    if (!access.ok) {
      return {
        ok: false,
        error: {
          code: access.error.code,
          messageKey: `admin.${access.error.code.toLowerCase()}`,
          retryable: false,
        },
      };
    }

    // Strictly check active admin.commerce.manage capability through resolved admin access
    if (!access.value.capabilities.includes("admin.commerce.manage")) {
      return {
        ok: false,
        error: {
          code: "ADMIN_FORBIDDEN",
          messageKey: "admin.admin_forbidden",
          retryable: false,
        },
      };
    }

    return database.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${CIRCUIT_LOCK_KEY}))`);
      await ensureSingletonState(tx);

      const currentNow = getNow();
      const [currentState] = await tx
        .select()
        .from(commerceReconciliationState)
        .where(eq(commerceReconciliationState.id, "singleton"))
        .for("update");

      const previousStatus = (currentState?.circuitStatus ?? "closed") as "closed" | "open";

      if (previousStatus === "open") {
        await tx
          .update(commerceReconciliationState)
          .set({
            circuitStatus: "closed",
            openedAt: null,
            reasonCode: null,
            alertIdempotencyKey: null,
            updatedAt: currentNow,
          })
          .where(eq(commerceReconciliationState.id, "singleton"));

        await tx.insert(auditLogs).values({
          actorId: actor.userId,
          action: "commerce.circuit_breaker.reset",
          targetType: "commerce_reconciliation_state",
          targetId: "singleton",
          reasonCode: "admin_reset",
          requestId: actor.requestId,
          metadata: {
            previousStatus: "open",
            newStatus: "closed",
            resetBy: actor.userId,
          },
          createdAt: currentNow,
        });

        return {
          ok: true,
          value: {
            previousStatus: "open",
            newStatus: "closed",
            reset: true,
          },
        };
      }

      return {
        ok: true,
        value: {
          previousStatus: "closed",
          newStatus: "closed",
          reset: false,
        },
      };
    });
  }

  async function getCircuitStatus(): Promise<"closed" | "open"> {
    const [row] = await database
      .select({ circuitStatus: commerceReconciliationState.circuitStatus })
      .from(commerceReconciliationState)
      .where(eq(commerceReconciliationState.id, "singleton"))
      .limit(1);
    return row?.circuitStatus ?? "closed";
  }

  return {
    evaluateCircuitBreaker,
    scanAndAlertStalePayments,
    runMaintenance,
    resetCircuit,
    getCircuitStatus,
    dispatchPendingAlerts,
  };
}
