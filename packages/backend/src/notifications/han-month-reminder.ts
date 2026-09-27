import type {
  NormalizedBirthProfileV1,
  ZiweiHoroscopeResultV1,
} from "@lasoviet/contracts";

export type HoroscopeCalculator = (
  birthProfile: NormalizedBirthProfileV1,
  options?: {
    chartId?: string;
    chartVersionId?: string;
    asOfDate?: string;
    targetYear?: number;
    isUnlocked?: boolean;
  },
) => ZiweiHoroscopeResultV1;

export type ComputedHanMonth = {
  monthIndex: number;
  primaryFocus: string;
  prepText: string;
  marker: "warn";
  palaceId?: string;
  palaceName?: string;
};

/**
 * Computes warn-marked monthly han periods strictly from engine calculations.
 * Does NOT invent birth or chart data. If no month is marked "warn" by the engine,
 * an empty list is returned.
 */
export function computeEngineHanMonths(
  birthProfile: NormalizedBirthProfileV1,
  targetYear: number,
  calculateHoroscope: HoroscopeCalculator,
  asOfDate?: string,
): ComputedHanMonth[] {
  const result = calculateHoroscope(birthProfile, {
    targetYear,
    asOfDate,
    isUnlocked: true,
  });

  const warnMonths: ComputedHanMonth[] = [];
  for (const m of result.yearly.months) {
    if (m.marker === "warn") {
      warnMonths.push({
        monthIndex: m.monthIndex,
        primaryFocus: m.primaryFocus ?? "công việc",
        prepText: m.preparationText ?? "Cần chú ý cẩn trọng trong các quyết định tháng này.",
        marker: "warn",
        palaceId: m.palaceId,
        palaceName: m.palaceName,
      });
    }
  }

  return warnMonths;
}

export type BlockedHanMonthReminderResult = {
  status: "blocked";
  reason: "INFRASTRUCTURE_UNSUPPORTED";
  blockers: readonly string[];
};

export interface HanMonthReminderScheduler {
  scheduleDueReminders(now?: Date): Promise<BlockedHanMonthReminderResult>;
}

export const HAN_MONTH_REMINDER_BLOCKERS = [
  "CRON_OR_LUNAR_SCHEDULER_MISSING: Master worker cycle only polls at 15-minute maintenance and 5-second queue intervals; no recurring lunar calendar monthly scheduler exists.",
  "VAN_HAN_2026_ENTITLEMENT_MISSING: FD-105 Track 2 Wave 2.2 Vận hạn 2026 and Tháng này SKUs and writers are not yet implemented on master.",
  "REMINDER_DISPATCH_AUDIT_LOG_MISSING: No database schema exists to record which lunar months have already dispatched alerts per user to prevent duplicate spam.",
] as const;

/**
 * Precise blocked adapter for engine-computed han-month reminders.
 * Retains engine calculation foundation while explicitly blocking automated
 * delivery until lunar cron scheduling, Van Han 2026 entitlement scope, and
 * reminder audit history are merged.
 */
export function createBlockedHanMonthReminderAdapter(): HanMonthReminderScheduler {
  return {
    async scheduleDueReminders(): Promise<BlockedHanMonthReminderResult> {
      return {
        status: "blocked",
        reason: "INFRASTRUCTURE_UNSUPPORTED",
        blockers: HAN_MONTH_REMINDER_BLOCKERS,
      };
    },
  };
}
