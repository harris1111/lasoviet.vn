import { describe, expect, it, vi } from "vitest";

import {
  createOutboxDispatcher,
  createOutboxDispatchSchedule,
} from "./outbox.dispatcher.js";

describe("outbox dispatcher", () => {
  it("claims one report request and publishes the Task 3 job shape once", async () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    const dispatcher = createOutboxDispatcher({
      claim: async () => ({
        id: "outbox-1",
        eventId: "event-1",
        traceId: "trace-1",
        idempotencyKey: "report-request:version-1",
        eventType: "report.generation.requested.v1",
        payload: { reportId: "report-1", reportVersionId: "version-1", entitlementId: "entitlement-1", chartVersionId: "chart-version-1", evidenceVersionId: "evidence-1", knowledgeVersionId: "knowledge-1", promptVersion: "prompt-1", reportConfigVersion: "config-1", locale: "vi", sku: "ZIWEI-IDENTITY-P0" },
      }),
      markProcessed: async () => undefined,
      release: async () => undefined,
      publish,
    });

    await expect(dispatcher.dispatchOne()).resolves.toEqual({ dispatched: true });
    expect(publish).toHaveBeenCalledWith({
      schemaVersion: 1,
      name: "report.generate.v1",
      sourceEventId: "event-1",
      traceId: "trace-1",
      idempotencyKey: "report-generate:version-1",
      payload: expect.objectContaining({
        reportVersionId: "version-1",
      }),
    });
  });

  it("releases a claimed event when publish fails", async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const dispatcher = createOutboxDispatcher({
      claim: async () => ({ id: "outbox-1", eventId: "event-1", traceId: "trace-1", idempotencyKey: "report-request:v", eventType: "report.generation.requested.v1", payload: { reportId: "report", reportVersionId: "v", entitlementId: "entitlement", chartVersionId: "chart-version", evidenceVersionId: "evidence", knowledgeVersionId: "knowledge", promptVersion: "prompt", reportConfigVersion: "config", locale: "vi", sku: "ZIWEI-IDENTITY-P0" } }),
      markProcessed: async () => undefined,
      release,
      publish: async () => { throw new Error("redis unavailable"); },
    });

    await expect(dispatcher.dispatchOne()).resolves.toEqual({ dispatched: false });
    expect(release).toHaveBeenCalledWith("outbox-1", "OUTBOX_PUBLISH_FAILED");
  });

  it("does not overlap scheduled dispatch and catches a failed cycle", async () => {
    let release: (() => void) | undefined;
    const pending = new Promise<{ dispatched: boolean }>((resolve) => {
      release = () => resolve({ dispatched: false });
    });
    const runOnce = vi.fn().mockReturnValueOnce(pending).mockRejectedValueOnce(
      new Error("claim failed"),
    );
    const reportError = vi.fn();
    const schedule = createOutboxDispatchSchedule({ runOnce, reportError });

    const first = schedule.run();
    const second = schedule.run();
    expect(second).toBe(first);
    expect(runOnce).toHaveBeenCalledTimes(1);
    release?.();
    await first;

    await schedule.run();
    expect(reportError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("releases an invalid report generation requested payload as OUTBOX_EVENT_INVALID", async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const dispatcher = createOutboxDispatcher({
      claim: async () => ({
        id: "outbox-invalid",
        eventId: "event-bad",
        traceId: "trace-bad",
        idempotencyKey: "report-request:bad",
        eventType: "report.generation.requested.v1",
        payload: { reportId: "" },
      }),
      markProcessed: async () => undefined,
      release,
      publish: async () => undefined,
    });

    await expect(dispatcher.dispatchOne()).resolves.toEqual({ dispatched: false });
    expect(release).toHaveBeenCalledWith("outbox-invalid", "OUTBOX_EVENT_INVALID");
  });
  it("claims one V2 report request and publishes the V2 job shape with schemaVersion 2", async () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    const v2Payload = {
      reportId: "report-2",
      reportVersionId: "version-2",
      entitlementId: "entitlement-2",
      chartVersionId: "chart-version-2",
      evidenceVersionId: "evidence-2",
      knowledgeVersionId: "knowledge-4",
      promptVersion: "prompt-4",
      reportConfigVersion: "config-4",
      locale: "vi" as const,
      sku: "ZIWEI-IDENTITY-P0",
      asOfDate: "2026-09-12",
      targetYear: 2026,
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
    };

    const dispatcher = createOutboxDispatcher({
      claim: async () => ({
        id: "outbox-2",
        eventId: "event-2",
        traceId: "trace-2",
        idempotencyKey: "report-request:version-2",
        eventType: "report.generation.requested.v2",
        payload: v2Payload,
      }),
      markProcessed: async () => undefined,
      release: async () => undefined,
      publish,
    });

    await expect(dispatcher.dispatchOne()).resolves.toEqual({ dispatched: true });
    expect(publish).toHaveBeenCalledWith({
      schemaVersion: 2,
      name: "report.generate.v2",
      sourceEventId: "event-2",
      traceId: "trace-2",
      idempotencyKey: "report-generate:version-2",
      payload: v2Payload,
    });
  });

  it("releases an invalid V2 report generation requested payload as OUTBOX_EVENT_INVALID", async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const dispatcher = createOutboxDispatcher({
      claim: async () => ({
        id: "outbox-v2-invalid",
        eventId: "event-v2-bad",
        traceId: "trace-bad",
        idempotencyKey: "report-request:bad",
        eventType: "report.generation.requested.v2",
        payload: {
          reportId: "report-2",
          asOfDate: "2026-09-12",
          targetYear: 2025, // mismatched targetYear
        },
      }),
      markProcessed: async () => undefined,
      release,
      publish: async () => undefined,
    });

    await expect(dispatcher.dispatchOne()).resolves.toEqual({ dispatched: false });
    expect(release).toHaveBeenCalledWith("outbox-v2-invalid", "OUTBOX_EVENT_INVALID");
  });

  it("publishes one fenced PDF render job with the exact stored render version", async () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    const dispatcher = createOutboxDispatcher({
      claim: async () => ({
        id: "outbox-pdf-1",
        eventId: "event-pdf-1",
        traceId: "trace-pdf-1",
        idempotencyKey: "pdf-request:version-1:identity-report-pdf.v2",
        eventType: "report.pdf.requested.v1",
        payload: {
          reportId: "report-1",
          reportVersionId: "version-1",
          assetId: "asset-1",
          renderVersion: "identity-report-pdf.v2",
        },
      }),
      markProcessed: async () => undefined,
      release: async () => undefined,
      publish,
    });

    await expect(dispatcher.dispatchOne()).resolves.toEqual({ dispatched: true });
    expect(publish).toHaveBeenCalledWith({
      schemaVersion: 1,
      name: "report.pdf.render.v1",
      sourceEventId: "event-pdf-1",
      traceId: "trace-pdf-1",
      idempotencyKey: "pdf-render:asset-1:identity-report-pdf.v2",
      payload: {
        reportId: "report-1",
        reportVersionId: "version-1",
        assetId: "asset-1",
        renderVersion: "identity-report-pdf.v2",
      },
    });
  });

  it("rejects invalid PDF requests and never publishes fulfillment failure events", async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const dispatcher = createOutboxDispatcher({
      claim: vi.fn()
        .mockResolvedValueOnce({
          id: "outbox-pdf-invalid",
          eventId: "event-pdf-invalid",
          traceId: "trace-pdf-invalid",
          idempotencyKey: "pdf-request:invalid",
          eventType: "report.pdf.requested.v1",
          payload: { reportId: "report-1", renderVersion: "identity-report-pdf.v3" },
        })
        .mockResolvedValueOnce({
          id: "outbox-failed",
          eventId: "event-failed",
          traceId: "trace-failed",
          idempotencyKey: "report-failed:version-1:pdf",
          eventType: "report.fulfillment.failed.v1",
          payload: {},
        }),
      markProcessed: async () => undefined,
      release,
      publish: async () => undefined,
    });

    await expect(dispatcher.dispatchOne()).resolves.toEqual({ dispatched: false });
    await expect(dispatcher.dispatchOne()).resolves.toEqual({ dispatched: false });
    expect(release).toHaveBeenNthCalledWith(1, "outbox-pdf-invalid", "OUTBOX_EVENT_INVALID");
    expect(release).toHaveBeenNthCalledWith(2, "outbox-failed", "OUTBOX_EVENT_INVALID");
  });
});
