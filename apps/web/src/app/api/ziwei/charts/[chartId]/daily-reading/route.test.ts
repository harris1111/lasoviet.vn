import { beforeEach, describe, expect, it, vi } from "vitest";
import { NormalizedBirthProfileV1Schema } from "@lasoviet/contracts";
import { writePersonalDailyReading } from "../../../../../../../../../packages/engine-adapters/src/ziwei/personal-daily-reading-writer.js";
import { resolveVerifiedAccountActor, VerifiedAccountResolutionError } from "../../../../../../auth/resolve-current-actor.js";
import { privateApiClient } from "../../../../../../api/private-api-client.js";
import { GET } from "./route.js";

vi.mock("../../../../../../auth/resolve-current-actor.js", () => ({ resolveVerifiedAccountActor: vi.fn(), VerifiedAccountResolutionError: class extends Error {} }));
vi.mock("../../../../../../api/private-api-client.js", () => ({ privateApiClient: vi.fn(), PrivateApiClientError: class extends Error {} }));
const request = vi.fn();
const profile = NormalizedBirthProfileV1Schema.parse({
  version: 1,
  originalInput: { version: 1, calendar: { kind: "solar", date: "2000-01-01" }, time: { precision: "exact_minute", localTime: "12:00" }, timezone: { offsetMinutes: 420 }, consentVersion: "1.0", gender: "female" },
  normalizedCalendar: { kind: "solar", date: "2000-01-01" }, normalizedTime: { precision: "exact_minute", localTime: "12:00" },
  timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [],
});
const reading = writePersonalDailyReading(profile, { chartId: "chart", chartVersionId: "version", asOfDate: "2026-09-30", now: () => new Date("2026-09-30T00:00:00Z") });
const get = () => GET(new Request("https://lasoviet.net/api/ziwei/charts/chart/daily-reading"), { params: Promise.resolve({ chartId: "chart" }) });
describe("private personal daily reading proxy", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue({ kind: "account", userId: "owner", sessionId: "session", requestId: "request" });
    vi.mocked(privateApiClient).mockReturnValue({ request });
  });
  it("does not call the private API without a verified account", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"));
    expect((await get()).status).toBe(401);
    expect(request).not.toHaveBeenCalled();
  });
  it("returns only a validated reading and disables caching and indexing", async () => {
    request.mockResolvedValue({ ok: true, value: reading });
    const response = await get();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(reading);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });
  it("never forwards locked content supplied alongside a failed authorization", async () => {
    request.mockResolvedValue({ ok: false, value: reading });
    const response = await get();
    expect(response.status).toBe(403);
    expect(await response.text()).toBe("");
  });
  it.each([{ ...reading, chartId: "another-chart" }, { ...reading, qualityGate: { ...reading.qualityGate, passed: false } }])("rejects invalid authority or failed quality gates", async (value) => {
    request.mockResolvedValue({ ok: true, value });
    expect((await get()).status).toBe(502);
  });
});
