import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { CurrentActor } from "@lasoviet/contracts";
import {
  buildAccountSignInRedirect,
  loadAccountOverview,
  loadAccountProfiles,
  loadAccountPrivacy,
} from "./account-center-data.js";

const mockActor: CurrentActor = {
  kind: "account",
  userId: "user-test-1",
  sessionId: "session-test-1",
  requestId: "req-test-1",
};

describe("account-center-data loaders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildAccountSignInRedirect", () => {
    it("builds localized sign-in redirect with callbackURL for vi and en", () => {
      expect(buildAccountSignInRedirect("vi", "/tai-khoan")).toBe(
        "/dang-nhap?callbackURL=%2Ftai-khoan",
      );
      expect(buildAccountSignInRedirect("en", "/tai-khoan")).toBe(
        "/en/dang-nhap?callbackURL=%2Fen%2Ftai-khoan",
      );
      expect(buildAccountSignInRedirect("vi", "/tai-khoan/ho-so-sinh")).toBe(
        "/dang-nhap?callbackURL=%2Ftai-khoan%2Fho-so-sinh",
      );
      expect(buildAccountSignInRedirect("en", "/en/tai-khoan/ho-so-sinh")).toBe(
        "/en/dang-nhap?callbackURL=%2Fen%2Ftai-khoan%2Fho-so-sinh",
      );
    });
  });

  describe("loadAccountOverview", () => {
    it("returns parsed overview projection on success", async () => {
      const mockOverview = {
        account: {
          id: "user-test-1",
          name: "User Test",
          email: "test@example.com",
          createdAt: "2026-09-01T00:00:00.000Z",
        },
        counts: {
          profileCount: 2,
          reportCount: 1,
          orderCount: 1,
          consentActiveCount: 1,
          consentTotalCount: 1,
        },
        recentActivity: [
          {
            id: "act-1",
            type: "profile_created",
            targetId: "prof-1",
            timestamp: "2026-09-02T10:00:00.000Z",
          },
        ],
      };

      const mockClient = {
        request: vi.fn().mockResolvedValue(mockOverview),
      };

      const result = await loadAccountOverview(mockActor, {
        privateApiClient: () => mockClient as any,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.account.email).toBe("test@example.com");
        expect(result.value.counts.profileCount).toBe(2);
        expect(result.value.recentActivity).toHaveLength(1);
      }
    });

    it("returns ACCOUNT_CENTER_UNAVAILABLE on API client error", async () => {
      const mockClient = {
        request: vi.fn().mockRejectedValue(new Error("API network failure")),
      };

      const result = await loadAccountOverview(mockActor, {
        privateApiClient: () => mockClient as any,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ACCOUNT_CENTER_UNAVAILABLE");
        expect(result.error.messageKey).toBe("account.service_unavailable");
      }
    });

    it("returns ACCOUNT_CENTER_PROJECTION_INVALID on schema violation", async () => {
      const mockClient = {
        request: vi.fn().mockResolvedValue({ corrupt: true }),
      };

      const result = await loadAccountOverview(mockActor, {
        privateApiClient: () => mockClient as any,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ACCOUNT_CENTER_PROJECTION_INVALID");
      }
    });
  });

  describe("loadAccountProfiles", () => {
    it("returns parsed profiles projection on success", async () => {
      const mockProfiles = {
        profiles: [
          {
            id: "prof-1",
            calendar: { kind: "solar", date: "1990-05-15" },
            time: { precision: "exact_minute", localTime: "08:30" },
            timezone: { ianaZone: "Asia/Ho_Chi_Minh" },
            gender: "male",
            chartId: "chart-1",
            hasPurchasedReport: true,
            createdAt: "2026-09-01T00:00:00.000Z",
          },
        ],
      };

      const mockClient = {
        request: vi.fn().mockResolvedValue(mockProfiles),
      };

      const result = await loadAccountProfiles(mockActor, {
        privateApiClient: () => mockClient as any,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.profiles).toHaveLength(1);
        expect(result.value.profiles[0]?.id).toBe("prof-1");
      }
    });
  });

  describe("loadAccountPrivacy", () => {
    it("returns parsed privacy projection on success", async () => {
      const mockPrivacy = {
        consents: [
          {
            documentKey: "terms",
            documentVersion: "v1.0",
            purpose: "birth_profile",
            grantedAt: "2026-09-01T00:00:00.000Z",
            revokedAt: null,
            active: true,
          },
        ],
        deletionRequest: null,
      };

      const mockClient = {
        request: vi.fn().mockResolvedValue(mockPrivacy),
      };

      const result = await loadAccountPrivacy(mockActor, {
        privateApiClient: () => mockClient as any,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.consents).toHaveLength(1);
        expect(result.value.deletionRequest).toBeNull();
      }
    });
  });
  describe("i18n account message key parity", () => {
    it("keeps exact key parity between vi and en account.json", async () => {
      const vi = await import("../../../messages/vi/account.json");
      const en = await import("../../../messages/en/account.json");

      function getKeys(obj: any, prefix = ""): string[] {
        let keys: string[] = [];
        for (const [k, v] of Object.entries(obj)) {
          const full = prefix ? `${prefix}.${k}` : k;
          if (v && typeof v === "object" && !Array.isArray(v)) {
            keys = keys.concat(getKeys(v, full));
          } else {
            keys.push(full);
          }
        }
        return keys.sort();
      }

      const viKeys = getKeys(vi.default || vi);
      const enKeys = getKeys(en.default || en);

      expect(viKeys).toEqual(enKeys);
    });
  });

});
