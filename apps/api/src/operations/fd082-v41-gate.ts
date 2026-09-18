import { and, eq, isNotNull, sql } from "drizzle-orm";
import {
  COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1,
  REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
  REPORT_KNOWLEDGE_VERSION_V4,
  REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_1_SENSITIVITY,
  createBirthProfileService,
  createDatabaseBirthProfileRepository,
  createDatabaseWalletRepository,
  createDatabaseZiweiCalculationRepository,
  createEvidenceService,
  createWalletService,
  createWalletUnlockService,
  createZiweiCalculationService,
  v4_1_1KeyConfigSensitivityReportVersions,
} from "@lasoviet/backend";
import type { CurrentActor } from "@lasoviet/contracts";
import {
  aiCallAttempts,
  aiUsageOutcomes,
  auditLogs,
  authUsers,
  commerceEntitlements,
  createDatabase,
  reportAssets,
  reportReservations,
  reportSectionCheckpoints,
  reportVersions,
  walletAccounts,
  walletCommandReceipts,
  walletLedgerEntries,
  walletRestorationAllocations,
  walletSpendAllocations,
  walletTransactions,
  type Database,
} from "@lasoviet/database";
import { IztroAdapter, iztroDefaultConfig } from "@lasoviet/engine-adapters";

const EXPECTED_PROVIDER = "9router-an";
const REQUESTED_MODEL = "ag/claude-sonnet-4-6";
const EXPECTED_MODEL = "claude-sonnet-4-6";
const MAX_RUNS = 20;

export type Fd082GateArguments = {
  ownerId: string;
  campaignId: string;
  runs: number;
  pollMs: number;
  timeoutMs: number;
};

export type Fd082Evidence = {
  reservation: {
    reportVersionId: string;
    status: string;
    knowledgeVersionId: string;
    promptVersion: string;
    reportConfigVersion: string;
  } | null;
  checkpoints: readonly {
    sectionKey: string;
    status: string;
    knowledgeVersionId: string;
    promptVersion: string;
    reportConfigVersion: string;
    qualityConfigVersion: string;
    providerId: string | null;
    modelId: string | null;
  }[];
  immutable: {
    providerId: string;
    modelId: string;
    knowledgeVersionId: string;
    promptVersion: string;
    reportConfigVersion: string;
    contentHash: string;
  } | null;
  asset: {
    status: string;
    renderVersion: string;
    objectKey: string;
    sha256: string | null;
    byteLength: number | null;
    storedAt: Date | null;
  } | null;
  spend: {
    id: string;
    receiptId: string | null;
    auditId: string | null;
    ledgerAmount: number | null;
    restored: boolean;
  } | null;
  ai: readonly {
    providerId: string;
    requestedModelId: string;
    responseModelId: string | null;
    errorCode: string | null;
  }[];
};

export function fd082AuditTargetMatchesWalletId() {
  return sql`${auditLogs.targetId} = ${walletTransactions.walletId}::text`;
}

function fail(code: string): never {
  throw new Error(code);
}

function requiredValue(argumentsList: readonly string[], name: string): string {
  const prefix = `--${name}=`;
  const value = argumentsList.find((argument) => argument.startsWith(prefix))?.slice(prefix.length).trim();
  if (!value || value.length > 128) fail("FD082_GATE_INVALID_INPUT");
  return value;
}

function boundedInteger(value: string, min: number, max: number): number {
  if (!/^\d+$/u.test(value)) fail("FD082_GATE_INVALID_INPUT");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) fail("FD082_GATE_INVALID_INPUT");
  return parsed;
}

export function parseFd082GateArguments(argumentsList: readonly string[]): Fd082GateArguments {
  const names = new Set(argumentsList.map((argument) => argument.slice(0, argument.indexOf("="))));
  const allowed = new Set(["--owner-id", "--campaign-id", "--runs", "--poll-ms", "--timeout-ms"]);
  if (
    argumentsList.some((argument) => !argument.includes("=")) ||
    [...names].some((name) => !allowed.has(name)) ||
    !names.has("--owner-id") ||
    !names.has("--campaign-id") ||
    !names.has("--runs")
  ) fail("FD082_GATE_INVALID_INPUT");
  return {
    ownerId: requiredValue(argumentsList, "owner-id"),
    campaignId: requiredValue(argumentsList, "campaign-id"),
    runs: boundedInteger(requiredValue(argumentsList, "runs"), 1, MAX_RUNS),
    pollMs: names.has("--poll-ms") ? boundedInteger(requiredValue(argumentsList, "poll-ms"), 1_000, 60_000) : 5_000,
    timeoutMs: names.has("--timeout-ms") ? boundedInteger(requiredValue(argumentsList, "timeout-ms"), 60_000, 3_600_000) : 3_600_000,
  };
}

export function passesFd082Evidence(evidence: Fd082Evidence): boolean {
  const expectedKeys = new Set(COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1);
  if (
    evidence.reservation?.status !== "complete" ||
    evidence.reservation.knowledgeVersionId !== REPORT_KNOWLEDGE_VERSION_V4 ||
    evidence.reservation.promptVersion !== REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY ||
    evidence.reservation.reportConfigVersion !== REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY ||
    evidence.checkpoints.length !== expectedKeys.size ||
    new Set(evidence.checkpoints.map((item) => item.sectionKey)).size !== expectedKeys.size ||
    evidence.checkpoints.some((item) =>
      !expectedKeys.has(item.sectionKey as typeof COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1[number]) ||
      item.status !== "passed" ||
      item.knowledgeVersionId !== REPORT_KNOWLEDGE_VERSION_V4 ||
      item.promptVersion !== REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY ||
      item.reportConfigVersion !== REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY ||
      item.qualityConfigVersion !== REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_1_SENSITIVITY ||
      item.providerId !== EXPECTED_PROVIDER ||
      item.modelId !== EXPECTED_MODEL,
    ) ||
    evidence.immutable === null ||
    evidence.immutable.knowledgeVersionId !== REPORT_KNOWLEDGE_VERSION_V4 ||
    evidence.immutable.promptVersion !== REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY ||
    evidence.immutable.reportConfigVersion !== REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY ||
    evidence.immutable.providerId !== EXPECTED_PROVIDER ||
    evidence.immutable.modelId !== EXPECTED_MODEL ||
    !/^[a-f0-9]{64}$/u.test(evidence.immutable.contentHash) ||
    evidence.asset?.status !== "stored" ||
    evidence.asset.renderVersion !== "identity-report-pdf.v2" ||
    evidence.asset.objectKey.trim() === "" ||
    !evidence.asset.sha256 || !/^[a-f0-9]{64}$/u.test(evidence.asset.sha256) ||
    !evidence.asset.byteLength || evidence.asset.byteLength <= 0 ||
    evidence.asset.storedAt === null ||
    evidence.spend?.receiptId === null ||
    evidence.spend?.auditId === null ||
    !evidence.spend || evidence.spend.ledgerAmount !== -960 ||
    evidence.spend.restored ||
    evidence.ai.length === 0 ||
    evidence.ai.some((item) =>
      item.providerId !== EXPECTED_PROVIDER ||
      item.requestedModelId !== REQUESTED_MODEL ||
      item.providerId.toLowerCase().includes("gemini") ||
      item.requestedModelId.toLowerCase().includes("gemini") ||
      item.responseModelId?.toLowerCase().includes("gemini") ||
      (item.errorCode === null && item.responseModelId !== EXPECTED_MODEL),
    )
  ) return false;
  return true;
}

async function ownerActor(
  database: Database,
  ownerId: string,
  requestId: string,
): Promise<Extract<CurrentActor, { kind: "account" }>> {
  const [owner] = await database.select({ id: authUsers.id, emailVerified: authUsers.emailVerified, isAnonymous: authUsers.isAnonymous })
    .from(authUsers).where(eq(authUsers.id, ownerId)).limit(1);
  if (!owner?.emailVerified || owner.isAnonymous) fail("FD082_GATE_OWNER_INELIGIBLE");
  return { kind: "account", userId: owner.id, sessionId: `fd082:${requestId}`, requestId };
}

async function evidenceFor(
  database: Database,
  reportVersionId: string,
  requestId: string,
): Promise<Fd082Evidence> {
  const [reservation] = await database.select().from(reportReservations)
    .where(eq(reportReservations.reportVersionId, reportVersionId)).limit(1);
  const checkpoints = await database.select().from(reportSectionCheckpoints)
    .where(eq(reportSectionCheckpoints.reportVersionId, reportVersionId));
  const [immutable] = await database.select().from(reportVersions)
    .where(eq(reportVersions.reportVersionId, reportVersionId)).limit(1);
  const [asset] = await database.select().from(reportAssets)
    .where(eq(reportAssets.reportVersionId, reportVersionId)).limit(1);
  const [spend] = await database.select({
    id: walletTransactions.id,
    receiptId: sql<string | null>`(
      select ${walletCommandReceipts.id}
      from ${walletCommandReceipts}
      where ${walletCommandReceipts.transactionId} = ${walletTransactions.id}
      limit 1
    )`,
    auditId: sql<string | null>`(
      select ${auditLogs.id}
      from ${auditLogs}
      where ${auditLogs.targetType} = 'wallet'
        and ${fd082AuditTargetMatchesWalletId()}
        and ${auditLogs.action} = 'wallet.spend'
        and ${auditLogs.requestId} = ${requestId}
      limit 1
    )`,
    ledgerAmount: sql<number>`(
      select coalesce(sum(${walletLedgerEntries.amountLa}), 0)::integer
      from ${walletLedgerEntries}
      where ${walletLedgerEntries.transactionId} = ${walletTransactions.id}
    )`,
    restored: sql<boolean>`exists (
      select 1
      from ${walletSpendAllocations}
      inner join ${walletRestorationAllocations}
        on ${walletRestorationAllocations.spendAllocationId} = ${walletSpendAllocations.id}
      where ${walletSpendAllocations.spendTransactionId} = ${walletTransactions.id}
    )`,
  }).from(reportReservations)
    .innerJoin(commerceEntitlements, eq(commerceEntitlements.id, reportReservations.entitlementId))
    .innerJoin(walletTransactions, eq(walletTransactions.id, commerceEntitlements.ledgerSpendId))
    .where(and(
      eq(reportReservations.reportVersionId, reportVersionId),
      eq(walletTransactions.kind, "spend"),
    )).limit(1);
  const ai = await database.select({
    providerId: aiCallAttempts.providerId,
    requestedModelId: aiCallAttempts.requestedModelId,
    responseModelId: aiUsageOutcomes.responseModelId,
    errorCode: aiUsageOutcomes.errorCode,
  }).from(aiCallAttempts)
    .leftJoin(aiUsageOutcomes, eq(aiUsageOutcomes.attemptId, aiCallAttempts.id))
    .where(eq(aiCallAttempts.reportVersionId, reportVersionId));
  return {
    reservation: reservation ?? null,
    checkpoints,
    immutable: immutable ?? null,
    asset: asset ?? null,
    spend: spend === undefined ? null : { ...spend, restored: Boolean(spend.restored) },
    ai,
  };
}

async function existingReportVersion(database: Database, ownerId: string, idempotencyKey: string): Promise<string | null> {
  const [record] = await database.select({ reportVersionId: reportReservations.reportVersionId })
    .from(walletCommandReceipts)
    .innerJoin(walletAccounts, eq(walletAccounts.id, walletCommandReceipts.walletId))
    .innerJoin(walletTransactions, eq(walletTransactions.id, walletCommandReceipts.transactionId))
    .innerJoin(commerceEntitlements, eq(commerceEntitlements.ledgerSpendId, walletTransactions.id))
    .innerJoin(reportReservations, eq(reportReservations.entitlementId, commerceEntitlements.id))
    .where(and(eq(walletAccounts.ownerId, ownerId), eq(walletCommandReceipts.idempotencyKey, idempotencyKey)))
    .limit(1);
  return record?.reportVersionId ?? null;
}

function syntheticProfile(run: number) {
  return {
    version: 1 as const,
    calendar: { kind: "solar" as const, date: `199${run % 10}-0${(run % 9) + 1}-1${run % 9}` },
    time: { precision: "exact_minute" as const, localTime: `${String(7 + (run % 10)).padStart(2, "0")}:30` },
    timezone: { offsetMinutes: 420 },
    consentVersion: "fd082.synthetic.v1",
    locale: "vi",
    gender: run % 2 === 0 ? "female" : "male",
  };
}

async function walletStateVersion(database: Database, ownerId: string): Promise<number> {
  const [wallet] = await database.select({ stateVersion: walletAccounts.stateVersion })
    .from(walletAccounts).where(eq(walletAccounts.ownerId, ownerId)).limit(1);
  if (!wallet) fail("FD082_GATE_WALLET_MISSING");
  return wallet.stateVersion;
}

export type Fd082GatePorts = {
  findReportVersion(run: number, unlockKey: string): Promise<string | null>;
  createAndUnlock(run: number, unlockKey: string): Promise<string>;
  readEvidence(run: number, reportVersionId: string): Promise<Fd082Evidence>;
  wait(pollMs: number): Promise<void>;
  restore(run: number, reportVersionId: string, idempotencyKey: string): Promise<void>;
};

export async function runFd082GateSequence(
  input: Fd082GateArguments,
  ports: Fd082GatePorts,
  log: (line: Record<string, unknown>) => void,
): Promise<void> {
  log({ status: "started", campaignId: input.campaignId });
  for (let run = 1; run <= input.runs; run += 1) {
    const unlockKey = `fd082.v41.${input.campaignId}.run.${run}.unlock.v1`;
    const reportVersionId = await ports.findReportVersion(run, unlockKey)
      ?? await ports.createAndUnlock(run, unlockKey);
    const deadline = Date.now() + input.timeoutMs;
    let evidence = await ports.readEvidence(run, reportVersionId);
    while (
      evidence.reservation?.status === "generating" ||
      evidence.reservation?.status === "requested" ||
      evidence.reservation?.status === "pdf_pending"
    ) {
      if (Date.now() >= deadline) {
        log({ run, status: "timeout", reportVersionId });
        fail("FD082_GATE_TIMEOUT");
      }
      await ports.wait(input.pollMs);
      evidence = await ports.readEvidence(run, reportVersionId);
    }
    if (!passesFd082Evidence(evidence)) {
      await ports.restore(
        run,
        reportVersionId,
        `fd082.v41.${input.campaignId}.run.${run}.restore.v1`,
      );
      log({ run, status: "failed", reportVersionId });
      fail("FD082_GATE_EVIDENCE_FAILED");
    }
    log({ run, status: "passed", reportVersionId });
  }
  log({ status: "completed", campaignId: input.campaignId });
}

export async function runFd082Gate(database: Database, input: Fd082GateArguments, log: (line: Record<string, unknown>) => void): Promise<void> {
  const authority = await ownerActor(database, input.ownerId, `fd082:${input.campaignId}`);
  const wallet = createWalletService(createDatabaseWalletRepository(database));
  const unlock = createWalletUnlockService(database, wallet, {
    reportVersionResolver: v4_1_1KeyConfigSensitivityReportVersions,
  });
  const profiles = createBirthProfileService({ repository: createDatabaseBirthProfileRepository(database) });
  const calculate = createZiweiCalculationService({
    repository: createDatabaseZiweiCalculationRepository(database),
    evidenceService: createEvidenceService(database),
    engine: new IztroAdapter(),
    config: iztroDefaultConfig,
  });
  const balance = await wallet.readBalance(authority);
  if (!balance.ok || balance.value.purchasedLa + balance.value.promotionalLa < input.runs * 960) fail("FD082_GATE_INSUFFICIENT_BALANCE");

  await runFd082GateSequence(input, {
    findReportVersion: (_run, key) => existingReportVersion(database, input.ownerId, key),
    async createAndUnlock(run, key) {
      const runActor = {
        ...authority,
        requestId: `fd082:${input.campaignId}:run:${run}`,
      };
      const created = await profiles.createWithContext(runActor, syntheticProfile(run), {
        version: 1, lifeStage: "early_career", topConcern: run % 2 === 0 ? "career" : "self_understanding",
      });
      if (!created.ok) fail(`FD082_GATE_PROFILE_${created.error.code}`);
      const chart = await calculate.calculate(runActor, created.value.revisionId);
      if (!chart.ok) fail(`FD082_GATE_CALCULATION_${chart.error.code}`);
      const intent = await unlock.createPurchaseIntent(runActor, {
        chartId: chart.value.chartId, chartVersionId: chart.value.chartVersionId, sku: "ZIWEI-IDENTITY-P0", locale: "vi",
      });
      if (!intent.ok) fail(`FD082_GATE_INTENT_${intent.code}`);
      const current = await wallet.readBalance(authority);
      if (!current.ok) fail(`FD082_GATE_BALANCE_${current.error.code}`);
      const result = await unlock.unlock(runActor, {
        purchaseIntentId: intent.value.id,
        expectedIntentVersion: intent.value.stateVersion,
        expectedWalletVersion: await walletStateVersion(database, authority.userId),
        idempotencyKey: key,
      });
      if (!result.ok) fail(`FD082_GATE_UNLOCK_${result.code}`);
      const [reservation] = await database.select({ reportVersionId: reportReservations.reportVersionId })
        .from(reportReservations).where(eq(reportReservations.reportId, result.value.reportId)).limit(1);
      if (!reservation) fail("FD082_GATE_RESERVATION_MISSING");
      return reservation.reportVersionId;
    },
    readEvidence: (run, reportVersionId) => evidenceFor(
      database,
      reportVersionId,
      `fd082:${input.campaignId}:run:${run}`,
    ),
    wait: (pollMs) => new Promise((resolve) => setTimeout(resolve, pollMs)),
    async restore(run, reportVersionId, restorationKey) {
      const [spend] = await database.select({
        id: walletTransactions.id,
      }).from(reportReservations)
        .innerJoin(commerceEntitlements, eq(commerceEntitlements.id, reportReservations.entitlementId))
        .innerJoin(walletTransactions, eq(walletTransactions.id, commerceEntitlements.ledgerSpendId))
        .where(eq(reportReservations.reportVersionId, reportVersionId)).limit(1);
      if (spend) {
        const current = await wallet.readBalance(authority);
        if (!current.ok) fail(`FD082_GATE_BALANCE_${current.error.code}`);
        const restored = await wallet.restore({
          actor: authority,
          restoration: {
            kind: "restoration", actorId: authority.userId, originalSpendId: spend.id,
            expectedWalletVersion: await walletStateVersion(database, authority.userId), reasonCode: "fd082.gate.failure",
            requestId: `fd082:${input.campaignId}:run:${run}`, traceId: `fd082:${input.campaignId}:run:${run}`,
            idempotencyKey: restorationKey,
          },
        });
        if (!restored.ok && restored.error.code !== "WALLET_ALREADY_RESTORED") fail(`FD082_GATE_RESTORE_${restored.error.code}`);
      }
    },
  }, log);
}

export async function closeFd082Database(database: Database): Promise<void> {
  await (database as Database & { $client: { end(): Promise<unknown> } }).$client.end();
}

export async function runFd082GateFromEnvironment(argumentsList: readonly string[], log: (line: Record<string, unknown>) => void): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) fail("FD082_GATE_DATABASE_UNAVAILABLE");
  const database = createDatabase(databaseUrl);
  try {
    await runFd082Gate(database, parseFd082GateArguments(argumentsList), log);
  } finally {
    await closeFd082Database(database);
  }
}
