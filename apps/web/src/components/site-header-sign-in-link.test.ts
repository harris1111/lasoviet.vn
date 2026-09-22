import { describe, expect, it } from "vitest";
import { buildSignInCallbackUrl } from "./site-header-sign-in-link";

describe("buildSignInCallbackUrl and header return path contract", () => {
  it("preserves canonical search query params including ?tab= and open=", () => {
    expect(
      buildSignInCallbackUrl("vi", "/la-so/chart-123?tab=topics&open=career"),
    ).toBe("/dang-nhap?callbackURL=%2Fla-so%2Fchart-123%3Ftab%3Dtopics%26open%3Dcareer");

    expect(
      buildSignInCallbackUrl("en", "/en/la-so/chart-123?tab=palaces&open=wealth"),
    ).toBe("/en/dang-nhap?callbackURL=%2Fen%2Fla-so%2Fchart-123%3Ftab%3Dpalaces%26open%3Dwealth");
  });

  it("handles path-only without query params", () => {
    expect(buildSignInCallbackUrl("vi", "/la-so/chart-123")).toBe(
      "/dang-nhap?callbackURL=%2Fla-so%2Fchart-123",
    );
    expect(buildSignInCallbackUrl("en", "/en/tu-vi")).toBe(
      "/en/dang-nhap?callbackURL=%2Fen%2Ftu-vi",
    );
  });

  it("fails closed against protocol-relative or external host injection", () => {
    expect(buildSignInCallbackUrl("vi", "//evil.com/leak")).toBe("/dang-nhap");
    expect(buildSignInCallbackUrl("vi", "https://evil.com/leak")).toBe("/dang-nhap");
    expect(buildSignInCallbackUrl("vi", "   /la-so/chart-123 ")).toBe("/dang-nhap");
    expect(buildSignInCallbackUrl("vi", "/la-so/chart-123\\evil")).toBe("/dang-nhap");
    expect(buildSignInCallbackUrl("vi", undefined)).toBe("/dang-nhap");
  });
});
