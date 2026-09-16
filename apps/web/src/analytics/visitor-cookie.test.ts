import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { NextRequest, NextResponse } from "next/server";

import {
  ensureVisitorCookie,
  generateVisitorId,
  getVisitorCookieOptions,
  isValidVisitorId,
  resolveVisitorId,
  VISITOR_COOKIE_NAME,
} from "./visitor-cookie";

describe("visitor cookie utilities (acceptance 4)", () => {
  it("validates UUIDs correctly and rejects invalid or malformed identifiers", () => {
    const validUuid = randomUUID();
    expect(isValidVisitorId(validUuid)).toBe(true);
    expect(isValidVisitorId("not-a-uuid")).toBe(false);
    expect(isValidVisitorId("")).toBe(false);
    expect(isValidVisitorId(null)).toBe(false);
    expect(isValidVisitorId(12345)).toBe(false);
    expect(isValidVisitorId("123e4567-e89b-12d3-a456-42661417400")).toBe(false); // too short
  });

  it("generates valid UUIDs", () => {
    const id = generateVisitorId();
    expect(isValidVisitorId(id)).toBe(true);
  });

  it("sets production secure attribute strictly based on environment", () => {
    const prodOptions = getVisitorCookieOptions(true);
    expect(prodOptions).toEqual({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 31_536_000,
      secure: true,
    });

    const devOptions = getVisitorCookieOptions(false);
    expect(devOptions.secure).toBe(false);
  });

  it("resolves valid cookie without minting a new one", () => {
    const validUuid = randomUUID();
    const resolved = resolveVisitorId(validUuid);
    expect(resolved.isNew).toBe(false);
    expect(resolved.visitorId).toBe(validUuid.toLowerCase());
  });

  it("mints a new UUID when cookie is absent or invalid", () => {
    const absent = resolveVisitorId(undefined);
    expect(absent.isNew).toBe(true);
    expect(isValidVisitorId(absent.visitorId)).toBe(true);

    const invalid = resolveVisitorId("corrupt-cookie-value");
    expect(invalid.isNew).toBe(true);
    expect(isValidVisitorId(invalid.visitorId)).toBe(true);
  });

  it("ensureVisitorCookie sets cookie on absent request and preserves valid cookie", () => {
    const absentReq = new NextRequest("http://localhost:3000/vi");
    const absentRes = NextResponse.next();
    const absentResult = ensureVisitorCookie(absentReq, absentRes);
    expect(absentResult.rotated).toBe(true);
    expect(absentRes.cookies.get(VISITOR_COOKIE_NAME)?.value).toBe(
      absentResult.visitorId,
    );

    const validUuid = randomUUID();
    const validReq = new NextRequest("http://localhost:3000/vi", {
      headers: { cookie: `${VISITOR_COOKIE_NAME}=${validUuid}` },
    });
    const validRes = NextResponse.next();
    const validResult = ensureVisitorCookie(validReq, validRes);
    expect(validResult.rotated).toBe(false);
    expect(validResult.visitorId).toBe(validUuid);
  });
});
