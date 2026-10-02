import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { resolveLegacyAliasRedirect } from "./legacy-alias";

describe("resolveLegacyAliasRedirect", () => {
  it("redirects a known Vietnamese alias to its canonical path", () => {
    const response = resolveLegacyAliasRedirect(new NextRequest("http://localhost:3000/la-so-tu-vi"));
    expect(response?.status).toBe(301);
    expect(new URL(response!.headers.get("location")!).pathname).toBe("/tu-vi");
  });

  it("redirects /troi-nam to the root homepage", () => {
    const response = resolveLegacyAliasRedirect(new NextRequest("http://localhost:3000/troi-nam"));
    expect(response?.status).toBe(301);
    expect(new URL(response!.headers.get("location")!).pathname).toBe("/");
  });

  it("redirects /en/troi-nam to /en without a trailing slash", () => {
    const response = resolveLegacyAliasRedirect(new NextRequest("http://localhost:3000/en/troi-nam"));
    expect(response?.status).toBe(301);
    expect(new URL(response!.headers.get("location")!).pathname).toBe("/en");
  });

  it("returns null for an unknown path", () => {
    expect(resolveLegacyAliasRedirect(new NextRequest("http://localhost:3000/khong-ton-tai"))).toBeNull();
  });
});
