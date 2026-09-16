import type { AccountBehaviorProfileV1 } from "@lasoviet/contracts";

export const APPROVED_INTEREST_TOPIC_CODES = [
  "career",
  "money",
  "love",
  "family",
  "wellbeing",
  "self_understanding",
] as const;

export type ApprovedInterestTopicCode =
  typeof APPROVED_INTEREST_TOPIC_CODES[number];

const approvedTopicsSet = new Set<string>(APPROVED_INTEREST_TOPIC_CODES);

export function isApprovedInterestTopic(topic: string): topic is ApprovedInterestTopicCode {
  return approvedTopicsSet.has(topic);
}

export type BehaviorProfileUpdate = {
  lockedSectionsViewed?: string[];
  topupPacksViewed?: string[];
  laBalance?: number | null;
  lastReturnAt?: Date | null;
  reportReadDepthPercent?: number | null;
  interestTopics?: string[];
  lastEventAt?: Date;
};

export type ExistingBehaviorProfile = {
  userId: string;
  version: number;
  lockedSectionsViewed: unknown;
  topupPacksViewed: unknown;
  laBalance: number | null;
  lastReturnAt: Date | null;
  reportReadDepthPercent: number | null;
  interestTopics: unknown;
  lastEventAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toStringArray(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const result: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim().length > 0) {
      const trimmed = item.trim();
      if (!result.includes(trimmed)) {
        result.push(trimmed);
        if (result.length >= maxItems) break;
      }
    }
  }
  return result;
}

export function appendUniqueBounded(
  existing: string[],
  itemToAdd: string | undefined,
  maxItems: number,
): string[] {
  if (!itemToAdd || typeof itemToAdd !== "string") {
    return existing;
  }
  const trimmed = itemToAdd.trim();
  if (!trimmed || existing.includes(trimmed)) {
    return existing;
  }
  const next = [...existing, trimmed];
  if (next.length > maxItems) {
    return next.slice(next.length - maxItems);
  }
  return next;
}

export function computeBehaviorProfileUpdateFromEvent(
  current: ExistingBehaviorProfile | null,
  event: {
    name: string;
    properties: Record<string, unknown>;
    occurredAt: Date;
  },
): BehaviorProfileUpdate {
  const currentSections = toStringArray(current?.lockedSectionsViewed, 50);
  const currentPacks = toStringArray(current?.topupPacksViewed, 20);
  const currentDepth = current?.reportReadDepthPercent ?? null;

  const update: BehaviorProfileUpdate = {
    lastEventAt: event.occurredAt,
  };

  switch (event.name) {
    case "locked_preview_view": {
      const sectionId =
        typeof event.properties.section_id === "string"
          ? event.properties.section_id
          : undefined;
      update.lockedSectionsViewed = appendUniqueBounded(
        currentSections,
        sectionId,
        50,
      );
      break;
    }
    case "topup_view":
    case "pack_selected": {
      const packId =
        typeof event.properties.pack_id === "string"
          ? event.properties.pack_id
          : undefined;
      update.topupPacksViewed = appendUniqueBounded(currentPacks, packId, 20);
      break;
    }
    case "la_spent": {
      if (
        typeof event.properties.balance_after === "number" &&
        Number.isInteger(event.properties.balance_after) &&
        event.properties.balance_after >= 0
      ) {
        update.laBalance = event.properties.balance_after;
      }
      break;
    }
    case "return_visit": {
      update.lastReturnAt = event.occurredAt;
      break;
    }
    case "report_section_read": {
      if (
        typeof event.properties.read_depth_percent === "number" &&
        Number.isFinite(event.properties.read_depth_percent)
      ) {
        const depth = Math.min(
          100,
          Math.max(0, Math.round(event.properties.read_depth_percent)),
        );
        update.reportReadDepthPercent =
          currentDepth !== null ? Math.max(currentDepth, depth) : depth;
      }
      break;
    }
    default:
      break;
  }

  return update;
}

export type BehaviorProfileHistoricalEvent = {
  name: string;
  properties: Record<string, unknown>;
  occurredAt: Date;
};

export function mergeBehaviorProfileWithEvents(
  current: ExistingBehaviorProfile | null,
  events: BehaviorProfileHistoricalEvent[],
): BehaviorProfileUpdate {
  let sections = toStringArray(current?.lockedSectionsViewed, 50);
  let packs = toStringArray(current?.topupPacksViewed, 20);
  let depth = current?.reportReadDepthPercent ?? null;
  let balance = current?.laBalance ?? null;
  let returnAt = current?.lastReturnAt ?? null;
  let lastEventAt = current?.lastEventAt ?? null;

  for (const event of events) {
    if (!lastEventAt || event.occurredAt.getTime() > lastEventAt.getTime()) {
      lastEventAt = event.occurredAt;
    }

    switch (event.name) {
      case "locked_preview_view": {
        const sectionId =
          typeof event.properties.section_id === "string"
            ? event.properties.section_id
            : undefined;
        sections = appendUniqueBounded(sections, sectionId, 50);
        break;
      }
      case "topup_view":
      case "pack_selected": {
        const packId =
          typeof event.properties.pack_id === "string"
            ? event.properties.pack_id
            : undefined;
        packs = appendUniqueBounded(packs, packId, 20);
        break;
      }
      case "la_spent": {
        const bal = event.properties.balance_after;
        if (
          typeof bal === "number" &&
          Number.isInteger(bal) &&
          bal >= 0
        ) {
          if (balance === null || !current?.lastEventAt || event.occurredAt.getTime() >= current.lastEventAt.getTime()) {
            balance = bal;
          }
        }
        break;
      }
      case "return_visit": {
        if (!returnAt || event.occurredAt.getTime() > returnAt.getTime()) {
          returnAt = event.occurredAt;
        }
        break;
      }
      case "report_section_read": {
        if (
          typeof event.properties.read_depth_percent === "number" &&
          Number.isFinite(event.properties.read_depth_percent)
        ) {
          const eventDepth = Math.min(
            100,
            Math.max(0, Math.round(event.properties.read_depth_percent)),
          );
          depth = depth !== null ? Math.max(depth, eventDepth) : eventDepth;
        }
        break;
      }
      default:
        break;
    }
  }

  return {
    lockedSectionsViewed: sections,
    topupPacksViewed: packs,
    laBalance: balance,
    lastReturnAt: returnAt,
    reportReadDepthPercent: depth,
    lastEventAt: lastEventAt ?? undefined,
  };
}


export type ProfileEventForRebuild = {
  id: string;
  name: string;
  properties: Record<string, unknown>;
  occurredAt: Date;
};

export function rebuildBehaviorProfileFromEvents(
  existingProfile: ExistingBehaviorProfile | null,
  events: ProfileEventForRebuild[],
): BehaviorProfileUpdate {
  const sorted = [...events].sort((a, b) => {
    const timeDiff = a.occurredAt.getTime() - b.occurredAt.getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });

  let sections: string[] = [];
  let packs: string[] = [];
  let balance: number | null = null;
  let returnAt: Date | null = null;
  let maxDepth: number | null = null;
  let lastEventAt: Date | null = null;

  for (const event of sorted) {
    if (!lastEventAt || event.occurredAt.getTime() > lastEventAt.getTime()) {
      lastEventAt = event.occurredAt;
    }

    switch (event.name) {
      case "locked_preview_view": {
        const sectionId =
          typeof event.properties.section_id === "string"
            ? event.properties.section_id
            : undefined;
        sections = appendUniqueBounded(sections, sectionId, 50);
        break;
      }
      case "topup_view":
      case "pack_selected": {
        const packId =
          typeof event.properties.pack_id === "string"
            ? event.properties.pack_id
            : undefined;
        packs = appendUniqueBounded(packs, packId, 20);
        break;
      }
      case "la_spent": {
        const bal = event.properties.balance_after;
        if (
          typeof bal === "number" &&
          Number.isInteger(bal) &&
          bal >= 0
        ) {
          balance = bal;
        }
        break;
      }
      case "return_visit": {
        returnAt = event.occurredAt;
        break;
      }
      case "report_section_read": {
        if (
          typeof event.properties.read_depth_percent === "number" &&
          Number.isFinite(event.properties.read_depth_percent)
        ) {
          const depth = Math.min(
            100,
            Math.max(0, Math.round(event.properties.read_depth_percent)),
          );
          maxDepth = maxDepth !== null ? Math.max(maxDepth, depth) : depth;
        }
        break;
      }
      default:
        break;
    }
  }

  return {
    lockedSectionsViewed: sections,
    topupPacksViewed: packs,
    laBalance: balance,
    lastReturnAt: returnAt,
    reportReadDepthPercent: maxDepth,
    lastEventAt: lastEventAt ?? undefined,
    interestTopics: toStringArray(existingProfile?.interestTopics, 20),
  };
}

export function toAccountBehaviorProfileV1(
  record: ExistingBehaviorProfile,
): AccountBehaviorProfileV1 {
  return {
    version: 1,
    accountId: record.userId,
    lockedSectionsViewed: toStringArray(record.lockedSectionsViewed, 50),
    topupPacksViewed: toStringArray(record.topupPacksViewed, 20),
    laBalance: record.laBalance,
    lastReturnAt: record.lastReturnAt ? record.lastReturnAt.toISOString() : null,
    reportReadDepthPercent: record.reportReadDepthPercent,
    interestTopics: toStringArray(record.interestTopics, 20),
    updatedAt: record.updatedAt.toISOString(),
  };
}
