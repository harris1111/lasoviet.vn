import { describe, expect, it, vi } from "vitest";
import type { CurrentActor } from "@lasoviet/contracts";

import {
  createGuaranteeFeedbackService,
  resolveRelatedPalaceSuggestion,
} from "./guarantee-feedback.service.js";

describe("Guarantee and feedback service", () => {
  describe("resolveRelatedPalaceSuggestion", () => {
    it("returns opposite palace for life / overview / excerpt", () => {
      const result = resolveRelatedPalaceSuggestion("section-overview");
      expect(result.palaceId).toBe("ziwei.palace.travel");
      expect(result.palaceName).toBe("Cung Thiên Di");
      expect(result.relationType).toBe("opposite");
    });

    it("returns opposite palace for wealth", () => {
      const result = resolveRelatedPalaceSuggestion("ziwei.palace.wealth");
      expect(result.palaceId).toBe("ziwei.palace.fortune");
      expect(result.palaceName).toBe("Cung Phúc Đức");
      expect(result.relationType).toBe("opposite");
    });

    it("returns opposite palace for career", () => {
      const result = resolveRelatedPalaceSuggestion("ziwei.palace.career");
      expect(result.palaceId).toBe("ziwei.palace.spouse");
      expect(result.palaceName).toBe("Cung Phu Thê");
      expect(result.relationType).toBe("opposite");
    });

    it("returns opposite palace for spouse", () => {
      const result = resolveRelatedPalaceSuggestion("ziwei.palace.spouse");
      expect(result.palaceId).toBe("ziwei.palace.career");
      expect(result.palaceName).toBe("Cung Quan Lộc");
      expect(result.relationType).toBe("opposite");
    });

    it("returns opposite palace for children", () => {
      const result = resolveRelatedPalaceSuggestion("ziwei.palace.children");
      expect(result.palaceId).toBe("ziwei.palace.property");
      expect(result.palaceName).toBe("Cung Điền Trạch");
      expect(result.relationType).toBe("opposite");
    });

    it("returns complementary palace for general sections", () => {
      const result = resolveRelatedPalaceSuggestion("section-practical-direction");
      expect(result.palaceId).toBe("ziwei.palace.fortune");
      expect(result.palaceName).toBe("Cung Phúc Đức");
      expect(result.relationType).toBe("complementary");
    });
  });

  describe("submitPartFeedback", () => {
    const verifiedActor: CurrentActor = {
      kind: "account",
      userId: "user-123",
      sessionId: "session-1",
      requestId: "req-1",
    };

    it("rejects invalid input schema", async () => {
      const database: any = {};
      const walletService: any = {};
      const service = createGuaranteeFeedbackService(database, walletService);

      const result = await service.submitPartFeedback(verifiedActor, {
        chartId: "",
        partId: "",
        rating: "invalid" as any,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("FEEDBACK_INVALID");
      }
    });

    it("rejects when chart is not found", async () => {
      const database: any = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };
      const walletService: any = {};
      const service = createGuaranteeFeedbackService(database, walletService);

      const result = await service.submitPartFeedback(verifiedActor, {
        chartId: "chart-nonexistent",
        partId: "section-overview",
        rating: "accurate",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("FEEDBACK_CHART_NOT_FOUND");
      }
    });

    it("submits feedback successfully for accurate rating without palace suggestion", async () => {
      const now = new Date("2026-09-27T10:00:00.000Z");
      const database: any = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: "chart-123" }]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: "fb-123",
                userId: "user-123",
                chartId: "chart-123",
                partId: "section-overview",
                reportId: "rep-1",
                rating: "accurate",
                comment: "Rất đúng",
                createdAt: now,
              },
            ]),
          }),
        }),
      };
      const walletService: any = {};
      const service = createGuaranteeFeedbackService(database, walletService, { now: () => now });

      const result = await service.submitPartFeedback(verifiedActor, {
        chartId: "chart-123",
        partId: "section-overview",
        reportId: "rep-1",
        rating: "accurate",
        comment: "Rất đúng",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.feedback.id).toBe("fb-123");
        expect(result.value.feedback.rating).toBe("accurate");
        expect(result.value.relatedPalaceSuggestion).toBeNull();
      }
    });

    it("submits feedback successfully for inaccurate rating with palace suggestion", async () => {
      const now = new Date("2026-09-27T10:00:00.000Z");
      const database: any = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: "chart-123" }]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: "fb-456",
                userId: "user-123",
                chartId: "chart-123",
                partId: "ziwei.palace.wealth",
                reportId: "rep-1",
                rating: "inaccurate",
                comment: "Không khớp",
                createdAt: now,
              },
            ]),
          }),
        }),
      };
      const walletService: any = {};
      const service = createGuaranteeFeedbackService(database, walletService, { now: () => now });

      const result = await service.submitPartFeedback(verifiedActor, {
        chartId: "chart-123",
        partId: "ziwei.palace.wealth",
        reportId: "rep-1",
        rating: "inaccurate",
        comment: "Không khớp",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.feedback.id).toBe("fb-456");
        expect(result.value.relatedPalaceSuggestion?.palaceId).toBe("ziwei.palace.fortune");
      }
    });
  });

  describe("claimGuarantee", () => {
    const verifiedActor: CurrentActor = {
      kind: "account",
      userId: "user-123",
      sessionId: "session-1",
      requestId: "req-1",
    };

    const anonymousActor: CurrentActor = {
      kind: "anonymous",
      anonymousActorId: "anon-1",
      sessionId: "session-1",
      requestId: "req-1",
      expiresAt: "2026-09-28T00:00:00.000Z",
    };

    it("rejects unauthenticated or anonymous callers", async () => {
      const database: any = {};
      const walletService: any = {};
      const service = createGuaranteeFeedbackService(database, walletService);

      const result = await service.claimGuarantee(anonymousActor, {
        chartId: "chart-123",
        partId: "ZIWEI-NATAL-EXCERPT-P0",
        rating: "inaccurate",
        idempotencyKey: "key-1",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("GUARANTEE_ACCOUNT_REQUIRED");
      }
    });

    it("rejects when account is unverified", async () => {
      const database: any = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                { emailVerified: false, isAnonymous: false },
              ]),
            }),
          }),
        }),
      };
      const walletService: any = {};
      const service = createGuaranteeFeedbackService(database, walletService);

      const result = await service.claimGuarantee(verifiedActor, {
        chartId: "chart-123",
        partId: "ZIWEI-NATAL-EXCERPT-P0",
        rating: "inaccurate",
        idempotencyKey: "key-1",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("GUARANTEE_ACCOUNT_INELIGIBLE");
      }
    });

    it("rejects when caller is not the owner of the chart", async () => {
      const database: any = {
        select: vi.fn()
          // First select: authUsers
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { emailVerified: true, isAnonymous: false },
                ]),
              }),
            }),
          })
          // Second select: ziweiCharts + birthProfiles (not found)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
      };
      const walletService: any = {};
      const service = createGuaranteeFeedbackService(database, walletService);

      const result = await service.claimGuarantee(verifiedActor, {
        chartId: "chart-other-user",
        partId: "ZIWEI-NATAL-EXCERPT-P0",
        rating: "inaccurate",
        idempotencyKey: "key-1",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("GUARANTEE_NOT_OWNER");
      }
    });

    it("refuses duplicate claim if account has already made a guarantee claim (First claim only)", async () => {
      const database: any = {
        select: vi.fn()
          // 1. authUsers
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { emailVerified: true, isAnonymous: false },
                ]),
              }),
            }),
          })
          // 2. chart ownership
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ id: "chart-123" }]),
                }),
              }),
            }),
          })
          // 3. check existing key (none)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          })
          // 4. check existing account claim -> already claimed!
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: "prior-claim-id" }]),
              }),
            }),
          }),
      };
      const walletService: any = {};
      const service = createGuaranteeFeedbackService(database, walletService);

      const result = await service.claimGuarantee(verifiedActor, {
        chartId: "chart-123",
        partId: "ZIWEI-NATAL-EXCERPT-P0",
        rating: "inaccurate",
        idempotencyKey: "key-2",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("GUARANTEE_ALREADY_CLAIMED");
      }
    });

    it("refuses claim if item price >= 500 Lá (price limit)", async () => {
      const now = new Date("2026-09-27T10:00:00.000Z");
      const database: any = {
        select: vi.fn()
          // 1. authUsers
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { emailVerified: true, isAnonymous: false },
                ]),
              }),
            }),
          })
          // 2. chart ownership
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ id: "chart-123" }]),
                }),
              }),
            }),
          })
          // 3. existing key (none)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          })
          // 4. existing account claim (none)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          })
          // 5. entitlements query
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([
                  {
                    entitlement: {
                      id: "ent-tier2",
                      sku: "ZIWEI-IDENTITY-P0",
                      scope: { sections: ["overview", "coreAxis", "palaceReadings"] },
                    },
                    spend: {
                      id: "spend-tier2",
                      purchaseIntentId: "intent-tier2",
                      createdAt: new Date("2026-09-27T09:00:00.000Z"),
                    },
                  },
                ]),
              }),
            }),
          })
          // 6. reversal check (none)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          })
          // 7. purchase intent price: 720 Lá >= 500
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ priceLa: 720 }]),
              }),
            }),
          }),
      };
      const walletService: any = {};
      const service = createGuaranteeFeedbackService(database, walletService, { now: () => now });

      const result = await service.claimGuarantee(verifiedActor, {
        chartId: "chart-123",
        partId: "ZIWEI-IDENTITY-P0",
        rating: "inaccurate",
        idempotencyKey: "key-3",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("GUARANTEE_PRICE_EXCEEDS_LIMIT");
      }
    });

    it("refuses claim if outside 24h window", async () => {
      const now = new Date("2026-09-29T10:00:00.000Z"); // 48h later
      const database: any = {
        select: vi.fn()
          // 1. authUsers
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { emailVerified: true, isAnonymous: false },
                ]),
              }),
            }),
          })
          // 2. chart ownership
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ id: "chart-123" }]),
                }),
              }),
            }),
          })
          // 3. existing key (none)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          })
          // 4. existing account claim (none)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          })
          // 5. entitlements query
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([
                  {
                    entitlement: {
                      id: "ent-tier1",
                      sku: "ZIWEI-NATAL-EXCERPT-P0",
                      scope: { sections: ["overview", "coreAxis"] },
                    },
                    spend: {
                      id: "spend-tier1",
                      purchaseIntentId: "intent-tier1",
                      createdAt: new Date("2026-09-27T08:00:00.000Z"), // 50 hours ago
                    },
                  },
                ]),
              }),
            }),
          })
          // 6. reversal check (none)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          })
          // 7. purchase intent price: 240 Lá
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ priceLa: 240 }]),
              }),
            }),
          }),
      };
      const walletService: any = {};
      const service = createGuaranteeFeedbackService(database, walletService, { now: () => now });

      const result = await service.claimGuarantee(verifiedActor, {
        chartId: "chart-123",
        partId: "section-overview",
        rating: "inaccurate",
        idempotencyKey: "key-4",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("GUARANTEE_WINDOW_EXPIRED");
      }
    });

    it("approves valid claim, restores wallet, revokes entitlement, and records claim", async () => {
      const now = new Date("2026-09-27T12:00:00.000Z");
      const spendTime = new Date("2026-09-27T10:00:00.000Z"); // 2 hours ago

      const updateEntitlementMock = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });
      const insertFeedbackMock = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: "fb-created-id",
              userId: "user-123",
              chartId: "chart-123",
              partId: "section-overview",
              rating: "inaccurate",
              comment: "Không khớp thực tế",
              createdAt: now,
            },
          ]),
        }),
      });
      const insertClaimMock = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([]),
      });

      const database: any = {
        select: vi.fn()
          // 1. authUsers
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { emailVerified: true, isAnonymous: false },
                ]),
              }),
            }),
          })
          // 2. chart ownership
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ id: "chart-123" }]),
                }),
              }),
            }),
          })
          // 3. existing key (none)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          })
          // 4. existing account claim (none)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          })
          // 5. entitlements query
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([
                  {
                    entitlement: {
                      id: "ent-tier1",
                      sku: "ZIWEI-NATAL-EXCERPT-P0",
                      scope: { sections: ["overview", "coreAxis"] },
                    },
                    spend: {
                      id: "spend-tier1",
                      purchaseIntentId: "intent-tier1",
                      createdAt: spendTime,
                    },
                  },
                ]),
              }),
            }),
          })
          // 6. reversal check (none)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          })
          // 7. purchase intent price: 240 Lá
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ priceLa: 240 }]),
              }),
            }),
          })
          // 8. wallet account lookup
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { id: "wallet-1", ownerId: "user-123", stateVersion: 5 },
                ]),
              }),
            }),
          }),
        update: vi.fn().mockReturnValue({
          set: updateEntitlementMock,
        }),
        insert: vi.fn()
          // 1st insert: feedback
          .mockImplementationOnce(() => insertFeedbackMock())
          // 2nd insert: guarantee claim
          .mockImplementationOnce(() => insertClaimMock()),
      };

      const walletService: any = {
        restore: vi.fn().mockResolvedValue({
          ok: true,
          value: {
            version: 1,
            commandId: "cmd-restore-1",
            transactionId: "tx-restore-1",
            status: "completed",
            balance: {
              version: 1,
              stateVersion: 6,
              purchasedLa: 240,
              promotionalLa: 0,
              totalLa: 240,
              updatedAt: now.toISOString(),
            },
            completedAt: now.toISOString(),
          },
        }),
      };

      const service = createGuaranteeFeedbackService(database, walletService, { now: () => now });

      const result = await service.claimGuarantee(verifiedActor, {
        chartId: "chart-123",
        partId: "section-overview",
        rating: "inaccurate",
        comment: "Không khớp thực tế",
        idempotencyKey: "key-idem-ok",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe("approved");
        expect(result.value.amountLaRestored).toBe(240);
        expect(result.value.partId).toBe("section-overview");
        expect(result.value.sku).toBe("ZIWEI-NATAL-EXCERPT-P0");
        expect(result.value.claimNumber).toMatch(/^GC-[A-F0-9]{8}$/);
        expect(result.value.relatedPalaceSuggestion.palaceId).toBe("ziwei.palace.travel");
        expect(result.value.receipt.transactionId).toBe("tx-restore-1");
      }

      // Verify wallet restore was called
      expect(walletService.restore).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: verifiedActor,
          restoration: expect.objectContaining({
            kind: "restoration",
            originalSpendId: "spend-tier1",
            expectedWalletVersion: 5,
            reasonCode: "guarantee_la_back",
          }),
        }),
      );

      // Verify entitlement was revoked
      expect(updateEntitlementMock).toHaveBeenCalledWith(
        expect.objectContaining({
          revokedAt: now,
          revocationReason: "guarantee_claim",
        }),
      );
    });
  });
});
