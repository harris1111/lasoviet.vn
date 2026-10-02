import { describe, expect, it } from "vitest";
import { checkFreeAiQuota, freeAiQuotaAlias } from "./free-ai-admission.service.js";
const now = new Date("2026-10-02T12:00:00Z");
describe("free AI rolling quota", () => {
  it("counts distinct admissions in the last 24h with guest1/account3", () => {
    const admissions = [{ requestId: "a", admittedAt: new Date("2026-10-02T00:00:00Z") }, { requestId: "a", admittedAt: now }];
    expect(checkFreeAiQuota("guest", admissions, now)).toBe(false);
    expect(checkFreeAiQuota("account", admissions, now)).toBe(true);
    expect(checkFreeAiQuota("account", [...admissions, { requestId: "b", admittedAt: now }, { requestId: "c", admittedAt: now }], now)).toBe(false);
  });
  it("expires exact 24h history using the supplied server clock", () => {
    expect(checkFreeAiQuota("guest", [{ requestId: "old", admittedAt: new Date("2026-10-01T12:00:00Z") }], now)).toBe(true);
  });
  it("does not leak actor identifiers in stable alias keys", () => {
    expect(freeAiQuotaAlias("guest", "private-user-id")).not.toContain("private-user-id");
    expect(freeAiQuotaAlias("guest", "same")).not.toBe(freeAiQuotaAlias("account", "same"));
  });
});
