import { describe, expect, it } from "vitest";
import {
  computeBehaviorProfileUpdateFromEvent,
  mergeBehaviorProfileWithEvents,
  rebuildBehaviorProfileFromEvents,
  toAccountBehaviorProfileV1,
  type ExistingBehaviorProfile,
} from "./account-behavior-profile.js";

describe("account-behavior-profile", () => {
  it("computes updates for locked_preview_view deduplicating and capping at 50", () => {
    const existing: ExistingBehaviorProfile = {
      userId: "usr_123",
      version: 1,
      lockedSectionsViewed: ["section_1", "section_2"],
      topupPacksViewed: [],
      laBalance: null,
      lastReturnAt: null,
      reportReadDepthPercent: null,
      interestTopics: [],
      lastEventAt: null,
      createdAt: new Date("2026-09-14T00:00:00Z"),
      updatedAt: new Date("2026-09-14T00:00:00Z"),
    };

    const update1 = computeBehaviorProfileUpdateFromEvent(existing, {
      name: "locked_preview_view",
      properties: { section_id: "section_2" },
      occurredAt: new Date("2026-09-14T01:00:00Z"),
    });
    expect(update1.lockedSectionsViewed).toEqual(["section_1", "section_2"]);

    const update2 = computeBehaviorProfileUpdateFromEvent(existing, {
      name: "locked_preview_view",
      properties: { section_id: "section_3" },
      occurredAt: new Date("2026-09-14T01:00:00Z"),
    });
    expect(update2.lockedSectionsViewed).toEqual(["section_1", "section_2", "section_3"]);
  });

  it("computes updates for topup_view and pack_selected", () => {
    const existing: ExistingBehaviorProfile = {
      userId: "usr_123",
      version: 1,
      lockedSectionsViewed: [],
      topupPacksViewed: ["pack_small"],
      laBalance: null,
      lastReturnAt: null,
      reportReadDepthPercent: null,
      interestTopics: [],
      lastEventAt: null,
      createdAt: new Date("2026-09-14T00:00:00Z"),
      updatedAt: new Date("2026-09-14T00:00:00Z"),
    };

    const update = computeBehaviorProfileUpdateFromEvent(existing, {
      name: "pack_selected",
      properties: { pack_id: "pack_medium" },
      occurredAt: new Date("2026-09-14T01:00:00Z"),
    });
    expect(update.topupPacksViewed).toEqual(["pack_small", "pack_medium"]);
  });

  it("updates la balance on la_spent", () => {
    const update = computeBehaviorProfileUpdateFromEvent(null, {
      name: "la_spent",
      properties: { balance_after: 50, amount: 10, sku: "TEST" },
      occurredAt: new Date("2026-09-14T01:00:00Z"),
    });
    expect(update.laBalance).toBe(50);
  });

  it("tracks max depth for report_section_read", () => {
    const existing: ExistingBehaviorProfile = {
      userId: "usr_123",
      version: 1,
      lockedSectionsViewed: [],
      topupPacksViewed: [],
      laBalance: 100,
      lastReturnAt: null,
      reportReadDepthPercent: 40,
      interestTopics: [],
      lastEventAt: null,
      createdAt: new Date("2026-09-14T00:00:00Z"),
      updatedAt: new Date("2026-09-14T00:00:00Z"),
    };

    const lowerUpdate = computeBehaviorProfileUpdateFromEvent(existing, {
      name: "report_section_read",
      properties: { read_depth_percent: 25 },
      occurredAt: new Date("2026-09-14T01:00:00Z"),
    });
    expect(lowerUpdate.reportReadDepthPercent).toBe(40);

    const higherUpdate = computeBehaviorProfileUpdateFromEvent(existing, {
      name: "report_section_read",
      properties: { read_depth_percent: 75 },
      occurredAt: new Date("2026-09-14T01:00:00Z"),
    });
    expect(higherUpdate.reportReadDepthPercent).toBe(75);
  });

  it("converts to AccountBehaviorProfileV1 safely", () => {
    const record: ExistingBehaviorProfile = {
      userId: "usr_123",
      version: 1,
      lockedSectionsViewed: ["sec_a"],
      topupPacksViewed: ["pack_1"],
      laBalance: 200,
      lastReturnAt: new Date("2026-09-14T05:00:00Z"),
      reportReadDepthPercent: 80,
      interestTopics: ["career", "health"],
      lastEventAt: new Date("2026-09-14T05:00:00Z"),
      createdAt: new Date("2026-09-14T00:00:00Z"),
      updatedAt: new Date("2026-09-14T05:00:00Z"),
    };

    const v1 = toAccountBehaviorProfileV1(record);
    expect(v1.accountId).toBe("usr_123");
    expect(v1.laBalance).toBe(200);
    expect(v1.reportReadDepthPercent).toBe(80);
    expect(v1.interestTopics).toEqual(["career", "health"]);
  });

  it("merges chronological visitor events into empty and existing behavior profiles", () => {
    const events = [
      {
        name: "locked_preview_view",
        properties: { section_id: "sec_1" },
        occurredAt: new Date("2026-09-14T01:00:00Z"),
      },
      {
        name: "topup_view",
        properties: { pack_id: "pack_a" },
        occurredAt: new Date("2026-09-14T01:05:00Z"),
      },
      {
        name: "report_section_read",
        properties: { read_depth_percent: 55 },
        occurredAt: new Date("2026-09-14T01:10:00Z"),
      },
      {
        name: "return_visit",
        properties: { days_since_last_visit: 3, return_count: 2 },
        occurredAt: new Date("2026-09-14T01:15:00Z"),
      },
      {
        name: "la_spent",
        properties: { balance_after: 35, amount: 15, sku: "TEST" },
        occurredAt: new Date("2026-09-14T01:20:00Z"),
      },
    ];

    const mergedFromNull = mergeBehaviorProfileWithEvents(null, events);
    expect(mergedFromNull.lockedSectionsViewed).toEqual(["sec_1"]);
    expect(mergedFromNull.topupPacksViewed).toEqual(["pack_a"]);
    expect(mergedFromNull.reportReadDepthPercent).toBe(55);
    expect(mergedFromNull.lastReturnAt?.toISOString()).toBe("2026-09-14T01:15:00.000Z");
    expect(mergedFromNull.laBalance).toBe(35);

    const existing: ExistingBehaviorProfile = {
      userId: "usr_existing",
      version: 1,
      lockedSectionsViewed: ["sec_prior"],
      topupPacksViewed: ["pack_prior"],
      laBalance: null,
      lastReturnAt: null,
      reportReadDepthPercent: 40,
      interestTopics: ["career"],
      lastEventAt: null,
      createdAt: new Date("2026-09-14T00:00:00Z"),
      updatedAt: new Date("2026-09-14T00:00:00Z"),
    };

    const mergedExisting = mergeBehaviorProfileWithEvents(existing, events);
    expect(mergedExisting.lockedSectionsViewed).toEqual(["sec_prior", "sec_1"]);
    expect(mergedExisting.topupPacksViewed).toEqual(["pack_prior", "pack_a"]);
    expect(mergedExisting.reportReadDepthPercent).toBe(55);
    expect(mergedExisting.laBalance).toBe(35);
  });

  it("rebuilds behavior profile deterministically from stream of events respecting ties and order", () => {
    const t1 = new Date("2026-09-14T01:00:00Z");
    const t2 = new Date("2026-09-14T02:00:00Z");
    const t3 = new Date("2026-09-14T03:00:00Z");
    const t4 = new Date("2026-09-14T04:00:00Z");

    const events = [
      // Out of order input to test sorting by occurredAt ASC, then id ASC
      {
        id: "evt_d",
        name: "landing",
        properties: { landing_page: "/home" },
        occurredAt: t4,
      },
      {
        id: "evt_b",
        name: "la_spent",
        properties: { balance_after: 50, amount: 10, sku: "P1" },
        occurredAt: t2,
      },
      {
        id: "evt_c",
        name: "report_section_read",
        properties: { read_depth_percent: 85 },
        occurredAt: t3,
      },
      {
        id: "evt_a",
        name: "locked_preview_view",
        properties: { section_id: "sec_first" },
        occurredAt: t1,
      },
    ];

    const rebuilt = rebuildBehaviorProfileFromEvents(null, events);
    expect(rebuilt.lockedSectionsViewed).toEqual(["sec_first"]);
    // laBalance should be 50 even though evt_c and evt_d are later unrelated events
    expect(rebuilt.laBalance).toBe(50);
    expect(rebuilt.reportReadDepthPercent).toBe(85);
    expect(rebuilt.lastEventAt?.toISOString()).toBe(t4.toISOString());
  });

  it("handles same-timestamp tie-breaking by id ASC for la_spent", () => {
    const sameTime = new Date("2026-09-14T02:00:00Z");
    const events = [
      {
        id: "evt_2",
        name: "la_spent",
        properties: { balance_after: 25, amount: 25, sku: "P2" },
        occurredAt: sameTime,
      },
      {
        id: "evt_1",
        name: "la_spent",
        properties: { balance_after: 50, amount: 50, sku: "P1" },
        occurredAt: sameTime,
      },
    ];

    // evt_1 has id "evt_1", evt_2 has id "evt_2".
    // Sorted by id ASC: evt_1 comes first, evt_2 comes second.
    // Latest balance is evt_2 -> 25.
    const rebuilt = rebuildBehaviorProfileFromEvents(null, events);
    expect(rebuilt.laBalance).toBe(25);
  });

  it("enforces 50/20 caps and preserves interestTopics", () => {
    const now = new Date("2026-09-14T01:00:00Z");
    const sectionsEvents = Array.from({ length: 60 }, (_, i) => ({
      id: `sec_evt_${String(i).padStart(3, "0")}`,
      name: "locked_preview_view",
      properties: { section_id: `sec_${i}` },
      occurredAt: new Date(now.getTime() + i * 1000),
    }));

    const packEvents = Array.from({ length: 25 }, (_, i) => ({
      id: `pack_evt_${String(i).padStart(3, "0")}`,
      name: "topup_view",
      properties: { pack_id: `pack_${i}` },
      occurredAt: new Date(now.getTime() + 100000 + i * 1000),
    }));

    const existing: ExistingBehaviorProfile = {
      userId: "usr_caps",
      version: 1,
      lockedSectionsViewed: [],
      topupPacksViewed: [],
      laBalance: null,
      lastReturnAt: null,
      reportReadDepthPercent: null,
      interestTopics: ["career", "money"],
      lastEventAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const rebuilt = rebuildBehaviorProfileFromEvents(existing, [
      ...sectionsEvents,
      ...packEvents,
    ]);

    expect(rebuilt.lockedSectionsViewed).toHaveLength(50);
    // Oldest 10 sections dropped, newest 50 kept
    expect(rebuilt.lockedSectionsViewed?.[0]).toBe("sec_10");
    expect(rebuilt.lockedSectionsViewed?.[49]).toBe("sec_59");

    expect(rebuilt.topupPacksViewed).toHaveLength(20);
    expect(rebuilt.topupPacksViewed?.[0]).toBe("pack_5");
    expect(rebuilt.topupPacksViewed?.[19]).toBe("pack_24");

    expect(rebuilt.interestTopics).toEqual(["career", "money"]);
  });

  it("does not regress lastEventAt or overwrite newer balance when delayed old event is added", () => {
    const tEarly = new Date("2026-09-14T01:00:00Z");
    const tLate = new Date("2026-09-14T05:00:00Z");

    const eventsBefore = [
      {
        id: "evt_late",
        name: "la_spent",
        properties: { balance_after: 10, amount: 40, sku: "LATE" },
        occurredAt: tLate,
      },
    ];

    const delayedOldEvent = {
      id: "evt_early",
      name: "la_spent",
      properties: { balance_after: 50, amount: 10, sku: "EARLY" },
      occurredAt: tEarly,
    };

    const rebuilt = rebuildBehaviorProfileFromEvents(null, [
      ...eventsBefore,
      delayedOldEvent,
    ]);

    // Balance must be 10 (from tLate), NOT 50 (from delayed tEarly)
    expect(rebuilt.laBalance).toBe(10);
    // lastEventAt must be tLate, NOT tEarly
    expect(rebuilt.lastEventAt?.toISOString()).toBe(tLate.toISOString());
  });
});
