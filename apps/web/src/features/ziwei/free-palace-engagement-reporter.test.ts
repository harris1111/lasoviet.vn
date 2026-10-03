import { describe, expect, it, vi } from "vitest";
import { createEngagementReporter } from "./free-palace-engagement-reporter";

describe("free palace engagement reporter", () => {
  it("reports each tab once, however many times it is opened", () => {
    const record = vi.fn(async (_tab: string) => undefined);
    const reporter = createEngagementReporter(record);
    for (const tab of ["palaces", "palaces", "topics", "palaces", "evidence", "topics"]) reporter.report(tab);
    expect(record.mock.calls.map((call) => call[0])).toEqual(["palaces", "topics", "evidence"]);
  });
  it("does nothing without a recorder", () => {
    expect(() => createEngagementReporter(undefined).report("palaces")).not.toThrow();
  });
  it("swallows a rejected or throwing recorder so the reading is never affected", async () => {
    const rejecting = createEngagementReporter(async () => { throw new Error("offline"); });
    expect(() => rejecting.report("palaces")).not.toThrow();
    const throwing = createEngagementReporter(() => { throw new Error("sync"); });
    expect(() => throwing.report("topics")).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 5));
  });
});
