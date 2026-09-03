import { describe, expect, it, vi } from "vitest";

import { createOutboxDispatcher } from "./outbox.dispatcher.js";

describe("outbox dispatcher", () => {
  it("claims one report request and publishes the Task 3 job shape once", async () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    const dispatcher = createOutboxDispatcher({
      claim: async () => ({
        id: "outbox-1",
        eventType: "report.generation.requested.v1",
        payload: { reportReservationId: "reservation-1", reportVersionId: "version-1" },
      }),
      markProcessed: async () => undefined,
      release: async () => undefined,
      publish,
    });

    await expect(dispatcher.dispatchOne()).resolves.toEqual({ dispatched: true });
    expect(publish).toHaveBeenCalledWith("report.generate.v1", {
      reportReservationId: "reservation-1",
      reportVersionId: "version-1",
    });
  });

  it("releases a claimed event when publish fails", async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const dispatcher = createOutboxDispatcher({
      claim: async () => ({ id: "outbox-1", eventType: "report.generation.requested.v1", payload: { reportReservationId: "r", reportVersionId: "v" } }),
      markProcessed: async () => undefined,
      release,
      publish: async () => { throw new Error("redis unavailable"); },
    });

    await expect(dispatcher.dispatchOne()).resolves.toEqual({ dispatched: false });
    expect(release).toHaveBeenCalledWith("outbox-1", "OUTBOX_PUBLISH_FAILED");
  });
});
