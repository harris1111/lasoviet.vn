import { describe, expect, it, vi } from "vitest";

import {
  BIRTH_CACHE_STORAGE_KEY_V2,
  BIRTH_CACHE_VERSION_V2,
  CANONICAL_BRANCH_IDS,
  clearBirthCache,
  consumeHomepageBirthPrefill,
  getBranchOptionLabel,
  getBranchTwoHourRange,
  HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY,
  HOMEPAGE_BIRTH_PREFILL_VERSION,
  isValidSolarDate,
  parseAndValidateDateParts,
  readBirthCache,
  saveBirthCache,
  saveHomepageBirthPrefill,
} from "./homepage-birth-prefill";

function createMockStorage(initialData: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(initialData));
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => store.clear()),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    get length() {
      return store.size;
    },
  };
}

describe("calendar validation", () => {
  it("rejects impossible calendar dates", () => {
    expect(isValidSolarDate(2023, 2, 29)).toBe(false);
    expect(isValidSolarDate(1900, 2, 29)).toBe(false);
    expect(isValidSolarDate(2024, 2, 30)).toBe(false);
    expect(isValidSolarDate(2024, 4, 31)).toBe(false);
    expect(isValidSolarDate(2024, 6, 31)).toBe(false);
    expect(isValidSolarDate(2024, 9, 31)).toBe(false);
    expect(isValidSolarDate(2024, 11, 31)).toBe(false);
    expect(isValidSolarDate(2024, 0, 15)).toBe(false);
    expect(isValidSolarDate(2024, 13, 15)).toBe(false);
    expect(isValidSolarDate(2024, 5, 0)).toBe(false);
    expect(isValidSolarDate(2024, 5, 32)).toBe(false);
  });

  it("accepts valid solar calendar dates", () => {
    expect(isValidSolarDate(1994, 4, 12)).toBe(true);
    expect(isValidSolarDate(1990, 1, 1)).toBe(true);
    expect(isValidSolarDate(2026, 8, 31)).toBe(true);
    expect(isValidSolarDate(1985, 7, 31)).toBe(true);
  });

  it("accepts leap year dates", () => {
    expect(isValidSolarDate(2024, 2, 29)).toBe(true);
    expect(isValidSolarDate(2000, 2, 29)).toBe(true);
    expect(isValidSolarDate(1996, 2, 29)).toBe(true);
    expect(isValidSolarDate(1980, 2, 29)).toBe(true);
  });

  it("parses and validates date parts correctly", () => {
    expect(parseAndValidateDateParts("12", "04", "1994")).toEqual({
      valid: true,
      isoDate: "1994-04-12",
      day: 12,
      month: 4,
      year: 1994,
    });

    expect(parseAndValidateDateParts("29", "2", "2024")).toEqual({
      valid: true,
      isoDate: "2024-02-29",
      day: 29,
      month: 2,
      year: 2024,
    });

    expect(parseAndValidateDateParts("31", "04", "2024")).toEqual({
      valid: false,
      error: "IMPOSSIBLE_DATE",
    });

    expect(parseAndValidateDateParts("", "04", "1994")).toEqual({
      valid: false,
      error: "INVALID_DATE_FORMAT",
    });
  });
});

describe("canonical 12 branches and two-hour ranges", () => {
  it("includes all 12 canonical branch IDs in traditional order", () => {
    expect(CANONICAL_BRANCH_IDS).toEqual([
      "zi",
      "chou",
      "yin",
      "mao",
      "chen",
      "si",
      "wu",
      "wei",
      "shen",
      "you",
      "xu",
      "hai",
    ]);
  });

  it("maps each canonical branch to its accurate two-hour range", () => {
    expect(getBranchTwoHourRange("zi")).toBe("23:00 - 01:00");
    expect(getBranchTwoHourRange("chou")).toBe("01:00 - 03:00");
    expect(getBranchTwoHourRange("yin")).toBe("03:00 - 05:00");
    expect(getBranchTwoHourRange("mao")).toBe("05:00 - 07:00");
    expect(getBranchTwoHourRange("chen")).toBe("07:00 - 09:00");
    expect(getBranchTwoHourRange("si")).toBe("09:00 - 11:00");
    expect(getBranchTwoHourRange("wu")).toBe("11:00 - 13:00");
    expect(getBranchTwoHourRange("wei")).toBe("13:00 - 15:00");
    expect(getBranchTwoHourRange("shen")).toBe("15:00 - 17:00");
    expect(getBranchTwoHourRange("you")).toBe("17:00 - 19:00");
    expect(getBranchTwoHourRange("xu")).toBe("19:00 - 21:00");
    expect(getBranchTwoHourRange("hai")).toBe("21:00 - 23:00");
  });

  it("provides localized select option labels in Vietnamese and English", () => {
    expect(getBranchOptionLabel("si", "vi")).toBe("Tỵ (09:00 - 11:00)");
    expect(getBranchOptionLabel("si", "en")).toBe("Si (09:00 - 11:00)");
    expect(getBranchOptionLabel("zi", "vi")).toBe("Tý (23:00 - 01:00)");
    expect(getBranchOptionLabel("zi", "en")).toBe("Zi (23:00 - 01:00)");
  });
});

describe("homepage birth prefill storage", () => {
  it("stores a versioned prefill with branch_only", () => {
    const storage = createMockStorage();
    const saved = saveHomepageBirthPrefill(
      {
        date: "1994-04-12",
        time: { precision: "branch_only", branch: "si" },
      },
      storage,
    );

    expect(saved).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY,
      expect.stringContaining('"version":1'),
    );
  });

  it("stores a versioned prefill with unknown time", () => {
    const storage = createMockStorage();
    const saved = saveHomepageBirthPrefill(
      {
        date: "1994-04-12",
        time: { precision: "unknown" },
      },
      storage,
    );

    expect(saved).toBe(true);
    const consumed = consumeHomepageBirthPrefill(storage);
    expect(consumed).toEqual({
      version: HOMEPAGE_BIRTH_PREFILL_VERSION,
      date: "1994-04-12",
      time: { precision: "unknown" },
      createdAt: expect.any(Number),
    });
  });

  it("enforces consume-once removal", () => {
    const storage = createMockStorage();
    saveHomepageBirthPrefill(
      {
        date: "1994-04-12",
        time: { precision: "branch_only", branch: "si" },
      },
      storage,
    );

    const firstRead = consumeHomepageBirthPrefill(storage);
    expect(firstRead).toEqual({
      version: 1,
      date: "1994-04-12",
      time: { precision: "branch_only", branch: "si" },
      createdAt: expect.any(Number),
    });
    expect(storage.removeItem).toHaveBeenCalledWith(
      HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY,
    );

    const secondRead = consumeHomepageBirthPrefill(storage);
    expect(secondRead).toBeNull();
  });

  it("removes invalid data and returns null on malformed JSON", () => {
    const storage = createMockStorage({
      [HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY]: "{not-valid-json",
    });

    const consumed = consumeHomepageBirthPrefill(storage);
    expect(consumed).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(
      HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY,
    );
  });

  it("removes invalid data and returns null on version mismatch", () => {
    const storage = createMockStorage({
      [HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY]: JSON.stringify({
        version: 99,
        date: "1994-04-12",
        time: { precision: "branch_only", branch: "si" },
        createdAt: Date.now(),
      }),
    });

    const consumed = consumeHomepageBirthPrefill(storage);
    expect(consumed).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(
      HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY,
    );
  });

  it("removes invalid data and returns null on impossible stored date", () => {
    const storage = createMockStorage({
      [HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY]: JSON.stringify({
        version: 1,
        date: "2023-02-29",
        time: { precision: "branch_only", branch: "si" },
        createdAt: Date.now(),
      }),
    });

    const consumed = consumeHomepageBirthPrefill(storage);
    expect(consumed).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(
      HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY,
    );
  });

  it("removes invalid data and returns null when stored date has corrupt trailing characters or non-exact format", () => {
    const storage = createMockStorage({
      [HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY]: JSON.stringify({
        version: 1,
        date: "2024-02-29junk",
        time: { precision: "branch_only", branch: "si" },
        createdAt: Date.now(),
      }),
    });

    const consumed = consumeHomepageBirthPrefill(storage);
    expect(consumed).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(
      HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY,
    );
  });

  it("removes invalid data and returns null on invalid branch id", () => {
    const storage = createMockStorage({
      [HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY]: JSON.stringify({
        version: 1,
        date: "1994-04-12",
        time: { precision: "branch_only", branch: "not-a-branch" },
        createdAt: Date.now(),
      }),
    });

    const consumed = consumeHomepageBirthPrefill(storage);
    expect(consumed).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(
      HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY,
    );
  });

  it("removes stale storage older than 24 hours and returns null", () => {
    const over24HoursAgo = Date.now() - (24 * 60 * 60 * 1000 + 1000);
    const storage = createMockStorage({
      [HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY]: JSON.stringify({
        version: 1,
        date: "1994-04-12",
        time: { precision: "branch_only", branch: "si" },
        createdAt: over24HoursAgo,
      }),
    });

    const consumed = consumeHomepageBirthPrefill(storage);
    expect(consumed).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(
      HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY,
    );
  });

  it("gracefully returns false on storage write failure without throwing", () => {
    const failingStorage: Storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new Error("QuotaExceededError");
      }),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(() => null),
      length: 0,
    };

    const result = saveHomepageBirthPrefill(
      {
        date: "1994-04-12",
        time: { precision: "branch_only", branch: "si" },
      },
      failingStorage,
    );
    expect(result).toBe(false);
  });
});

describe("V2 reusable 24-hour birth cache", () => {
  const fixedNow = 1788864000000; // Deterministic frozen test timestamp

  it("stores and reads a versioned V2 payload with exact_minute time in localStorage", () => {
    const local = createMockStorage();
    const saved = saveBirthCache(
      {
        date: "1994-04-12",
        time: { precision: "exact_minute", hour: "9", minute: "5" },
        gender: "female",
        place: "  Hà Nội  ",
      },
      { localStorage: local, now: fixedNow },
    );

    expect(saved).toBe(true);
    expect(local.setItem).toHaveBeenCalledWith(
      BIRTH_CACHE_STORAGE_KEY_V2,
      expect.stringContaining('"version":2'),
    );

    const read = readBirthCache({ localStorage: local, now: fixedNow + 3600000 });
    expect(read).toEqual({
      version: BIRTH_CACHE_VERSION_V2,
      date: "1994-04-12",
      time: { precision: "exact_minute", hour: "09", minute: "05" },
      gender: "female",
      place: "Hà Nội",
      createdAt: fixedNow,
    });
  });

  it("reading V2 cache is non-destructive", () => {
    const local = createMockStorage();
    saveBirthCache(
      {
        date: "1994-04-12",
        time: { precision: "branch_only", branch: "si" },
      },
      { localStorage: local, now: fixedNow },
    );

    const firstRead = readBirthCache({ localStorage: local, now: fixedNow });
    expect(firstRead).not.toBeNull();
    expect(local.removeItem).not.toHaveBeenCalledWith(BIRTH_CACHE_STORAGE_KEY_V2);

    const secondRead = readBirthCache({ localStorage: local, now: fixedNow });
    expect(secondRead).not.toBeNull();
  });

  it("prefers valid richer V2 data when legacy V1 is also present", () => {
    const local = createMockStorage({
      [BIRTH_CACHE_STORAGE_KEY_V2]: JSON.stringify({
        version: 2,
        date: "1994-04-12",
        time: { precision: "exact_minute", hour: "09", minute: "05" },
        gender: "female",
        place: "Hà Nội",
        createdAt: fixedNow,
      }),
    });
    const session = createMockStorage({
      [HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY]: JSON.stringify({
        version: 1,
        date: "1994-04-12",
        time: { precision: "unknown" },
        createdAt: fixedNow,
      }),
    });

    const result = readBirthCache({
      localStorage: local,
      sessionStorage: session,
      now: fixedNow,
    });

    expect(result).toEqual({
      version: 2,
      date: "1994-04-12",
      time: { precision: "exact_minute", hour: "09", minute: "05" },
      gender: "female",
      place: "Hà Nội",
      createdAt: fixedNow,
    });
    expect(local.removeItem).not.toHaveBeenCalledWith(BIRTH_CACHE_STORAGE_KEY_V2);
    expect(session.removeItem).not.toHaveBeenCalledWith(
      HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY,
    );
  });

  it("migrates a valid legacy V1 payload from sessionStorage to V2 in localStorage and removes V1", () => {
    const session = createMockStorage({
      [HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY]: JSON.stringify({
        version: 1,
        date: "1994-04-12",
        time: { precision: "branch_only", branch: "si" },
        createdAt: fixedNow - 10000,
      }),
    });
    const local = createMockStorage();

    const migrated = readBirthCache({
      sessionStorage: session,
      localStorage: local,
      now: fixedNow,
    });

    expect(migrated).toEqual({
      version: 2,
      date: "1994-04-12",
      time: { precision: "branch_only", branch: "si" },
      createdAt: fixedNow - 10000,
    });

    // V1 removed from sessionStorage
    expect(session.removeItem).toHaveBeenCalledWith(
      HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY,
    );
    // V2 stored in localStorage
    expect(local.setItem).toHaveBeenCalledWith(
      BIRTH_CACHE_STORAGE_KEY_V2,
      expect.stringContaining('"version":2'),
    );
  });

  it("removes V2 cache and returns null when expired (older than 24h)", () => {
    const over24HoursAgo = fixedNow - (24 * 60 * 60 * 1000 + 1000);
    const local = createMockStorage({
      [BIRTH_CACHE_STORAGE_KEY_V2]: JSON.stringify({
        version: 2,
        date: "1994-04-12",
        time: { precision: "branch_only", branch: "si" },
        createdAt: over24HoursAgo,
      }),
    });

    const result = readBirthCache({ localStorage: local, now: fixedNow });
    expect(result).toBeNull();
    expect(local.removeItem).toHaveBeenCalledWith(BIRTH_CACHE_STORAGE_KEY_V2);
  });

  it("removes V2 cache and returns null when malformed JSON or corrupted fields", () => {
    const localMalformed = createMockStorage({
      [BIRTH_CACHE_STORAGE_KEY_V2]: "not-valid-json",
    });
    expect(readBirthCache({ localStorage: localMalformed, now: fixedNow })).toBeNull();
    expect(localMalformed.removeItem).toHaveBeenCalledWith(BIRTH_CACHE_STORAGE_KEY_V2);

    const localCorruptTime = createMockStorage({
      [BIRTH_CACHE_STORAGE_KEY_V2]: JSON.stringify({
        version: 2,
        date: "1994-04-12",
        time: { precision: "exact_minute", hour: "25", minute: "00" },
        createdAt: fixedNow,
      }),
    });
    expect(readBirthCache({ localStorage: localCorruptTime, now: fixedNow })).toBeNull();
    expect(localCorruptTime.removeItem).toHaveBeenCalledWith(BIRTH_CACHE_STORAGE_KEY_V2);
  });

  it("clears both V1 and V2 caches on manual clear", () => {
    const local = createMockStorage({
      [BIRTH_CACHE_STORAGE_KEY_V2]: "some-v2",
    });
    const session = createMockStorage({
      [HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY]: "some-v1",
    });

    clearBirthCache({ localStorage: local, sessionStorage: session });

    expect(local.removeItem).toHaveBeenCalledWith(BIRTH_CACHE_STORAGE_KEY_V2);
    expect(session.removeItem).toHaveBeenCalledWith(HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY);
  });
});
