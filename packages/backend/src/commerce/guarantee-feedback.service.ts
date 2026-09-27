import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import {
  GuaranteeClaimRequestV1Schema,
  GuaranteeClaimResultV1Schema,
  PartFeedbackCreateV1Schema,
  PartFeedbackResultV1Schema,
  type CurrentActor,
  type GuaranteeClaimRequestV1,
  type GuaranteeClaimResultV1,
  type GuaranteeErrorCode,
  type PartFeedbackCreateV1,
  type PartFeedbackResultV1,
  type RelatedPalaceSuggestionV1,
} from "@lasoviet/contracts";
import {
  authUsers,
  birthProfiles,
  commerceEntitlements,
  guaranteeClaims,
  partFeedbacks,
  walletAccounts,
  walletPurchaseIntents,
  walletSpendAllocations,
  walletTransactions,
  ziweiCharts,
  type Database,
} from "@lasoviet/database";

import type { WalletService } from "../wallet/wallet.service.js";

export function resolveRelatedPalaceSuggestion(partId: string): RelatedPalaceSuggestionV1 {
  const normalized = partId.toLowerCase().trim();

  if (
    normalized.includes("life") ||
    normalized.includes("menh") ||
    normalized.includes("overview") ||
    normalized.includes("core-axis") ||
    normalized.includes("excerpt") ||
    normalized.includes("p0")
  ) {
    return {
      palaceId: "ziwei.palace.travel",
      palaceName: "Cung Thiên Di",
      relationType: "opposite",
      reason: "Đối cung của Cung Mệnh, phản ánh môi trường bên ngoài, cơ hội xuất hành và cách bạn tương tác với xã hội.",
    };
  }

  if (normalized.includes("wealth") || normalized.includes("tai-bach")) {
    return {
      palaceId: "ziwei.palace.fortune",
      palaceName: "Cung Phúc Đức",
      relationType: "opposite",
      reason: "Đối cung của Cung Tài Bạch, phản ánh đời sống tinh thần, tư duy thụ hưởng và cội nguồn phúc khí của dòng tài lộc.",
    };
  }

  if (normalized.includes("career") || normalized.includes("quan-loc")) {
    return {
      palaceId: "ziwei.palace.spouse",
      palaceName: "Cung Phu Thê",
      relationType: "opposite",
      reason: "Đối cung của Cung Quan Lộc, phản ánh hậu phương nâng đỡ sự nghiệp và sự đồng hành trong các quyết định lớn.",
    };
  }

  if (normalized.includes("spouse") || normalized.includes("phu-the")) {
    return {
      palaceId: "ziwei.palace.career",
      palaceName: "Cung Quan Lộc",
      relationType: "opposite",
      reason: "Đối cung của Cung Phu Thê, thể hiện sự cân bằng giữa chí hướng sự nghiệp và sự thấu hiểu tình cảm đối phương.",
    };
  }

  if (normalized.includes("children") || normalized.includes("tu-tuc")) {
    return {
      palaceId: "ziwei.palace.property",
      palaceName: "Cung Điền Trạch",
      relationType: "opposite",
      reason: "Đối cung của Cung Tử Tức, phản ánh nền tảng gia sản, nơi an cư và môi trường nuôi dưỡng thế hệ sau.",
    };
  }

  if (normalized.includes("property") || normalized.includes("dien-trach")) {
    return {
      palaceId: "ziwei.palace.children",
      palaceName: "Cung Tử Tức",
      relationType: "opposite",
      reason: "Đối cung của Cung Điền Trạch, phản ánh sự truyền thừa cơ nghiệp và mối liên hệ với thế hệ con cháu.",
    };
  }

  if (normalized.includes("health") || normalized.includes("tat-ach")) {
    return {
      palaceId: "ziwei.palace.parents",
      palaceName: "Cung Phụ Mẫu",
      relationType: "opposite",
      reason: "Đối cung của Cung Tật Ách, phản ánh yếu tố di truyền, thể chất và sự bảo bọc từ gia đình tiền bối.",
    };
  }

  if (normalized.includes("parents") || normalized.includes("phu-mau")) {
    return {
      palaceId: "ziwei.palace.health",
      palaceName: "Cung Tật Ách",
      relationType: "opposite",
      reason: "Đối cung của Cung Phụ Mẫu, thể hiện sự đối chiếu giữa sức khỏe bản thân và năng lượng thừa hưởng từ gia tộc.",
    };
  }

  if (normalized.includes("siblings") || normalized.includes("huynh-de")) {
    return {
      palaceId: "ziwei.palace.friends",
      palaceName: "Cung Nô Bộc",
      relationType: "opposite",
      reason: "Đối cung của Cung Huynh Đệ, cho thấy các mối quan hệ xã hội mở rộng, đối tác và mạng lưới quan hệ.",
    };
  }

  if (normalized.includes("friends") || normalized.includes("no-boc")) {
    return {
      palaceId: "ziwei.palace.siblings",
      palaceName: "Cung Huynh Đệ",
      relationType: "opposite",
      reason: "Đối cung của Cung Nô Bộc, nhắc bạn đối chiếu tình cảm gia đình với các mối quan hệ bạn bè ngoài xã hội.",
    };
  }

  if (normalized.includes("travel") || normalized.includes("thien-di")) {
    return {
      palaceId: "ziwei.palace.life",
      palaceName: "Cung Mệnh",
      relationType: "opposite",
      reason: "Đối cung của Cung Thiên Di, nhắc bạn quay về cốt lõi nội lực và bản lĩnh cá nhân khi hoạt động ngoại vi.",
    };
  }

  if (normalized.includes("fortune") || normalized.includes("phuc-duc")) {
    return {
      palaceId: "ziwei.palace.wealth",
      palaceName: "Cung Tài Bạch",
      relationType: "opposite",
      reason: "Đối cung của Cung Phúc Đức, cho thấy sự chuyển hóa giữa phúc đức tinh thần và năng lực tạo dựng của cải vật chất.",
    };
  }

  return {
    palaceId: "ziwei.palace.fortune",
    palaceName: "Cung Phúc Đức",
    relationType: "complementary",
    reason: "Cung Phúc Đức soi chiếu đời sống nội tâm và cội nguồn tư duy, giúp làm sáng tỏ thêm góc nhìn khi bản mệnh cần chiêm nghiệm sâu sắc hơn.",
  };
}

function computeGuaranteeFingerprint(input: {
  accountId: string;
  chartId: string;
  partId: string;
  rating: string;
  comment: string | null;
  idempotencyKey: string;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        accountId: input.accountId,
        chartId: input.chartId,
        partId: input.partId,
        rating: input.rating,
        comment: input.comment,
        idempotencyKey: input.idempotencyKey,
      }),
    )
    .digest("hex");
}

export type GuaranteeFeedbackServiceOptions = {
  now?: () => Date;
};

export function createGuaranteeFeedbackService(
  database: Database,
  walletService: WalletService,
  options: GuaranteeFeedbackServiceOptions = {},
) {
  const getNow = options.now ?? (() => new Date());

  return {
    async submitPartFeedback(
      actor: CurrentActor,
      input: PartFeedbackCreateV1,
    ): Promise<
      | { ok: true; value: PartFeedbackResultV1 }
      | { ok: false; code: "FEEDBACK_INVALID" | "FEEDBACK_CHART_NOT_FOUND" }
    > {
      const parsed = PartFeedbackCreateV1Schema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, code: "FEEDBACK_INVALID" };
      }

      const [chart] = await database
        .select({ id: ziweiCharts.id })
        .from(ziweiCharts)
        .where(eq(ziweiCharts.id, parsed.data.chartId))
        .limit(1);

      if (!chart) {
        return { ok: false, code: "FEEDBACK_CHART_NOT_FOUND" };
      }

      const userId = actor.kind === "account" ? actor.userId : null;
      const now = getNow();

      const [inserted] = await database
        .insert(partFeedbacks)
        .values({
          userId,
          chartId: parsed.data.chartId,
          reportId: parsed.data.reportId ?? null,
          partId: parsed.data.partId,
          rating: parsed.data.rating,
          comment: parsed.data.comment ?? null,
          createdAt: now,
        })
        .returning();

      if (!inserted) {
        return { ok: false, code: "FEEDBACK_INVALID" };
      }

      const relatedPalaceSuggestion =
        parsed.data.rating === "inaccurate"
          ? resolveRelatedPalaceSuggestion(parsed.data.partId)
          : null;

      const result: PartFeedbackResultV1 = {
        feedback: {
          id: inserted.id,
          chartId: inserted.chartId,
          partId: inserted.partId,
          reportId: inserted.reportId,
          rating: inserted.rating as any,
          comment: inserted.comment,
          createdAt: inserted.createdAt.toISOString(),
        },
        relatedPalaceSuggestion,
      };

      return { ok: true, value: result };
    },

    async claimGuarantee(
      actor: CurrentActor,
      input: GuaranteeClaimRequestV1,
    ): Promise<
      | { ok: true; value: GuaranteeClaimResultV1 }
      | { ok: false; code: GuaranteeErrorCode }
    > {
      // 1. Schema check
      const parsed = GuaranteeClaimRequestV1Schema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, code: "GUARANTEE_INVALID_REQUEST" };
      }

      if (parsed.data.rating !== "inaccurate") {
        return { ok: false, code: "GUARANTEE_RATING_INELIGIBLE" };
      }

      // 2. Authenticated owner only
      if (actor.kind !== "account") {
        return { ok: false, code: "GUARANTEE_ACCOUNT_REQUIRED" };
      }

      const [account] = await database
        .select({
          emailVerified: authUsers.emailVerified,
          isAnonymous: authUsers.isAnonymous,
        })
        .from(authUsers)
        .where(eq(authUsers.id, actor.userId))
        .limit(1);

      if (!account || !account.emailVerified || account.isAnonymous) {
        return { ok: false, code: "GUARANTEE_ACCOUNT_INELIGIBLE" };
      }

      const [chart] = await database
        .select({ id: ziweiCharts.id })
        .from(ziweiCharts)
        .innerJoin(
          birthProfiles,
          and(
            eq(birthProfiles.id, ziweiCharts.profileId),
            eq(birthProfiles.userId, actor.userId),
            isNull(birthProfiles.deletedAt),
          ),
        )
        .where(eq(ziweiCharts.id, parsed.data.chartId))
        .limit(1);

      if (!chart) {
        return { ok: false, code: "GUARANTEE_NOT_OWNER" };
      }

      // 3. Replay idempotency check
      const fingerprint = computeGuaranteeFingerprint({
        accountId: actor.userId,
        chartId: parsed.data.chartId,
        partId: parsed.data.partId,
        rating: parsed.data.rating,
        comment: parsed.data.comment ?? null,
        idempotencyKey: parsed.data.idempotencyKey,
      });

      const [existingByKey] = await database
        .select()
        .from(guaranteeClaims)
        .where(eq(guaranteeClaims.idempotencyKey, parsed.data.idempotencyKey))
        .limit(1);

      if (existingByKey) {
        if (existingByKey.fingerprint === fingerprint) {
          const parsedResult = GuaranteeClaimResultV1Schema.safeParse(existingByKey.resultPayload);
          if (parsedResult.success) {
            return { ok: true, value: parsedResult.data };
          }
        }
        return { ok: false, code: "GUARANTEE_IDEMPOTENCY_CONFLICT" };
      }

      // 4. First claim enforcement
      const [existingAccountClaim] = await database
        .select({ id: guaranteeClaims.id })
        .from(guaranteeClaims)
        .where(eq(guaranteeClaims.accountId, actor.userId))
        .limit(1);

      if (existingAccountClaim) {
        return { ok: false, code: "GUARANTEE_ALREADY_CLAIMED" };
      }

      // 5. Entitlement lookup (active, wallet-backed, not revoked)
      const entitlements = await database
        .select({
          entitlement: commerceEntitlements,
          spend: walletTransactions,
        })
        .from(commerceEntitlements)
        .innerJoin(
          walletTransactions,
          and(
            eq(walletTransactions.id, commerceEntitlements.ledgerSpendId),
            eq(walletTransactions.kind, "spend"),
          ),
        )
        .where(
          and(
            eq(commerceEntitlements.ownerId, actor.userId),
            eq(commerceEntitlements.chartId, parsed.data.chartId),
            isNull(commerceEntitlements.revokedAt),
            isNull(commerceEntitlements.orderId),
            isNotNull(commerceEntitlements.ledgerSpendId),
          ),
        );

      if (entitlements.length === 0) {
        return { ok: false, code: "GUARANTEE_ENTITLEMENT_NOT_FOUND" };
      }

      // Find matching entitlement by partId or scope
      const normalizedPartId = parsed.data.partId.toLowerCase();
      let matched = entitlements.find((candidate) => {
        if (candidate.entitlement.sku.toLowerCase() === normalizedPartId) return true;
        const scope = candidate.entitlement.scope;
        if (Array.isArray(scope?.sections)) {
          return scope.sections.some(
            (sec: string) =>
              sec.toLowerCase() === normalizedPartId ||
              sec.toLowerCase() === normalizedPartId.replace(/^section-/, ""),
          );
        }
        return false;
      });

      if (!matched) {
        return { ok: false, code: "GUARANTEE_ENTITLEMENT_NOT_FOUND" };
      }

      const { entitlement, spend } = matched;

      // 6. Check if already restored
      const [existingReversal] = await database
        .select({ id: walletTransactions.id })
        .from(walletTransactions)
        .where(
          and(
            eq(walletTransactions.kind, "restoration"),
            eq(walletTransactions.reversalOfTransactionId, spend.id),
          ),
        )
        .limit(1);

      if (existingReversal) {
        return { ok: false, code: "GUARANTEE_ALREADY_RESTORED" };
      }

      // 7. Get spend price in Lá and check < 500 Lá
      let priceLa = 0;
      if (spend.purchaseIntentId) {
        const [intent] = await database
          .select({ priceLa: walletPurchaseIntents.priceLa })
          .from(walletPurchaseIntents)
          .where(eq(walletPurchaseIntents.id, spend.purchaseIntentId))
          .limit(1);
        if (intent) {
          priceLa = intent.priceLa;
        }
      }

      if (priceLa === 0) {
        const [allocated] = await database
          .select({
            amountLa: sql<number>`coalesce(sum(${walletSpendAllocations.amountLa}), 0)`,
          })
          .from(walletSpendAllocations)
          .where(eq(walletSpendAllocations.spendTransactionId, spend.id));
        priceLa = Number(allocated?.amountLa ?? 0);
      }

      if (priceLa >= 500) {
        return { ok: false, code: "GUARANTEE_PRICE_EXCEEDS_LIMIT" };
      }

      // 8. 24-hour expiration window
      const now = getNow();
      const expirationTime = spend.createdAt.getTime() + 24 * 60 * 60 * 1000;
      if (now.getTime() > expirationTime) {
        return { ok: false, code: "GUARANTEE_WINDOW_EXPIRED" };
      }

      // 9. Wallet lookup
      const [wallet] = await database
        .select()
        .from(walletAccounts)
        .where(eq(walletAccounts.ownerId, actor.userId))
        .limit(1);

      if (!wallet) {
        return { ok: false, code: "GUARANTEE_ACCOUNT_INELIGIBLE" };
      }

      // 10. Execute compensating restore
      const restoreResult = await walletService.restore({
        actor,
        restoration: {
          kind: "restoration",
          actorId: actor.userId,
          originalSpendId: spend.id,
          expectedWalletVersion: wallet.stateVersion,
          reasonCode: "guarantee_la_back",
          requestId: actor.requestId,
          traceId: actor.requestId,
          idempotencyKey: `guarantee-restore:${parsed.data.idempotencyKey}`,
        },
      });

      if (!restoreResult.ok) {
        if (restoreResult.error.code === "WALLET_ALREADY_RESTORED") {
          return { ok: false, code: "GUARANTEE_ALREADY_RESTORED" };
        }
        return { ok: false, code: "GUARANTEE_INVALID_REQUEST" };
      }

      // 11. Revoke entitlement
      await database
        .update(commerceEntitlements)
        .set({
          revokedAt: now,
          revocationReason: "guarantee_claim",
        })
        .where(eq(commerceEntitlements.id, entitlement.id));

      // 12. Insert feedback
      const [feedback] = await database
        .insert(partFeedbacks)
        .values({
          userId: actor.userId,
          chartId: parsed.data.chartId,
          reportId: parsed.data.reportId ?? null,
          partId: parsed.data.partId,
          rating: "inaccurate",
          comment: parsed.data.comment ?? null,
          createdAt: now,
        })
        .returning();

      // 13. Related palace suggestion
      const relatedPalaceSuggestion = resolveRelatedPalaceSuggestion(parsed.data.partId);

      if (!feedback) {
        return { ok: false, code: "GUARANTEE_INVALID_REQUEST" };
      }

      // 14. Claim number & result payload
      const claimNumber = `GC-${randomBytes(4).toString("hex").toUpperCase()}`;
      const claimId = randomUUID();

      const claimResult: GuaranteeClaimResultV1 = {
        claimId,
        claimNumber,
        status: "approved",
        amountLaRestored: priceLa,
        partId: parsed.data.partId,
        sku: entitlement.sku,
        balance: restoreResult.value.balance,
        receipt: restoreResult.value,
        relatedPalaceSuggestion,
        createdAt: now.toISOString(),
      };

      // 15. Insert guarantee claim record
      await database.insert(guaranteeClaims).values({
        id: claimId,
        claimNumber,
        accountId: actor.userId,
        entitlementId: entitlement.id,
        spendTransactionId: spend.id,
        restorationTransactionId: restoreResult.value.transactionId,
        feedbackId: feedback.id,
        chartId: parsed.data.chartId,
        sku: entitlement.sku,
        partId: parsed.data.partId,
        amountLa: priceLa,
        status: "approved",
        relatedPalaceId: relatedPalaceSuggestion.palaceId,
        idempotencyKey: parsed.data.idempotencyKey,
        fingerprint,
        resultPayload: claimResult,
        createdAt: now,
      });

      return { ok: true, value: claimResult };
    },
  };
}

export type GuaranteeFeedbackService = ReturnType<typeof createGuaranteeFeedbackService>;
