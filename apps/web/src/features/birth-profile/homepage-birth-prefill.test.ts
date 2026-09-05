import { describe, expect, it, vi } from "vitest";

import {
  CANONICAL_BRANCH_IDS,
  consumeHomepageBirthPrefill,
  getBranchOptionLabel,
  getBranchTwoHourRange,
  HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY,
  HOMEPAGE_BIRTH_PREFILL_VERSION,
  isValidSolarDate,
  parseAndValidateDateParts,
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
