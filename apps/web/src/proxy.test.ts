import { vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("next-intl/middleware", () => ({
  default: () => () => NextResponse.next(),
}));
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import proxy from "./proxy";
import {
  isValidVisitorId,
  VISITOR_COOKIE_NAME,
} from "./analytics/visitor-cookie";

describe("proxy middleware visitor cookie coverage (acceptance 4)", () => {
  it("sets visitor_id cookie on public page response when cookie is absent", () => {
    const request = new NextRequest("http://localhost:3000/vi");
    const response = proxy(request);

    const cookie = response.cookies.get(VISITOR_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(isValidVisitorId(cookie?.value)).toBe(true);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.path).toBe("/");
    expect(cookie?.maxAge).toBe(31_536_000);

    // Ensure locale cookie is still preserved
    expect(response.cookies.get("NEXT_LOCALE")?.value).toBe("vi");
  });

  it("repairs and rotates visitor_id cookie when cookie is invalid", () => {
    const request = new NextRequest("http://localhost:3000/vi", {
      headers: { cookie: `${VISITOR_COOKIE_NAME}=invalid-garbage-id` },
    });
    const response = proxy(request);

    const cookie = response.cookies.get(VISITOR_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(cookie?.value).not.toBe("invalid-garbage-id");
    expect(isValidVisitorId(cookie?.value)).toBe(true);
  });

  it("preserves valid visitor_id cookie without rotating it", () => {
    const validUuid = randomUUID();
    const request = new NextRequest("http://localhost:3000/vi", {
      headers: { cookie: `${VISITOR_COOKIE_NAME}=${validUuid}` },
    });
    const response = proxy(request);

    // If valid, ensureVisitorCookie does not set a new rotated cookie
    const setCookie = response.cookies.get(VISITOR_COOKIE_NAME)?.value;
    expect(setCookie === undefined || setCookie === validUuid).toBe(true);
  });

  it("sets/repairs visitor_id cookie on canonical origin redirects while preserving 301 status and location", () => {
    const request = new NextRequest("https://lasoviet.vn/vi", {
      headers: { host: "lasoviet.vn" },
    });
    const response = proxy(request);

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://lasoviet.net/vi");
    const cookie = response.cookies.get(VISITOR_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(isValidVisitorId(cookie?.value)).toBe(true);
  });

  it("sets/repairs visitor_id cookie on legacy alias redirects while preserving 301 status and target path", () => {
    const request = new NextRequest("http://localhost:3000/la-so-tu-vi");
    const response = proxy(request);

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toContain("/tu-vi");
    const cookie = response.cookies.get(VISITOR_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(isValidVisitorId(cookie?.value)).toBe(true);
  });

  it("sets/repairs visitor_id cookie on explicit Vietnamese paths and preserves NEXT_LOCALE", () => {
    const request = new NextRequest("http://localhost:3000/tu-vi");
    const response = proxy(request);

    expect(response.cookies.get("NEXT_LOCALE")?.value).toBe("vi");
    const cookie = response.cookies.get(VISITOR_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(isValidVisitorId(cookie?.value)).toBe(true);
  });
});
