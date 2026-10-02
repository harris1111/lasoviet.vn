import { describe, expect, it } from "vitest";

import { buildWalletSignInHref } from "./wallet-unlock-dialog";

describe("buildWalletSignInHref", () => {
  it("preserves only the local pathname, query, and hash", () => {
    expect(
      buildWalletSignInHref(
        "vi",
        "https://lasoviet.net/la-so/chart-1/chon-luan-giai?offer=one#checkout",
        "chart-1",
      ),
    ).toBe(
      "/dang-nhap?callbackURL=%2Fla-so%2Fchart-1%2Fchon-luan-giai%3Foffer%3Done%23checkout&fallbackURL=%2Fla-so%2Fchart-1%2Fchon-luan-giai",
    );
  });

  it("localizes the sign-in and fallback paths", () => {
    expect(
      buildWalletSignInHref("en", "https://lasoviet.net/en/la-so/chart-1", "chart-1"),
    ).toBe(
      "/en/dang-nhap?callbackURL=%2Fen%2Fla-so%2Fchart-1&fallbackURL=%2Fen%2Fla-so%2Fchart-1%2Fchon-luan-giai",
    );
  });
});
