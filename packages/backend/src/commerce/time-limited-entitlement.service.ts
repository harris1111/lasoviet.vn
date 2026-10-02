import { randomUUID } from "node:crypto";

import {
  calculateBonusExpiry,
  DAILY_READING_CATALOG_BLOCKER_MESSAGE,
  evaluateDailyReadingAccess,
  isTimeLimitedEntitlementActive,
  type DailyReadingAccessEvaluationV1,
  type TimeLimitedEntitlementV1,
} from "@lasoviet/contracts";

export type CreateLifetimeBonusEntitlementInput = {
  ownerId: string;
  chartId: string;
  grantedAt?: Date | string;
  id?: string;
};

export type AssertDailyReadingAccessResult =
  | {
      ok: true;
      evaluation: DailyReadingAccessEvaluationV1;
    }
  | {
      ok: false;
      error: {
        code:
          | "ENTITLEMENT_NOT_FOUND"
          | "ENTITLEMENT_EXPIRED"
          | "ENTITLEMENT_NOT_YET_VALID"
          | "CATALOG_SKU_BLOCKED";
        message: string;
        blockerMessage?: string;
      };
    };

export class TimeLimitedEntitlementService {
  constructor(private readonly clock: () => Date = () => new Date()) {}

  /**
   * Generates a 7-day bonus entitlement for "Hôm nay của bạn",
   * granted upon acquiring "Tử Vi trọn đời".
   * Day 1 through Day 7 are active; day 8 is expired.
   */
  public createLifetimeBonusEntitlement(
    input: CreateLifetimeBonusEntitlementInput,
  ): TimeLimitedEntitlementV1 {
    const grantedAtDate =
      input.grantedAt === undefined
        ? this.clock()
        : typeof input.grantedAt === "string"
          ? new Date(input.grantedAt)
          : input.grantedAt;

    const grantedAtIso = grantedAtDate.toISOString();
    const expiresAtIso = calculateBonusExpiry(grantedAtDate, 7).toISOString();

    return {
      id: input.id ?? randomUUID(),
      ownerId: input.ownerId,
      chartId: input.chartId,
      scope: "daily_reading",
      grantedAt: grantedAtIso,
      validFrom: grantedAtIso,
      expiresAt: expiresAtIso,
      source: "lifetime_reading_bonus",
    };
  }

  /**
   * Evaluates access to personal daily reading against the current or injected time.
   */
  public evaluateAccess(
    entitlement?: TimeLimitedEntitlementV1 | null,
    now?: Date | string | number,
  ): DailyReadingAccessEvaluationV1 {
    const effectiveNow = now ?? this.clock();
    return evaluateDailyReadingAccess({
      entitlement,
      now: effectiveNow,
    });
  }

  /**
   * Checks whether a specific entitlement is active at current time.
   */
  public isActive(
    entitlement: TimeLimitedEntitlementV1,
    now?: Date | string | number,
  ): boolean {
    const effectiveNow = now ?? this.clock();
    return isTimeLimitedEntitlementActive(entitlement, effectiveNow);
  }

  /**
   * Precise adapter and blocker guard.
   * Prevents unauthorized access or fake SKU activations when catalog is unlinked.
   */
  public assertAccess(
    entitlement?: TimeLimitedEntitlementV1 | null,
    now?: Date | string | number,
  ): AssertDailyReadingAccessResult {
    const evaluation = this.evaluateAccess(entitlement, now);

    if (evaluation.hasAccess) {
      return { ok: true, evaluation };
    }

    if (evaluation.status === "catalog_blocked") {
      return {
        ok: false,
        error: {
          code: "CATALOG_SKU_BLOCKED",
          message:
            "Cannot activate uncatalogued daily reading SKU directly without Catalog Package 1.3",
          blockerMessage:
            evaluation.blockerMessage ?? DAILY_READING_CATALOG_BLOCKER_MESSAGE,
        },
      };
    }

    if (evaluation.status === "expired") {
      return {
        ok: false,
        error: {
          code: "ENTITLEMENT_EXPIRED",
          message: "The 7-day bonus daily reading entitlement has expired",
        },
      };
    }

    return {
      ok: false,
      error: {
        code: "ENTITLEMENT_NOT_YET_VALID",
        message: "The daily reading entitlement is not yet valid",
      },
    };
  }
}
