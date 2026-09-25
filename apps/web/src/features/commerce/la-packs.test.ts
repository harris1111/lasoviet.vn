import { describe, expect, it } from "vitest";

import {
  LA_TOP_UP_PACKS,
  MEMBERSHIP_TIERS,
  findSmallestCoveringPack,
} from "./la-packs";

describe("LA_TOP_UP_PACKS (FD-066)", () => {
  it("defines the exact 4 approved packs with factual bonus calculations", () => {
    expect(LA_TOP_UP_PACKS).toHaveLength(4);

    const entry = LA_TOP_UP_PACKS[0]!;
    const start = LA_TOP_UP_PACKS[1]!;
    const discover = LA_TOP_UP_PACKS[2]!;
    const library = LA_TOP_UP_PACKS[3]!;

    expect(entry.id).toBe("LA-ENTRY-300");
    expect(entry.vndAmount).toBe(29000);
    expect(entry.totalLa).toBe(300);
    expect(entry.bonusLa).toBe(0);

    expect(start.id).toBe("LA-START-1100");
    expect(start.vndAmount).toBe(99000);
    expect(start.totalLa).toBe(1100);
    expect(start.baseLa).toBe(1000);
    expect(start.bonusLa).toBe(100);

    expect(discover.id).toBe("LA-DISCOVER-3000");
    expect(discover.vndAmount).toBe(249000);
    expect(discover.totalLa).toBe(3000);
    expect(discover.baseLa).toBe(2500);
    expect(discover.bonusLa).toBe(500);
    expect(discover.badge?.vi).toBe("Gợi ý");

    expect(library.id).toBe("LA-LIBRARY-8000");
    expect(library.vndAmount).toBe(599000);
    expect(library.totalLa).toBe(8000);
    expect(library.baseLa).toBe(6000);
    expect(library.bonusLa).toBe(2000);
    expect(library.badge?.vi).toBe("Nhiều Lá tặng nhất");
  });

  it("finds the smallest covering pack deterministically (FD-066)", () => {
    // 240 Lá (Bản mệnh) -> covered by LA-ENTRY-300 (300 Lá, 29k)
    expect(findSmallestCoveringPack(240).id).toBe("LA-ENTRY-300");

    // 720 Lá (in-window upgrade) -> covered by LA-START-1100 (1,100 Lá, 99k)
    expect(findSmallestCoveringPack(720).id).toBe("LA-START-1100");

    // 960 Lá (Toàn diện) -> covered by LA-START-1100 (1,100 Lá, 99k)
    expect(findSmallestCoveringPack(960).id).toBe("LA-START-1100");

    // 1500 Lá (Hội viên tháng) -> covered by LA-DISCOVER-3000 (3,000 Lá, 249k)
    expect(findSmallestCoveringPack(1500).id).toBe("LA-DISCOVER-3000");

    // 8000 Lá (Hội viên năm) -> covered by LA-LIBRARY-8000 (8,000 Lá, 599k)
    expect(findSmallestCoveringPack(8000).id).toBe("LA-LIBRARY-8000");
  });

  it("defines membership tiers per FD-093 marked coming soon", () => {
    expect(MEMBERSHIP_TIERS).toHaveLength(2);
    const monthly = MEMBERSHIP_TIERS[0]!;
    const yearly = MEMBERSHIP_TIERS[1]!;

    expect(monthly.priceLa).toBe(1500);
    expect(monthly.durationDays).toBe(30);
    expect(monthly.comingSoon).toBe(true);

    expect(yearly.priceLa).toBe(8000);
    expect(yearly.durationDays).toBe(365);
    expect(yearly.comingSoon).toBe(true);
  });
});
