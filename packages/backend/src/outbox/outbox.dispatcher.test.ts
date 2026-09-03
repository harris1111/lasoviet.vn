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
});
