import { describe, expect, it } from "vitest";

import { resolveAuthCallbackUrl } from "./auth-callback-resolver";

describe("resolveAuthCallbackUrl", () => {
  it("accepts same-site relative paths", () => {
    expect(resolveAuthCallbackUrl("/tao-la-so/tu-vi", "vi")).toBe("/tao-la-so/tu-vi");
  });

  it("accepts nested local paths with query and hash", () => {
    expect(
      resolveAuthCallbackUrl(
        "/la-so/chart-123/chon-luan-giai?topic=career#checkout",
        "vi",
      ),
    ).toBe("/la-so/chart-123/chon-luan-giai?topic=career#checkout");
  });

  it("normalizes path traversing segments", () => {
    expect(
      resolveAuthCallbackUrl("/nested/../tao-la-so/tu-vi?step=1#hash", "vi"),
    ).toBe("/tao-la-so/tu-vi?step=1#hash");
  });

  it("rejects absolute URLs and falls back", () => {
    expect(resolveAuthCallbackUrl("https://evil.example", "vi")).toBe(
      "/tai-khoan",
    );
    expect(resolveAuthCallbackUrl("http://evil.example/path", "en")).toBe(
      "/en/tai-khoan",
    );
  });

  it("rejects protocol-relative URLs and falls back", () => {
    expect(resolveAuthCallbackUrl("//evil.example", "vi")).toBe(
      "/tai-khoan",
    );
    expect(resolveAuthCallbackUrl("//evil.example/nested", "en")).toBe(
      "/en/tai-khoan",
    );
    expect(resolveAuthCallbackUrl("/\\evil.example", "vi")).toBe(
      "/tai-khoan",
    );
  });

  it("rejects callbacks with leading or trailing whitespace", () => {
    expect(resolveAuthCallbackUrl(" /la-so/chart-1", "vi")).toBe(
      "/tai-khoan",
    );
    expect(resolveAuthCallbackUrl("/la-so/chart-1 ", "vi")).toBe(
      "/tai-khoan",
    );
    expect(resolveAuthCallbackUrl("  /tao-la-so/tu-vi  ", "en")).toBe(
      "/en/tai-khoan",
    );
  });

  it("rejects malformed strings and non-relative schemes", () => {
    expect(resolveAuthCallbackUrl("javascript:alert(1)", "vi")).toBe(
      "/tai-khoan",
    );
    expect(resolveAuthCallbackUrl("data:text/html,bad", "vi")).toBe(
      "/tai-khoan",
    );
    expect(resolveAuthCallbackUrl("", "vi")).toBe("/tai-khoan");
  });

  it("rejects array inputs and non-string values", () => {
    expect(resolveAuthCallbackUrl(["/tao-la-so/tu-vi"], "vi")).toBe(
      "/tai-khoan",
    );
    expect(resolveAuthCallbackUrl(undefined, "vi")).toBe("/tai-khoan");
    expect(resolveAuthCallbackUrl(null, "vi")).toBe("/tai-khoan");
    expect(resolveAuthCallbackUrl(123, "en")).toBe("/en/tai-khoan");
    expect(resolveAuthCallbackUrl({}, "en")).toBe("/en/tai-khoan");
  });

  it("uses a flow-specific fallback when supplied", () => {
    expect(resolveAuthCallbackUrl(undefined, "vi", "/la-so/chart-123/chon-luan-giai")).toBe("/la-so/chart-123/chon-luan-giai");
    expect(resolveAuthCallbackUrl(undefined, "vi", "https://evil.example")).toBe("/tai-khoan");
  });

  it("uses locale-specific fallback for EN", () => {
    expect(resolveAuthCallbackUrl(undefined, "en")).toBe("/en/tai-khoan");
    expect(resolveAuthCallbackUrl("https://evil.example", "en")).toBe(
      "/en/tai-khoan",
    );
  });
});
