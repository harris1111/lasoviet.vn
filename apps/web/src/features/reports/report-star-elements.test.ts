import { describe, expect, it } from "vitest";

import { starElement } from "./report-star-elements";

describe("starElement", () => {
  it("colours the fourteen main stars by their agreed element", () => {
    expect(starElement("ziwei.star.ziwei")).toBe("tho");
    expect(starElement("ziwei.star.tianji")).toBe("moc");
    expect(starElement("ziwei.star.taiyang")).toBe("hoa");
    expect(starElement("ziwei.star.wuqu")).toBe("kim");
    expect(starElement("ziwei.star.tiantong")).toBe("thuy");
  });

  it("places the four stars deduced from their position in the star rings", () => {
    // Tuế Kiện is Thái Tuế, Hối Khí sits in Thiếu Dương's slot, Tuế Dịch sits
    // in the Dịch Mã slot: all Hỏa. Niên Giải is the Vietnamese Giải Thần: Mộc.
    expect(starElement("ziwei.star.suijian")).toBe("hoa");
    expect(starElement("ziwei.star.huiqi")).toBe("hoa");
    expect(starElement("ziwei.star.suiyi")).toBe("hoa");
    expect(starElement("ziwei.star.nianjie")).toBe("moc");
  });

  it("returns null for an unknown star so the chart falls back to plain text", () => {
    expect(starElement("ziwei.star.does-not-exist")).toBeNull();
  });
});
