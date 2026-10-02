import { describe, expect, it } from "vitest";

import { buildFreeToolLoginHref } from "./free-tool-login-link";

describe("buildFreeToolLoginHref", () => {
  it.each([
    ["tarot", "/boi-bai"],
    ["zodiac", "/12-con-giap"],
    ["dreamSymbols", "/giai-ma-giac-mo"],
    ["fengShui", "/phong-thuy/huong-nha"],
  ] as const)("keeps the Vietnamese %s callback", (route, path) => {
    expect(buildFreeToolLoginHref("vi", route)).toBe(
      `/dang-nhap?callbackURL=${encodeURIComponent(path)}`,
    );
  });

  it.each([
    ["tarot", "/en/boi-bai"],
    ["zodiac", "/en/12-con-giap"],
    ["dreamSymbols", "/en/giai-ma-giac-mo"],
    ["fengShui", "/en/phong-thuy/huong-nha"],
  ] as const)("keeps the English %s callback", (route, path) => {
    expect(buildFreeToolLoginHref("en", route)).toBe(
      `/en/dang-nhap?callbackURL=${encodeURIComponent(path)}`,
    );
  });
});
