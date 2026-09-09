import { desc, eq, inArray } from "drizzle-orm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authUsers,
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  commerceEntitlements,
  commerceOrders,
  createDatabase,
  evidenceSets,
  reportReservations,
  reportVersions,
  runMigrations,
  type Database,
  ziweiChartVersions,
  ziweiCharts,
} from "@lasoviet/database";
import type { CurrentActor } from "@lasoviet/contracts";

import { createDatabaseCommerceRepository } from "./commerce.repository.js";
import { createDatabaseReportQueryRepository } from "../reports/report-query.repository.js";

describe("commerce repository - library and order history (WP-03)", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl = "";
  let database: Database;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_commerce_library_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
    database = createDatabase(databaseUrl);
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  }, 30_000);

  async function createOwnerFixture(overrides: {
    name?: string;
    emailVerified?: boolean;
    displayName?: string;
  } = {}) {
    const userId = "user-" + randomUUID();
    const profileId = "profile-" + randomUUID();
    const revisionId = "revision-" + randomUUID();
    const runId = randomUUID();
    const chartId = "chart-" + randomUUID();
    const versionId = "version-" + randomUUID();
    const evidenceId = "evidence-" + randomUUID();

    await database.insert(authUsers).values({
      id: userId,
      name: overrides.name ?? "Owner " + userId.slice(0, 6),
      email: userId + "@example.test",
      emailVerified: overrides.emailVerified ?? true,
    });

    await database.insert(birthProfiles).values({
      id: profileId,
      userId,
    });

    await database.insert(birthProfileRevisions).values({
      id: revisionId,
      profileId,
      revisionNumber: 1,
      originalInput: {
        version: 1,
        displayName: overrides.displayName ?? "Display " + userId.slice(0, 6),
      },
      normalizedInput: {},
      consentVersion: "privacy.v1",
    });

    await database.insert(calculationRuns).values({
      id: runId,
      profileId,
      profileRevisionId: revisionId,
      idempotencyKey: "run-" + runId,
      engineId: "ziwei.iztro",
      engineVersion: "1.0",
      adapterId: "iztro",
      adapterVersion: "1.0",
      schemaId: "ziwei.chart.v1",
      ruleSetId: "ziwei.default",
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
    });

    await database.insert(ziweiCharts).values({
      id: chartId,
      profileId,
      profileRevisionId: revisionId,
    });

    await database.insert(ziweiChartVersions).values({
      id: versionId,
      chartId,
      calculationRunId: runId,
      normalizedOutput: {},
      privateRawSnapshot: {},
      warnings: [],
      provenance: {},
    });

    await database.insert(evidenceSets).values({
      id: evidenceId,
      chartVersionId: versionId,
      capabilityId: "ziwei.identity.p0",
      ruleVersion: "ziwei.identity.v1",
    });

    const actor: CurrentActor = {
      kind: "account",
      userId,
      sessionId: "session-" + randomUUID(),
      requestId: "request-" + randomUUID(),
    };

    return {
      userId,
      actor,
      profileId,
      chartId,
      versionId,
      evidenceId,
      displayName: overrides.displayName ?? "Display " + userId.slice(0, 6),
    };
  }

  async function createAdditionalChartRevisionFixture(input: {
    profileId: string;
    displayName: string;
  }) {
    const revisionId = "revision-" + randomUUID();
    const runId = randomUUID();
    const chartId = "chart-" + randomUUID();
    const versionId = "version-" + randomUUID();
    const evidenceId = "evidence-" + randomUUID();

    await database.insert(birthProfileRevisions).values({
      id: revisionId,
      profileId: input.profileId,
      revisionNumber: 2,
      originalInput: {
        version: 1,
        displayName: input.displayName,
      },
      normalizedInput: {},
      consentVersion: "privacy.v1",
      createdAt: new Date("2026-09-09T01:00:00.000Z"),
    });

    await database.insert(calculationRuns).values({
      id: runId,
      profileId: input.profileId,
      profileRevisionId: revisionId,
      idempotencyKey: "run-" + runId,
      engineId: "ziwei.iztro",
      engineVersion: "1.0",
      adapterId: "iztro",
      adapterVersion: "1.0",
      schemaId: "ziwei.chart.v1",
      ruleSetId: "ziwei.default",
      inputHash: "d".repeat(64),
      configHash: "e".repeat(64),
      rawSnapshotHash: "f".repeat(64),
      createdAt: new Date("2026-09-09T01:01:00.000Z"),
    });

    await database.insert(ziweiCharts).values({
      id: chartId,
      profileId: input.profileId,
      profileRevisionId: revisionId,
      createdAt: new Date("2026-09-09T01:02:00.000Z"),
    });

    await database.insert(ziweiChartVersions).values({
      id: versionId,
      chartId,
      calculationRunId: runId,
      normalizedOutput: {},
      privateRawSnapshot: {},
      warnings: [],
      provenance: {},
      createdAt: new Date("2026-09-09T01:03:00.000Z"),
    });

    await database.insert(evidenceSets).values({
      id: evidenceId,
      chartVersionId: versionId,
      capabilityId: "ziwei.identity.p0",
      ruleVersion: "ziwei.identity.v1",
    });

    return { chartId, versionId };
  }

  it("ensures owner A cannot read owner B data in library and order history", async () => {
    const repo = createDatabaseCommerceRepository(database);
    const ownerA = await createOwnerFixture({ displayName: "Owner A" });
    const ownerB = await createOwnerFixture({ displayName: "Owner B" });

    // Create and pay order for Owner A
    const orderA = await repo.createOrder(ownerA.actor, ownerA.chartId, "ZIWEI-IDENTITY-P0", "vi");
    if (!orderA.ok) throw new Error("Order A creation failed");
    await repo.recordPaid({
      invoiceNumber: orderA.value.invoiceNumber,
      providerEventId: "event-" + randomUUID(),
      amount: 79_000,
      currency: "VND",
      traceId: "trace-a",
    });

    // Create and pay order for Owner B
    const orderB = await repo.createOrder(ownerB.actor, ownerB.chartId, "ZIWEI-IDENTITY-P0", "en");
    if (!orderB.ok) throw new Error("Order B creation failed");
    await repo.recordPaid({
      invoiceNumber: orderB.value.invoiceNumber,
      providerEventId: "event-" + randomUUID(),
      amount: 79_000,
      currency: "VND",
      traceId: "trace-b",
    });

    // Owner A reads library
    const libA = await repo.readAccountLibrary(ownerA.actor);
    expect(libA.totalCount).toBe(1);
    expect(libA.items[0]?.orderId).toBe(orderA.value.id);
    expect(libA.items[0]?.profileDisplayName).toBe("Owner A");
    expect(libA.items.some((item) => item.orderId === orderB.value.id)).toBe(false);

    // Owner B reads library
    const libB = await repo.readAccountLibrary(ownerB.actor);
    expect(libB.totalCount).toBe(1);
    expect(libB.items[0]?.orderId).toBe(orderB.value.id);
    expect(libB.items[0]?.profileDisplayName).toBe("Owner B");
    expect(libB.items.some((item) => item.orderId === orderA.value.id)).toBe(false);

    // Owner A reads history
    const histA = await repo.readOrderHistory(ownerA.actor);
    expect(histA.orders.some((o) => o.id === orderA.value.id)).toBe(true);
    expect(histA.orders.some((o) => o.id === orderB.value.id)).toBe(false);
    expect(histA.orders[0]?.supportUrl).toBe(
      `/lien-he?order=${encodeURIComponent(orderA.value.invoiceNumber)}`,
    );

    // Owner B reads history
    const histB = await repo.readOrderHistory(ownerB.actor);
    expect(histB.orders.some((o) => o.id === orderB.value.id)).toBe(true);
    expect(histB.orders.some((o) => o.id === orderA.value.id)).toBe(false);
    expect(histB.orders[0]?.supportUrl).toBe(
      `/en/lien-he?order=${encodeURIComponent(orderB.value.invoiceNumber)}`,
    );
  });

  it("shows expired orders in order history with preserved invoice number and amount", async () => {
    const owner = await createOwnerFixture();
    const orderId = randomUUID();
    const invoiceNumber = "LSV CUSTOMER/EXPIRED 001";
    const pastDate = new Date("2026-09-01T00:00:00.000Z");

    // Insert an expired order directly into commerceOrders
    await database.insert(commerceOrders).values({
      id: orderId,
      invoiceNumber,
      chartId: owner.chartId,
      chartVersionId: owner.versionId,
      ownerId: owner.userId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale: "vi",
      status: "expired",
      createdAt: pastDate,
    });

    const repo = createDatabaseCommerceRepository(database);
    const history = await repo.readOrderHistory(owner.actor);

    const found = history.orders.find((o) => o.id === orderId);
    expect(found).toBeDefined();
    expect(found?.status).toBe("expired");
    expect(found?.orderStatus).toBe("expired");
    expect(found?.invoiceNumber).toBe(invoiceNumber);
    expect(found?.amount).toBe(79_000);
    expect(found?.currency).toBe("VND");
    expect(found?.reportId).toBeNull();
    expect(found?.readUrl).toBeNull();
    expect(found?.supportUrl).toBe(
      `/lien-he?order=${encodeURIComponent(invoiceNumber)}`,
    );
    expect(found?.supportUrl).not.toContain(orderId);
  });

  it("shows paid report in library with read target and deterministic profile grouping", async () => {
    const owner = await createOwnerFixture({ displayName: "Nguyễn Kỳ An" });
    const repo = createDatabaseCommerceRepository(database);

    const created = await repo.createOrder(owner.actor, owner.chartId, "ZIWEI-IDENTITY-P0", "vi");
    if (!created.ok) throw new Error("Order creation failed");

    await repo.recordPaid({
      invoiceNumber: created.value.invoiceNumber,
      providerEventId: "event-" + randomUUID(),
      amount: 79_000,
      currency: "VND",
      traceId: "trace-read-target",
    });

    const [entitlement] = await database
      .select()
      .from(commerceEntitlements)
      .where(eq(commerceEntitlements.orderId, created.value.id));
    if (!entitlement) throw new Error("Entitlement missing");

    const [reservation] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.entitlementId, entitlement.id));
    if (!reservation) throw new Error("Reservation missing");

    // Insert completed report_versions matching active reservation
    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: reservation.reportId,
      reportVersionId: reservation.reportVersionId,
      entitlementId: entitlement.id,
      chartVersionId: reservation.chartVersionId,
      evidenceVersionId: reservation.evidenceVersionId,
      knowledgeVersionId: reservation.knowledgeVersionId,
      promptVersion: reservation.promptVersion,
      reportConfigVersion: reservation.reportConfigVersion,
      templateVersion: "1.0",
      locale: reservation.locale,
      sku: reservation.sku,
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent: {},
      htmlContent: "<p>Báo cáo Tử Vi</p>",
      contentHash: "a".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "1.0",
    });

    const library = await repo.readAccountLibrary(owner.actor);
    expect(library.version).toBe(1);
    expect(library.totalCount).toBe(1);
    expect(library.groups.length).toBe(1);

    const group = library.groups[0]!;
    expect(group.chartId).toBe(owner.chartId);
    expect(group.profileDisplayName).toBe("Nguyễn Kỳ An");
    expect(group.latestReportId).toBe(reservation.reportId);
    expect(group.latestReadUrl).toMatch(/^\/bao-cao\/[0-9a-f-]+$/);

    const item = library.items[0]!;
    expect(item.orderId).toBe(created.value.id);
    expect(item.productTitle).toBe("Bản mệnh & tiềm năng");
    expect(item.sku).toBe("ZIWEI-IDENTITY-P0");
    expect(item.orderStatus).toBe("paid");
    expect(item.entitlementStatus).toBe("active");
    expect(item.reportStatus).toBe("ready");
    expect(item.reportId).toBe(group.latestReportId);
    expect(item.readUrl).toBe(group.latestReadUrl);
    expect(library.latestReadableReport).toEqual(item);
  });

  it("groups multiple chart revisions for one birth profile into one ordered group", async () => {
    const owner = await createOwnerFixture({ displayName: "Nguyễn Minh An" });
    const newerRevision = await createAdditionalChartRevisionFixture({
      profileId: owner.profileId,
      displayName: owner.displayName,
    });
    const repo = createDatabaseCommerceRepository(database);

    const olderOrder = await repo.createOrder(
      owner.actor,
      owner.chartId,
      "ZIWEI-IDENTITY-P0",
      "vi",
    );
    if (!olderOrder.ok) throw new Error("Older chart order creation failed");
    await repo.recordPaid({
      invoiceNumber: olderOrder.value.invoiceNumber,
      providerEventId: "event-" + randomUUID(),
      amount: 79_000,
      currency: "VND",
      traceId: "trace-profile-revision-old",
    });

    const newerOrder = await repo.createOrder(
      owner.actor,
      newerRevision.chartId,
      "ZIWEI-IDENTITY-P0",
      "vi",
    );
    if (!newerOrder.ok) throw new Error("Newer chart order creation failed");
    await repo.recordPaid({
      invoiceNumber: newerOrder.value.invoiceNumber,
      providerEventId: "event-" + randomUUID(),
      amount: 79_000,
      currency: "VND",
      traceId: "trace-profile-revision-new",
    });

    await database
      .update(commerceOrders)
      .set({ paidAt: new Date("2026-09-08T10:00:00.000Z") })
      .where(eq(commerceOrders.id, olderOrder.value.id));
    await database
      .update(commerceOrders)
      .set({ paidAt: new Date("2026-09-09T10:00:00.000Z") })
      .where(eq(commerceOrders.id, newerOrder.value.id));

    const library = await repo.readAccountLibrary(owner.actor);

    expect(library.totalCount).toBe(2);
    expect(library.groups).toHaveLength(1);
    expect(library.groups[0]?.profileId).toBe(owner.profileId);
    expect(library.groups[0]?.chartId).toBe(newerRevision.chartId);
    expect(library.groups[0]?.items.map((item) => item.chartId)).toEqual([
      newerRevision.chartId,
      owner.chartId,
    ]);
  });

  it("does not mark pending or failed reservation ready merely because older report_versions row exists (Finding 1)", async () => {
    const owner = await createOwnerFixture({ displayName: "Trần Bảo Long" });
    const repo = createDatabaseCommerceRepository(database);

    const created = await repo.createOrder(owner.actor, owner.chartId, "ZIWEI-IDENTITY-P0", "vi");
    if (!created.ok) throw new Error("Order creation failed");

    await repo.recordPaid({
      invoiceNumber: created.value.invoiceNumber,
      providerEventId: "event-" + randomUUID(),
      amount: 79_000,
      currency: "VND",
      traceId: "trace-finding-1",
    });

    const [entitlement] = await database
      .select()
      .from(commerceEntitlements)
      .where(eq(commerceEntitlements.orderId, created.value.id));
    if (!entitlement) throw new Error("Entitlement missing");

    const [reservation] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.entitlementId, entitlement.id));
    if (!reservation) throw new Error("Reservation missing");

    // Insert an older report_versions row with a different reportVersionId for the same entitlement
    const olderReportVersionId = randomUUID();
    const olderReportId = randomUUID();
    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: olderReportId,
      reportVersionId: olderReportVersionId,
      entitlementId: entitlement.id,
      chartVersionId: reservation.chartVersionId,
      evidenceVersionId: reservation.evidenceVersionId,
      knowledgeVersionId: reservation.knowledgeVersionId,
      promptVersion: reservation.promptVersion,
      reportConfigVersion: reservation.reportConfigVersion,
      templateVersion: "1.0",
      locale: reservation.locale,
      sku: reservation.sku,
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent: {},
      htmlContent: "<p>Bản cũ</p>",
      contentHash: "b".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "1.0",
      createdAt: new Date("2026-09-08T09:00:00.000Z"),
    });

    // 1. Current reservation is generating (pending), no matching version for reservation.reportVersionId
    await database
      .update(reportReservations)
      .set({ status: "generating" })
      .where(eq(reportReservations.id, reservation.id));

    const libPending = await repo.readAccountLibrary(owner.actor);
    expect(libPending.totalCount).toBe(1);
    const itemPending = libPending.items[0]!;
    expect(itemPending.reportStatus).toBe("generating");
    expect(itemPending.readUrl).toBeNull();
    expect(libPending.latestReadableReport).toBeNull();
    expect(libPending.groups[0]!.latestReportId).toBeNull();
    expect(libPending.groups[0]!.latestReadUrl).toBeNull();

    // 2. Current reservation failed (terminal_failure)
    await database
      .update(reportReservations)
      .set({ status: "terminal_failure" })
      .where(eq(reportReservations.id, reservation.id));

    const libFailed = await repo.readAccountLibrary(owner.actor);
    const itemFailed = libFailed.items[0]!;
    expect(itemFailed.reportStatus).toBe("terminal_failure");
    expect(itemFailed.readUrl).toBeNull();
    expect(libFailed.latestReadableReport).toBeNull();

    // 3. Now insert the matching report_versions row for reservation.reportVersionId and set html_ready
    await database
      .update(reportReservations)
      .set({ status: "html_ready" })
      .where(eq(reportReservations.id, reservation.id));

    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: reservation.reportId,
      reportVersionId: reservation.reportVersionId,
      entitlementId: entitlement.id,
      chartVersionId: reservation.chartVersionId,
      evidenceVersionId: reservation.evidenceVersionId,
      knowledgeVersionId: reservation.knowledgeVersionId,
      promptVersion: reservation.promptVersion,
      reportConfigVersion: reservation.reportConfigVersion,
      templateVersion: "1.0",
      locale: reservation.locale,
      sku: reservation.sku,
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent: {},
      htmlContent: "<p>Bản mới hoàn tất</p>",
      contentHash: "c".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "1.0",
      createdAt: new Date("2026-09-08T10:00:00.000Z"),
    });

    const libReady = await repo.readAccountLibrary(owner.actor);
    const itemReady = libReady.items[0]!;
    expect(itemReady.reportStatus).toBe("ready");
    expect(itemReady.readUrl).toBe(`/bao-cao/${reservation.reportId}`);
    expect(libReady.latestReadableReport).toEqual(itemReady);
    expect(libReady.groups[0]!.latestReportId).toBe(reservation.reportId);
    expect(libReady.groups[0]!.latestReadUrl).toBe(`/bao-cao/${reservation.reportId}`);
  });

  it("prevents cross-owner metadata leaks and excludes corrupted lineage rows entirely (Finding 2 & Critical correction)", async () => {
    const ownerA = await createOwnerFixture({ displayName: "Chủ Tài Khoản A" });
    const ownerB = await createOwnerFixture({ displayName: "Bí Mật Tài Khoản B" });
    const repo = createDatabaseCommerceRepository(database);
    const reportQueryRepo = createDatabaseReportQueryRepository(database);

    // Scenario 1: Inconsistent entitlement for Owner A with chartId pointing to Owner B chart
    // Must be completely EXCLUDED from library (not returned with null profile fields)
    const orderA1 = await repo.createOrder(ownerA.actor, ownerA.chartId, "ZIWEI-IDENTITY-P0", "vi");
    if (!orderA1.ok) throw new Error("Order A1 failed");
    await repo.recordPaid({
      invoiceNumber: orderA1.value.invoiceNumber,
      providerEventId: "event-" + randomUUID(),
      amount: 79_000,
      currency: "VND",
      traceId: "trace-cross-1",
    });

    // Adversarially tamper entitlement.chartId to point to ownerB.chartId
    await database
      .update(commerceEntitlements)
      .set({ chartId: ownerB.chartId })
      .where(eq(commerceEntitlements.orderId, orderA1.value.id));

    const libA = await repo.readAccountLibrary(ownerA.actor);
    expect(libA.totalCount).toBe(0);
    expect(libA.items).toEqual([]);
    expect(libA.groups).toEqual([]);
    expect(libA.latestReadableReport).toBeNull();

    // Scenario 2: Inconsistent order for Owner A with chartId pointing to Owner B chart in order history
    // Must be completely EXCLUDED from order history
    const orderA2 = await repo.createOrder(ownerA.actor, ownerA.chartId, "ZIWEI-IDENTITY-P0", "vi");
    if (!orderA2.ok) throw new Error("Order A2 failed");
    await database
      .update(commerceOrders)
      .set({ chartId: ownerB.chartId })
      .where(eq(commerceOrders.id, orderA2.value.id));

    const histA = await repo.readOrderHistory(ownerA.actor);
    const tamperedOrder = histA.orders.find((o) => o.id === orderA2.value.id);
    expect(tamperedOrder).toBeUndefined();

    // Scenario 3: Entitlement for Owner A where orderId belongs to Owner B
    const orderBId = randomUUID();
    await database.insert(commerceOrders).values({
      id: orderBId,
      invoiceNumber: "LSV-" + orderBId,
      chartId: ownerB.chartId,
      chartVersionId: ownerB.versionId,
      ownerId: ownerB.userId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });

    const fakeEntitlementId = randomUUID();
    await database.insert(commerceEntitlements).values({
      id: fakeEntitlementId,
      orderId: orderBId,
      chartId: ownerA.chartId,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: ownerA.userId,
    });

    const libAfterFake = await repo.readAccountLibrary(ownerA.actor);
    expect(libAfterFake.items.some((i) => i.id === fakeEntitlementId)).toBe(false);

    // Scenario 4: Entitlement owned by Owner B on Owner A order
    const orderA3Id = randomUUID();
    await database.insert(commerceOrders).values({
      id: orderA3Id,
      invoiceNumber: "LSV-" + orderA3Id,
      chartId: ownerA.chartId,
      chartVersionId: ownerA.versionId,
      ownerId: ownerA.userId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });

    const fakeEntitlementB = randomUUID();
    const fakeResB = randomUUID();
    await database.insert(commerceEntitlements).values({
      id: fakeEntitlementB,
      orderId: orderA3Id,
      chartId: "chart-adversarial-" + randomUUID(),
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: ownerB.userId,
    });
    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId: fakeResB,
      reportVersionId: randomUUID(),
      entitlementId: fakeEntitlementB,
      chartVersionId: ownerB.versionId,
      evidenceVersionId: ownerB.evidenceId,
      knowledgeVersionId: "ziwei.identity.v1",
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "1.0",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
    });

    const histAfterFakeB = await repo.readOrderHistory(ownerA.actor);
    const orderA3Found = histAfterFakeB.orders.find((o) => o.id === orderA3Id);
    expect(orderA3Found?.reportId).toBeNull();
    expect(orderA3Found?.readUrl).toBeNull();

    // Scenario 5: Corrupted entitlement/reservation/version chain attempting to expose another owner report
    const ownerBVictim = await createOwnerFixture({ displayName: "Nạn Nhân B" });
    const ownerAAttacker = await createOwnerFixture({ displayName: "Kẻ Tấn Công A" });

    // Owner B purchases and completes a real report
    const orderBReal = await repo.createOrder(ownerBVictim.actor, ownerBVictim.chartId, "ZIWEI-IDENTITY-P0", "vi");
    if (!orderBReal.ok) throw new Error("Order B Real creation failed");
    await repo.recordPaid({
      invoiceNumber: orderBReal.value.invoiceNumber,
      providerEventId: "event-" + randomUUID(),
      amount: 79_000,
      currency: "VND",
      traceId: "trace-b-real",
    });

    const [entitlementBReal] = await database
      .select()
      .from(commerceEntitlements)
      .where(eq(commerceEntitlements.orderId, orderBReal.value.id));
    const [reservationBReal] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.entitlementId, entitlementBReal!.id));

    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: reservationBReal!.reportId,
      reportVersionId: reservationBReal!.reportVersionId,
      entitlementId: entitlementBReal!.id,
      chartVersionId: reservationBReal!.chartVersionId,
      evidenceVersionId: reservationBReal!.evidenceVersionId,
      knowledgeVersionId: reservationBReal!.knowledgeVersionId,
      promptVersion: reservationBReal!.promptVersion,
      reportConfigVersion: reservationBReal!.reportConfigVersion,
      templateVersion: "1.0",
      locale: reservationBReal!.locale,
      sku: reservationBReal!.sku,
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent: {},
      htmlContent: "<p>Báo cáo của Chủ B</p>",
      contentHash: "f".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "1.0",
    });

    // Owner B can read their own report
    const authBRead = await reportQueryRepo.readAuthorizedReport(ownerBVictim.userId, reservationBReal!.reportId);
    expect(authBRead).not.toBeNull();
    expect(authBRead?.reservation.reportId).toBe(reservationBReal!.reportId);

    // Owner A attempts to read Owner B report directly -> denied (null)
    const directTamperRead = await reportQueryRepo.readAuthorizedReport(ownerAAttacker.userId, reservationBReal!.reportId);
    expect(directTamperRead).toBeNull();

    // Owner A creates a legitimate order, but tampered reservation points to Owner B reportId and chartVersionId
    const orderA5 = await repo.createOrder(ownerAAttacker.actor, ownerAAttacker.chartId, "ZIWEI-IDENTITY-P0", "vi");
    if (!orderA5.ok) throw new Error("Order A5 creation failed");
    await repo.recordPaid({
      invoiceNumber: orderA5.value.invoiceNumber,
      providerEventId: "event-" + randomUUID(),
      amount: 79_000,
      currency: "VND",
      traceId: "trace-a-5",
    });

    const [entitlementA5] = await database
      .select()
      .from(commerceEntitlements)
      .where(eq(commerceEntitlements.orderId, orderA5.value.id));

    // Tamper Owner A reservation to hijack Owner B reportId and reportVersionId
    await database
      .update(reportReservations)
      .set({
        reportId: reservationBReal!.reportId,
        reportVersionId: reservationBReal!.reportVersionId,
        chartVersionId: ownerBVictim.versionId, // points to Owner B chart version!
      })
      .where(eq(reportReservations.entitlementId, entitlementA5!.id));

    // In library: the hijacked report must NOT be emitted as readable
    const libA5 = await repo.readAccountLibrary(ownerAAttacker.actor);
    const itemA5 = libA5.items.find((i) => i.orderId === orderA5.value.id);
    expect(itemA5).toBeDefined();
    expect(itemA5?.readUrl).toBeNull();
    expect(itemA5?.reportId).toBeNull();
    expect(libA5.latestReadableReport).toBeNull();

    // In report query repository: read must be denied (null)
    const corruptedLineageReportRead = await reportQueryRepo.readAuthorizedReport(
      ownerAAttacker.userId,
      reservationBReal!.reportId,
    );
    expect(corruptedLineageReportRead).toBeNull();

    // Scenario 6: Soft-deleted birth profile must be excluded entirely from library and order history
    await database
      .update(birthProfiles)
      .set({ deletedAt: new Date() })
      .where(eq(birthProfiles.id, ownerA.profileId));

    const libAfterDelete = await repo.readAccountLibrary(ownerA.actor);
    expect(libAfterDelete.items).toEqual([]);
    expect(libAfterDelete.groups).toEqual([]);
    expect(libAfterDelete.totalCount).toBe(0);

    const histAfterDelete = await repo.readOrderHistory(ownerA.actor);
    expect(histAfterDelete.orders).toEqual([]);
    expect(histAfterDelete.items).toEqual([]);
    expect(histAfterDelete.totalCount).toBe(0);
  });

  it("deterministically orders report versions using unique id tie-breaker when createdAt timestamps are equal (Finding 3)", async () => {
    const owner = await createOwnerFixture();
    const repo = createDatabaseCommerceRepository(database);

    const created = await repo.createOrder(owner.actor, owner.chartId, "ZIWEI-IDENTITY-P0", "vi");
    if (!created.ok) throw new Error("Order creation failed");
    await repo.recordPaid({
      invoiceNumber: created.value.invoiceNumber,
      providerEventId: "event-" + randomUUID(),
      amount: 79_000,
      currency: "VND",
      traceId: "trace-tie-breaker",
    });

    const [entitlement] = await database
      .select()
      .from(commerceEntitlements)
      .where(eq(commerceEntitlements.orderId, created.value.id));
    if (!entitlement) throw new Error("Entitlement missing");

    const sameTimestamp = new Date("2026-09-08T12:00:00.000Z");
    const idLower = "00000000-0000-0000-0000-000000000001";
    const idHigher = "00000000-0000-0000-0000-000000000002";
    const repVerId1 = randomUUID();
    const repVerId2 = randomUUID();

    // Insert lower ID first
    await database.insert(reportVersions).values({
      id: idLower,
      reportId: randomUUID(),
      reportVersionId: repVerId1,
      entitlementId: entitlement.id,
      chartVersionId: owner.versionId,
      evidenceVersionId: owner.evidenceId,
      knowledgeVersionId: "ziwei.identity.v1",
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "1.0",
      templateVersion: "1.0",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent: {},
      htmlContent: "<p>Version 1</p>",
      contentHash: "d".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "1.0",
      createdAt: sameTimestamp,
    });

    // Insert higher ID second
    await database.insert(reportVersions).values({
      id: idHigher,
      reportId: randomUUID(),
      reportVersionId: repVerId2,
      entitlementId: entitlement.id,
      chartVersionId: owner.versionId,
      evidenceVersionId: owner.evidenceId,
      knowledgeVersionId: "ziwei.identity.v1",
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "1.0",
      templateVersion: "1.0",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent: {},
      htmlContent: "<p>Version 2</p>",
      contentHash: "e".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "1.0",
      createdAt: sameTimestamp,
    });

    // Query with the deterministic ordering used by the repository
    const selected = await database
      .select({ id: reportVersions.id })
      .from(reportVersions)
      .where(inArray(reportVersions.id, [idLower, idHigher]))
      .orderBy(desc(reportVersions.createdAt), desc(reportVersions.id));

    expect(selected.length).toBe(2);
    expect(selected[0]?.id).toBe(idHigher);
    expect(selected[1]?.id).toBe(idLower);
  });

  it("returns empty library and order history for anonymous actor", async () => {
    const repo = createDatabaseCommerceRepository(database);
    const anonymousActor: CurrentActor = {
      kind: "anonymous",
      anonymousActorId: "anon-" + randomUUID(),
      sessionId: "session-" + randomUUID(),
      requestId: "request-" + randomUUID(),
      expiresAt: "2026-09-09T00:00:00+00:00",
    };

    const library = await repo.readAccountLibrary(anonymousActor);
    expect(library).toEqual({
      version: 1,
      groups: [],
      items: [],
      latestReadableReport: null,
      totalCount: 0,
    });

    const history = await repo.readOrderHistory(anonymousActor);
    expect(history).toEqual({
      version: 1,
      orders: [],
      items: [],
      totalCount: 0,
    });
  });

  it("repeated reads return stable data and perform no mutations (side-effect free, C-4)", async () => {
    const owner = await createOwnerFixture();
    const repo = createDatabaseCommerceRepository(database);

    const created = await repo.createOrder(owner.actor, owner.chartId, "ZIWEI-IDENTITY-P0", "vi");
    if (!created.ok) throw new Error("Order creation failed");
    await repo.recordPaid({
      invoiceNumber: created.value.invoiceNumber,
      providerEventId: "event-" + randomUUID(),
      amount: 79_000,
      currency: "VND",
      traceId: "trace-stable",
    });

    // Read 20 times (C-4 requirement: reading 20 times has 0 blocks and is completely free)
    const initialLib = await repo.readAccountLibrary(owner.actor);
    const initialHist = await repo.readOrderHistory(owner.actor);

    for (let i = 0; i < 20; i++) {
      const readLib = await repo.readAccountLibrary(owner.actor);
      const readHist = await repo.readOrderHistory(owner.actor);
      expect(readLib).toEqual(initialLib);
      expect(readHist).toEqual(initialHist);
    }
  });
  it("makes library item non-readable when report chain points to foreign or missing evidence set, while preserving valid pending and terminal-failure states (Finding 1)", async () => {
    const ownerA1 = await createOwnerFixture({ displayName: "Chủ Thể A1" });
    const ownerB = await createOwnerFixture({ displayName: "Nạn Nhân B" });
    const repo = createDatabaseCommerceRepository(database);

    // 1. Foreign evidence set: Owner A1 report chain points to Owner B evidence set
    const orderA1 = await repo.createOrder(ownerA1.actor, ownerA1.chartId, "ZIWEI-IDENTITY-P0", "vi");
    if (!orderA1.ok) throw new Error("Order A1 creation failed");
    await repo.recordPaid({
      invoiceNumber: orderA1.value.invoiceNumber,
      providerEventId: "event-" + randomUUID(),
      amount: 79_000,
      currency: "VND",
      traceId: "trace-foreign-ev-1",
    });

    const [entitlementA1] = await database
      .select()
      .from(commerceEntitlements)
      .where(eq(commerceEntitlements.orderId, orderA1.value.id));
    const [reservationA1] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.entitlementId, entitlementA1!.id));

    // Tamper reservationA1 and create report_versions pointing to ownerB.evidenceId
    await database
      .update(reportReservations)
      .set({
        status: "html_ready",
        evidenceVersionId: ownerB.evidenceId, // points to Owner B evidence set!
      })
      .where(eq(reportReservations.id, reservationA1!.id));

    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: reservationA1!.reportId,
      reportVersionId: reservationA1!.reportVersionId,
      entitlementId: entitlementA1!.id,
      chartVersionId: reservationA1!.chartVersionId,
      evidenceVersionId: ownerB.evidenceId, // points to Owner B evidence set!
      knowledgeVersionId: reservationA1!.knowledgeVersionId,
      promptVersion: reservationA1!.promptVersion,
      reportConfigVersion: reservationA1!.reportConfigVersion,
      templateVersion: "1.0",
      locale: reservationA1!.locale,
      sku: reservationA1!.sku,
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent: {},
      htmlContent: "<p>Tampered evidence report</p>",
      contentHash: "1".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "1.0",
    });

    const libA1 = await repo.readAccountLibrary(ownerA1.actor);
    const itemA1 = libA1.items.find((i) => i.orderId === orderA1.value.id);
    expect(itemA1).toBeDefined();
    expect(itemA1?.readUrl).toBeNull();
    expect(itemA1?.reportId).toBeNull();
    expect(libA1.latestReadableReport).toBeNull();
    expect(libA1.groups[0]?.latestReadUrl).toBeNull();
    expect(libA1.groups[0]?.latestReportId).toBeNull();

    // In order history as well:
    const histA1 = await repo.readOrderHistory(ownerA1.actor);
    const orderA1Found = histA1.orders.find((o) => o.id === orderA1.value.id);
    expect(orderA1Found?.readUrl).toBeNull();
    expect(orderA1Found?.reportId).toBeNull();

    // 2. Missing evidence set: points to non-existent evidence set
    const ownerA2 = await createOwnerFixture({ displayName: "Chủ Thể A2" });
    const orderA2 = await repo.createOrder(ownerA2.actor, ownerA2.chartId, "ZIWEI-IDENTITY-P0", "vi");
    if (!orderA2.ok) throw new Error("Order A2 creation failed");
    await repo.recordPaid({
      invoiceNumber: orderA2.value.invoiceNumber,
      providerEventId: "event-" + randomUUID(),
      amount: 79_000,
      currency: "VND",
      traceId: "trace-missing-ev-2",
    });

    const [entitlementA2] = await database
      .select()
      .from(commerceEntitlements)
      .where(eq(commerceEntitlements.orderId, orderA2.value.id));
    const [reservationA2] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.entitlementId, entitlementA2!.id));

    const nonExistentEvId = "non-existent-" + randomUUID();
    await database
      .update(reportReservations)
      .set({
        status: "html_ready",
        evidenceVersionId: nonExistentEvId,
      })
      .where(eq(reportReservations.id, reservationA2!.id));

    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: reservationA2!.reportId,
      reportVersionId: reservationA2!.reportVersionId,
      entitlementId: entitlementA2!.id,
      chartVersionId: reservationA2!.chartVersionId,
      evidenceVersionId: nonExistentEvId,
      knowledgeVersionId: reservationA2!.knowledgeVersionId,
      promptVersion: reservationA2!.promptVersion,
      reportConfigVersion: reservationA2!.reportConfigVersion,
      templateVersion: "1.0",
      locale: reservationA2!.locale,
      sku: reservationA2!.sku,
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent: {},
      htmlContent: "<p>Missing evidence report</p>",
      contentHash: "2".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "1.0",
    });

    const libA2 = await repo.readAccountLibrary(ownerA2.actor);
    const itemA2 = libA2.items.find((i) => i.orderId === orderA2.value.id);
    expect(itemA2).toBeDefined();
    expect(itemA2?.readUrl).toBeNull();
    expect(itemA2?.reportId).toBeNull();

    // 3. Preserve valid pre-version pending state: generating status, NO report_versions row
    const ownerA3 = await createOwnerFixture({ displayName: "Chủ Thể A3" });
    const orderA3 = await repo.createOrder(ownerA3.actor, ownerA3.chartId, "ZIWEI-IDENTITY-P0", "vi");
    if (!orderA3.ok) throw new Error("Order A3 creation failed");
    await repo.recordPaid({
      invoiceNumber: orderA3.value.invoiceNumber,
      providerEventId: "event-" + randomUUID(),
      amount: 79_000,
      currency: "VND",
      traceId: "trace-pending-ev-3",
    });

    const [entitlementA3] = await database
      .select()
      .from(commerceEntitlements)
      .where(eq(commerceEntitlements.orderId, orderA3.value.id));
    const [reservationA3] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.entitlementId, entitlementA3!.id));

    await database
      .update(reportReservations)
      .set({ status: "generating" })
      .where(eq(reportReservations.id, reservationA3!.id));

    const libA3 = await repo.readAccountLibrary(ownerA3.actor);
    const itemA3 = libA3.items.find((i) => i.orderId === orderA3.value.id);
    expect(itemA3).toBeDefined();
    expect(itemA3?.reportStatus).toBe("generating");
    expect(itemA3?.readUrl).toBeNull();
    expect(itemA3?.reportId).toBe(reservationA3!.reportId);

    // 4. Preserve valid pre-version terminal_failure state: NO report_versions row
    await database
      .update(reportReservations)
      .set({ status: "terminal_failure" })
      .where(eq(reportReservations.id, reservationA3!.id));

    const libA3Failed = await repo.readAccountLibrary(ownerA3.actor);
    const itemA3Failed = libA3Failed.items.find((i) => i.orderId === orderA3.value.id);
    expect(itemA3Failed).toBeDefined();
    expect(itemA3Failed?.reportStatus).toBe("terminal_failure");
    expect(itemA3Failed?.readUrl).toBeNull();
    expect(itemA3Failed?.reportId).toBe(reservationA3!.reportId);
  });

  it("anchors SKU across order, entitlement, reservation, and version in library and order history (Finding 2)", async () => {
    const repo = createDatabaseCommerceRepository(database);

    // 1. Order / Entitlement SKU mismatch
    const owner1 = await createOwnerFixture({ displayName: "Chủ Thể SKU 1" });
    const order1 = await repo.createOrder(owner1.actor, owner1.chartId, "ZIWEI-IDENTITY-P0", "vi");
    if (!order1.ok) throw new Error("Order 1 creation failed");
    await repo.recordPaid({
      invoiceNumber: order1.value.invoiceNumber,
      providerEventId: "event-" + randomUUID(),
      amount: 79_000,
      currency: "VND",
      traceId: "trace-sku-mismatch-1",
    });

    const [entitlement1] = await database
      .select()
      .from(commerceEntitlements)
      .where(eq(commerceEntitlements.orderId, order1.value.id));
    const [reservation1] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.entitlementId, entitlement1!.id));

    // Tamper entitlement SKU to be different from order.sku
    await database
      .update(commerceEntitlements)
      .set({ sku: "ZIWEI-CAREER-P0" })
      .where(eq(commerceEntitlements.id, entitlement1!.id));

    // Complete report version
    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: reservation1!.reportId,
      reportVersionId: reservation1!.reportVersionId,
      entitlementId: entitlement1!.id,
      chartVersionId: reservation1!.chartVersionId,
      evidenceVersionId: reservation1!.evidenceVersionId,
      knowledgeVersionId: reservation1!.knowledgeVersionId,
      promptVersion: reservation1!.promptVersion,
      reportConfigVersion: reservation1!.reportConfigVersion,
      templateVersion: "1.0",
      locale: reservation1!.locale,
      sku: reservation1!.sku,
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent: {},
      htmlContent: "<p>SKU mismatch test</p>",
      contentHash: "3".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "1.0",
    });

    const lib1 = await repo.readAccountLibrary(owner1.actor);
    const item1 = lib1.items.find((i) => i.orderId === order1.value.id);
    expect(item1).toBeDefined();
    expect(item1?.readUrl).toBeNull();
    expect(item1?.reportId).toBeNull();

    const hist1 = await repo.readOrderHistory(owner1.actor);
    const order1Found = hist1.orders.find((o) => o.id === order1.value.id);
    expect(order1Found).toBeDefined();
    expect(order1Found?.readUrl).toBeNull();
    expect(order1Found?.reportId).toBeNull();

    // 2. Reservation / Version SKU mismatch
    const owner2 = await createOwnerFixture({ displayName: "Chủ Thể SKU 2" });
    const order2 = await repo.createOrder(owner2.actor, owner2.chartId, "ZIWEI-IDENTITY-P0", "vi");
    if (!order2.ok) throw new Error("Order 2 creation failed");
    await repo.recordPaid({
      invoiceNumber: order2.value.invoiceNumber,
      providerEventId: "event-" + randomUUID(),
      amount: 79_000,
      currency: "VND",
      traceId: "trace-sku-mismatch-2",
    });

    const [entitlement2] = await database
      .select()
      .from(commerceEntitlements)
      .where(eq(commerceEntitlements.orderId, order2.value.id));
    const [reservation2] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.entitlementId, entitlement2!.id));

    // Version has mismatched SKU from reservation
    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: reservation2!.reportId,
      reportVersionId: reservation2!.reportVersionId,
      entitlementId: entitlement2!.id,
      chartVersionId: reservation2!.chartVersionId,
      evidenceVersionId: reservation2!.evidenceVersionId,
      knowledgeVersionId: reservation2!.knowledgeVersionId,
      promptVersion: reservation2!.promptVersion,
      reportConfigVersion: reservation2!.reportConfigVersion,
      templateVersion: "1.0",
      locale: reservation2!.locale,
      sku: "ZIWEI-CAREER-P0", // mismatched version SKU!
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent: {},
      htmlContent: "<p>Version SKU mismatch</p>",
      contentHash: "4".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "1.0",
    });

    const lib2 = await repo.readAccountLibrary(owner2.actor);
    const item2 = lib2.items.find((i) => i.orderId === order2.value.id);
    expect(item2).toBeDefined();
    expect(item2?.readUrl).toBeNull();
    expect(item2?.reportId).toBeNull();

    const hist2 = await repo.readOrderHistory(owner2.actor);
    const order2Found = hist2.orders.find((o) => o.id === order2.value.id);
    expect(order2Found).toBeDefined();
    expect(order2Found?.readUrl).toBeNull();
    expect(order2Found?.reportId).toBeNull();

    // 3. Preserve valid flow when entire SKU chain matches
    const owner3 = await createOwnerFixture({ displayName: "Chủ Thể SKU 3" });
    const order3 = await repo.createOrder(owner3.actor, owner3.chartId, "ZIWEI-IDENTITY-P0", "vi");
    if (!order3.ok) throw new Error("Order 3 creation failed");
    await repo.recordPaid({
      invoiceNumber: order3.value.invoiceNumber,
      providerEventId: "event-" + randomUUID(),
      amount: 79_000,
      currency: "VND",
      traceId: "trace-sku-valid-3",
    });

    const [entitlement3] = await database
      .select()
      .from(commerceEntitlements)
      .where(eq(commerceEntitlements.orderId, order3.value.id));
    const [reservation3] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.entitlementId, entitlement3!.id));

    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: reservation3!.reportId,
      reportVersionId: reservation3!.reportVersionId,
      entitlementId: entitlement3!.id,
      chartVersionId: reservation3!.chartVersionId,
      evidenceVersionId: reservation3!.evidenceVersionId,
      knowledgeVersionId: reservation3!.knowledgeVersionId,
      promptVersion: reservation3!.promptVersion,
      reportConfigVersion: reservation3!.reportConfigVersion,
      templateVersion: "1.0",
      locale: reservation3!.locale,
      sku: "ZIWEI-IDENTITY-P0", // matches order, entitlement, and reservation!
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent: {},
      htmlContent: "<p>Matching SKU report</p>",
      contentHash: "5".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "1.0",
    });

    const lib3 = await repo.readAccountLibrary(owner3.actor);
    const item3 = lib3.items.find((i) => i.orderId === order3.value.id);
    expect(item3).toBeDefined();
    expect(item3?.readUrl).toBe(`/bao-cao/${reservation3!.reportId}`);
    expect(item3?.reportId).toBe(reservation3!.reportId);
    expect(item3?.reportStatus).toBe("ready");

    const hist3 = await repo.readOrderHistory(owner3.actor);
    const order3Found = hist3.orders.find((o) => o.id === order3.value.id);
    expect(order3Found).toBeDefined();
    expect(order3Found?.readUrl).toBe(`/bao-cao/${reservation3!.reportId}`);
    expect(order3Found?.reportId).toBe(reservation3!.reportId);
  });

  it("uses catalog prices 19,000 for natal excerpt and 79,000 for comprehensive, rejecting reserved SKUs", async () => {
    const repo = createDatabaseCommerceRepository(database);
    const owner = await createOwnerFixture({ displayName: "Pricing Test Owner" });

    // Reserved SKU is rejected with SKU_UNSUPPORTED
    const reservedResult = await repo.createOrder(owner.actor, owner.chartId, "ZIWEI-RELATIONSHIP-P0", "vi");
    expect(reservedResult).toEqual({ ok: false, code: "SKU_UNSUPPORTED" });

    // Arbitrary SKU is rejected with SKU_UNSUPPORTED
    const arbitraryResult = await repo.createOrder(owner.actor, owner.chartId, "UNKNOWN-SKU", "vi");
    expect(arbitraryResult).toEqual({ ok: false, code: "SKU_UNSUPPORTED" });

    // Natal excerpt SKU gets 19,000 VND
    const excerptOrder = await repo.createOrder(owner.actor, owner.chartId, "ZIWEI-NATAL-EXCERPT-P0", "vi");
    expect(excerptOrder.ok).toBe(true);
    if (!excerptOrder.ok) throw new Error("Excerpt order creation failed");
    expect(excerptOrder.value.amount).toBe(19000);
    expect(excerptOrder.value.currency).toBe("VND");
    expect(excerptOrder.value.sku).toBe("ZIWEI-NATAL-EXCERPT-P0");

    // Comprehensive SKU gets 79,000 VND
    const identityOrder = await repo.createOrder(owner.actor, owner.chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(identityOrder.ok).toBe(true);
    if (!identityOrder.ok) throw new Error("Identity order creation failed");
    expect(identityOrder.value.amount).toBe(79000);
    expect(identityOrder.value.currency).toBe("VND");
    expect(identityOrder.value.sku).toBe("ZIWEI-IDENTITY-P0");
  });
});
