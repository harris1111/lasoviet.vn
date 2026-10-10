import { readPurchaseCommercialTerms } from "./purchase-commercial-terms.js";
import { periodKindForSku } from "../reports/period-report-config.js";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, isNotNull, isNull, inArray, or, sql } from "drizzle-orm";
import {
  GuaranteeClaimRequestV1Schema,
  GuaranteeClaimResultV1Schema,
  PartFeedbackCreateV1Schema,
  PartFeedbackResultV1Schema,
  PartFeedbackRatingSchema,
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
  deletionRequests,
  lockFreeAiCoordination,
  reportEntitlementLinks,
  partFeedbacks,
  reportReservations,
  walletAccounts,
  walletPurchaseIntents,
  walletSpendAllocations,
  walletTransactions,
  ziweiCharts,
  type Database,
} from "@lasoviet/database";

import { createDatabaseReportQueryRepository } from "../reports/report-query.repository.js";
import { createReportQueryService } from "../reports/report-query.service.js";
import { createWalletService } from "../wallet/wallet.service.js";
import { createDatabaseWalletRepository } from "../wallet/wallet.repository.js";

export function resolveRelatedPalaceSuggestion(partId: string): RelatedPalaceSuggestionV1 {
  const normalized = partId.toLowerCase().trim();

  if (
    normalized.includes("life") ||
    normalized.includes("menh") ||
    normalized.includes("overview") ||
    normalized.includes("core-axis") ||
    normalized.includes("excerpt") ||
    normalized.includes("identity-p0")
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
  reportId: string | null;
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
        reportId: input.reportId,
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
        .innerJoin(birthProfiles, and(
          eq(birthProfiles.id, ziweiCharts.profileId),
          isNull(birthProfiles.deletedAt),
          actor.kind === "account"
            ? eq(birthProfiles.userId, actor.userId)
            : and(eq(birthProfiles.anonymousActorId, actor.anonymousActorId), gt(birthProfiles.anonymousExpiresAt, getNow())),
        ))
        .where(eq(ziweiCharts.id, parsed.data.chartId))
        .limit(1);

      if (!chart) {
        return { ok: false, code: "FEEDBACK_CHART_NOT_FOUND" };
      }

      if (parsed.data.reportId) {
        if (actor.kind !== "account") return { ok: false, code: "FEEDBACK_CHART_NOT_FOUND" };
        const [report] = await database.select({ id: reportReservations.id })
          .from(reportReservations)
          .innerJoin(commerceEntitlements, and(
            eq(commerceEntitlements.id, reportReservations.entitlementId),
            eq(commerceEntitlements.ownerId, actor.userId),
            eq(commerceEntitlements.chartId, parsed.data.chartId),
          ))
          .where(eq(reportReservations.reportId, parsed.data.reportId)).limit(1);
        if (!report) return { ok: false, code: "FEEDBACK_CHART_NOT_FOUND" };
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
          rating: PartFeedbackRatingSchema.parse(inserted.rating),
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

      return database.transaction(async (transaction) => {
        // Share the publication/recovery/compensation lock prefix before financial locks.
        await lockFreeAiCoordination(transaction);
        const [deletion] = await transaction.select().from(deletionRequests)
          .where(eq(deletionRequests.userId, actor.userId)).limit(1).for("update");
        if (deletion?.status === "purged") return {ok: false, code: "GUARANTEE_ACCOUNT_INELIGIBLE"};
        // Serialize first-claim decisions per owner before touching wallet balances.
        await transaction.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`guarantee:${actor.userId}`}, 0))`);
      const [account] = await transaction
        .select({
          emailVerified: authUsers.emailVerified,
          isAnonymous: authUsers.isAnonymous,
        })
        .from(authUsers)
        .where(eq(authUsers.id, actor.userId))
        .limit(1).for("update");

      if (!account || !account.emailVerified || account.isAnonymous) {
        return { ok: false, code: "GUARANTEE_ACCOUNT_INELIGIBLE" };
      }

      const [chart] = await transaction
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

      const isPeriod = periodKindForSku(parsed.data.partId.toUpperCase()) !== null;
      if (isPeriod && !parsed.data.reportId) return {ok: false, code: "GUARANTEE_ENTITLEMENT_NOT_FOUND"};
      // The optional report association is private owner data, including on the refund path.
      if (parsed.data.reportId) {
        const [report] = await transaction.select({ id: reportReservations.id })
          .from(reportReservations)
          .innerJoin(commerceEntitlements, and(
            eq(commerceEntitlements.id, reportReservations.entitlementId),
            eq(commerceEntitlements.ownerId, actor.userId),
            eq(commerceEntitlements.chartId, parsed.data.chartId),
          ))
          .where(eq(reportReservations.reportId, parsed.data.reportId)).limit(1);
        if (!report) return { ok: false, code: "GUARANTEE_NOT_OWNER" };
      }

      // 3. Replay idempotency check
      const fingerprint = computeGuaranteeFingerprint({
        accountId: actor.userId,
        chartId: parsed.data.chartId,
        reportId: parsed.data.reportId ?? null,
        partId: parsed.data.partId,
        rating: parsed.data.rating,
        comment: parsed.data.comment ?? null,
        idempotencyKey: parsed.data.idempotencyKey,
      });

      const [existingByKey] = await transaction
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
      const [existingAccountClaim] = await transaction
        .select({ id: guaranteeClaims.id })
        .from(guaranteeClaims)
        .where(eq(guaranteeClaims.accountId, actor.userId))
        .limit(1);

      if (existingAccountClaim) {
        return { ok: false, code: "GUARANTEE_ALREADY_CLAIMED" };
      }

      // 5. Entitlement lookup (active, wallet-backed, not revoked)
      const entitlements = await transaction
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
        ).orderBy(desc(commerceEntitlements.createdAt), desc(commerceEntitlements.id));

      if (entitlements.length === 0) {
        return { ok: false, code: "GUARANTEE_ENTITLEMENT_NOT_FOUND" };
      }

      let periodEntitlementId: string | undefined;
      if (isPeriod) {
        const [reservation] = await transaction.select({entitlementId: reportReservations.entitlementId})
          .from(reportReservations).where(eq(reportReservations.reportId, parsed.data.reportId!)).limit(1);
        if (!reservation) return {ok: false, code: "GUARANTEE_ENTITLEMENT_NOT_FOUND"};
        periodEntitlementId = reservation.entitlementId;
      }

      // Find matching entitlement by partId or scope
      const normalizedPartId = parsed.data.partId.toLowerCase();
      const matched = entitlements.find((candidate) => {
        if (isPeriod && candidate.entitlement.id !== periodEntitlementId) return false;
        if (candidate.entitlement.sku.toLowerCase() === normalizedPartId) return true;
        const scope = candidate.entitlement.scope;
        if (candidate.entitlement.sku === "ZIWEI-TODAY-P0") {
          return scope.dailyDates?.some((date) => normalizedPartId === `daily:${date}`) ?? false;
        }
        if (Array.isArray(scope?.palaces) && scope.palaces.some((palace: string) => palace.toLowerCase() === normalizedPartId)) return true;
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
      const [existingReversal] = await transaction
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
      let frozenGuarantee: "full" | "half" | "none" | undefined;
      let newPolicy = false;
      if (spend.purchaseIntentId) {
        const [intent] = await transaction
          .select()
          .from(walletPurchaseIntents)
          .where(eq(walletPurchaseIntents.id, spend.purchaseIntentId))
          .limit(1);
        if (intent) {
          const terms = readPurchaseCommercialTerms(intent);
          if (!terms) return {ok: false, code: "GUARANTEE_INVALID_REQUEST"};
          priceLa = terms.chargedLa;
          frozenGuarantee = terms.guarantee;
          newPolicy = terms.policy === "fd119";
        }
      }

      if (priceLa === 0) {
        const [allocated] = await transaction
          .select({
            amountLa: sql<number>`coalesce(sum(${walletSpendAllocations.amountLa}), 0)`,
          })
          .from(walletSpendAllocations)
          .where(eq(walletSpendAllocations.spendTransactionId, spend.id));
        priceLa = Number(allocated?.amountLa ?? 0);
      }

      if (priceLa <= 0 || frozenGuarantee === "none" || (frozenGuarantee === undefined && priceLa >= 500)) {
        return { ok: false, code: "GUARANTEE_PRICE_EXCEEDS_LIMIT" };
      }

      // Wallet locks precede reservation locks, matching terminal compensation.
      const [wallet] = await transaction.select().from(walletAccounts)
        .where(eq(walletAccounts.ownerId, actor.userId)).limit(1).for("update");
      if (!wallet) return {ok: false, code: "GUARANTEE_ACCOUNT_INELIGIBLE"};

      if (frozenGuarantee === "half") {
        if (!newPolicy || priceLa % 2 !== 0) return {ok: false, code: "GUARANTEE_INVALID_REQUEST"};
        const components = entitlements.filter(item => item.spend.id === spend.id);
        if (components.length === 0) return {ok: false, code: "GUARANTEE_INVALID_REQUEST"};
        const linked = await transaction.select({reservationId: reportEntitlementLinks.reservationId,
          entitlementId: reportEntitlementLinks.entitlementId}).from(reportEntitlementLinks)
          .where(inArray(reportEntitlementLinks.entitlementId, components.map(item => item.entitlement.id)));
        const reservations = await transaction.select().from(reportReservations)
          .where(or(...components.flatMap(item => [eq(reportReservations.entitlementId, item.entitlement.id),
            ...linked.filter(link => link.entitlementId === item.entitlement.id)
              .map(link => eq(reportReservations.id, link.reservationId))])))
          .orderBy(asc(reportReservations.id)).for("update");
        if (components.some(item => !reservations.some(reservation =>
            reservation.entitlementId === item.entitlement.id || linked.some(link =>
              link.entitlementId === item.entitlement.id && link.reservationId === reservation.id)))) {
          return {ok: false, code: "GUARANTEE_INVALID_REQUEST"};
        }
        if (parsed.data.reportId && !reservations.some(reservation => reservation.reportId === parsed.data.reportId)) {
          return {ok: false, code: "GUARANTEE_NOT_OWNER"};
        }
        const query = createReportQueryService({repository: createDatabaseReportQueryRepository(transaction, getNow), now: getNow});
        for (const reservation of reservations) {
          if (!["html_ready", "pdf_pending", "complete"].includes(reservation.status)) {
            return {ok: false, code: "GUARANTEE_INVALID_REQUEST"};
          }
          try {
            const report = await query.getReport(actor, reservation.reportId);
            if (!report.ok || report.value.state !== "ready" || report.value.reportVersionId !== reservation.reportVersionId) {
              return {ok: false, code: "GUARANTEE_INVALID_REQUEST"};
            }
          } catch {
            return {ok: false, code: "GUARANTEE_INVALID_REQUEST"};
          }
        }
      }
      // Sample the eligibility clock after every potentially waiting financial/readiness lock.
      const now = getNow();
      if (now.getTime() >= spend.createdAt.getTime() + 86_400_000 || now.getTime() < spend.createdAt.getTime()) {
        return {ok: false, code: "GUARANTEE_WINDOW_EXPIRED"};
      }
      const amountLaRestored = frozenGuarantee === "half" ? priceLa / 2 : priceLa;
      const restoration = {
        kind: "restoration" as const, actorId: actor.userId, originalSpendId: spend.id,
        expectedWalletVersion: wallet.stateVersion, reasonCode: "guarantee_la_back",
        requestId: actor.requestId, traceId: actor.requestId,
        idempotencyKey: `guarantee-restore:${parsed.data.idempotencyKey}`,
      };
      const privateAuthority = {token: {}, ownerId: actor.userId, originalSpendId: spend.id,
        idempotencyKey: restoration.idempotencyKey, requestFingerprint: fingerprint};
      const repository = createDatabaseWalletRepository(transaction, {now: getNow,
        ...(newPolicy ? {trustedGuaranteeRestorationAuthority: privateAuthority} : {})});
      const restoreResult = newPolicy
        ? await repository.restore({actor, restoration, trustedGuaranteeToken: privateAuthority.token, requestFingerprint: fingerprint})
        : await createWalletService(repository).restore({actor, restoration});

      if (!restoreResult.ok) {
        if (restoreResult.error.code === "WALLET_ALREADY_RESTORED") {
          return { ok: false, code: "GUARANTEE_ALREADY_RESTORED" };
        }
        return { ok: false, code: "GUARANTEE_INVALID_REQUEST" };
      }

      // 11. Revoke entitlement
      await transaction
        .update(commerceEntitlements)
        .set({
          revokedAt: now,
          revocationReason: "guarantee_claim",
        })
        .where(and(eq(commerceEntitlements.ownerId, actor.userId), eq(commerceEntitlements.ledgerSpendId, spend.id)));

      // 12. Insert feedback
      const [feedback] = await transaction
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

      if (!feedback) throw new Error("GUARANTEE_FEEDBACK_INSERT_FAILED");

      // 14. Claim number & result payload
      const claimNumber = `GC-${randomBytes(4).toString("hex").toUpperCase()}`;
      const claimId = randomUUID();

      const claimResult: GuaranteeClaimResultV1 = {
        claimId,
        claimNumber,
        status: "approved",
        amountLaRestored,
        partId: parsed.data.partId,
        sku: entitlement.sku,
        balance: restoreResult.value.balance,
        receipt: restoreResult.value,
        relatedPalaceSuggestion,
        createdAt: now.toISOString(),
      };

      // 15. Insert guarantee claim record
      await transaction.insert(guaranteeClaims).values({
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
        amountLa: amountLaRestored,
        status: "approved",
        relatedPalaceId: relatedPalaceSuggestion.palaceId,
        idempotencyKey: parsed.data.idempotencyKey,
        fingerprint,
        resultPayload: claimResult,
        createdAt: now,
      });

      return { ok: true, value: claimResult };
      });
    },
  };
}

export type GuaranteeFeedbackService = ReturnType<typeof createGuaranteeFeedbackService>;
