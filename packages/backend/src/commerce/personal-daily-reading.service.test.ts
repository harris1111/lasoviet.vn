import { describe, expect, it, vi } from "vitest";
import { writePersonalDailyReading } from "../../../engine-adapters/src/ziwei/personal-daily-reading-writer.js";
import type { CurrentActor } from "@lasoviet/contracts";
import { createPersonalDailyReadingService } from "./personal-daily-reading.service.js";

const actor: CurrentActor = { kind: "account", userId: "owner", sessionId: "session", requestId: "request" };
const chart = {
  chartId: "chart", chartVersionId: "version", normalizedOutput: {},
  originalInput: {
    version: 1, calendar: { kind: "solar", date: "2000-01-01" },
    time: { precision: "exact_minute", localTime: "12:00" },
    timezone: { offsetMinutes: 420 }, consentVersion: "1.0", gender: "female",
  },
  normalizedInput: {
    version: 1, normalizedCalendar: { kind: "solar", date: "2000-01-01" },
    normalizedTime: { precision: "exact_minute", localTime: "12:00" },
    timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [],
  },
  evidenceSetId: null, capabilityId: null, ruleVersion: null, items: [],
};
const grant = { chartVersionId: "version", grantedAt: new Date("2026-09-20T17:30:00Z"), expiresAt: new Date("2026-09-27T17:30:00Z") };
function fixture(now = new Date("2026-09-26T18:00:00Z")) {
  const charts = { readAuthorizedChart: vi.fn().mockResolvedValue(chart), readEvidenceItem: vi.fn() };
  const access = vi.fn().mockResolvedValue(grant);
  const writer = vi.fn(writePersonalDailyReading);
  return { charts, access, writer, service: createPersonalDailyReadingService({ charts, access, writer, now: () => now }) };
}

describe("personal daily reading authorization", () => {
  it("writes the authorized chart for today's Vietnam date with an injected clock", async () => {
    const { service, writer } = fixture();
    const result = await service.read(actor, "chart");
    expect(result).toMatchObject({ ok: true, value: {
      chartId: "chart", chartVersionId: "version", asOfDate: "2026-09-27",
      qualityGate: { passed: true, checkedAt: "2026-09-26T18:00:00.000Z" },
    } });
    expect(writer).toHaveBeenCalledOnce();
  });

  it.each(["2026-09-20T17:29:59.999Z", "2026-09-27T17:30:00Z", "2026-09-28T00:00:00Z"])("denies outside the persisted grant at %s", async (time) => {
    const { service, writer } = fixture(new Date(time));
    expect(await service.read(actor, "chart")).toMatchObject({ ok: false, error: { code: "DAILY_READING_FORBIDDEN" } });
    expect(writer).not.toHaveBeenCalled();
  });

  it("denies anonymous callers before reading a private chart", async () => {
    const { service, charts, writer } = fixture();
    expect(await service.read({ kind: "anonymous", anonymousActorId: "anon", expiresAt: "2026-10-01T00:00:00Z" }, "chart"))
      .toMatchObject({ ok: false, error: { code: "DAILY_READING_FORBIDDEN" } });
    expect(charts.readAuthorizedChart).not.toHaveBeenCalled();
    expect(writer).not.toHaveBeenCalled();
  });

  it("does not leak another owner's chart or generate without a paid grant", async () => {
    const { service, charts, access, writer } = fixture();
    charts.readAuthorizedChart.mockResolvedValueOnce(null);
    expect(await service.read(actor, "other-chart")).toMatchObject({ ok: false, error: { code: "CHART_NOT_FOUND" } });
    expect(access).not.toHaveBeenCalled();
    access.mockResolvedValueOnce(null);
    expect(await service.read(actor, "chart")).toMatchObject({ ok: false, error: { code: "DAILY_READING_FORBIDDEN" } });
    access.mockResolvedValueOnce({ ...grant, chartVersionId: "other-version" });
    expect(await service.read(actor, "chart")).toMatchObject({ ok: false, error: { code: "DAILY_READING_FORBIDDEN" } });
    expect(writer).not.toHaveBeenCalled();
  });
});
