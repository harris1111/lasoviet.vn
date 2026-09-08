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
      "/tao-la-so/tu-vi",
    );
    expect(resolveAuthCallbackUrl("http://evil.example/path", "en")).toBe(
      "/en/tao-la-so/tu-vi",
    );
  });

  it("rejects protocol-relative URLs and falls back", () => {
    expect(resolveAuthCallbackUrl("//evil.example", "vi")).toBe(
      "/tao-la-so/tu-vi",
    );
    expect(resolveAuthCallbackUrl("//evil.example/nested", "en")).toBe(
      "/en/tao-la-so/tu-vi",
    );
    expect(resolveAuthCallbackUrl("/\\evil.example", "vi")).toBe(
      "/tao-la-so/tu-vi",
    );
  });

  it("rejects callbacks with leading or trailing whitespace", () => {
    expect(resolveAuthCallbackUrl(" /la-so/chart-1", "vi")).toBe(
      "/tao-la-so/tu-vi",
    );
    expect(resolveAuthCallbackUrl("/la-so/chart-1 ", "vi")).toBe(
      "/tao-la-so/tu-vi",
    );
    expect(resolveAuthCallbackUrl("  /tao-la-so/tu-vi  ", "en")).toBe(
      "/en/tao-la-so/tu-vi",
    );
  });

  it("rejects malformed strings and non-relative schemes", () => {
    expect(resolveAuthCallbackUrl("javascript:alert(1)", "vi")).toBe(
      "/tao-la-so/tu-vi",
    );
    expect(resolveAuthCallbackUrl("data:text/html,bad", "vi")).toBe(
      "/tao-la-so/tu-vi",
    );
    expect(resolveAuthCallbackUrl("", "vi")).toBe("/tao-la-so/tu-vi");
  });

  it("rejects array inputs and non-string values", () => {
    expect(resolveAuthCallbackUrl(["/tao-la-so/tu-vi"], "vi")).toBe(
      "/tao-la-so/tu-vi",
    );
    expect(resolveAuthCallbackUrl(undefined, "vi")).toBe("/tao-la-so/tu-vi");
    expect(resolveAuthCallbackUrl(null, "vi")).toBe("/tao-la-so/tu-vi");
    expect(resolveAuthCallbackUrl(123, "en")).toBe("/en/tao-la-so/tu-vi");
    expect(resolveAuthCallbackUrl({}, "en")).toBe("/en/tao-la-so/tu-vi");
  });

  it("uses locale-specific fallback for EN", () => {
    expect(resolveAuthCallbackUrl(undefined, "en")).toBe("/en/tao-la-so/tu-vi");
    expect(resolveAuthCallbackUrl("https://evil.example", "en")).toBe(
      "/en/tao-la-so/tu-vi",
    );
  });
});
