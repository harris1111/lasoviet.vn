import { randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export const VISITOR_COOKIE_NAME = "visitor_id" as const;
export const VISITOR_COOKIE_MAX_AGE_SECONDS = 31_536_000 as const;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidVisitorId(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value.trim());
}

export function generateVisitorId(): string {
  return randomUUID();
}

export function getVisitorCookieOptions(
  isProduction = process.env.NODE_ENV === "production",
) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: VISITOR_COOKIE_MAX_AGE_SECONDS,
    secure: isProduction,
  };
}

export function resolveVisitorId(
  cookieValue: string | undefined | null,
): { visitorId: string; isNew: boolean } {
  if (cookieValue && isValidVisitorId(cookieValue)) {
    return {
      visitorId: cookieValue.trim().toLowerCase(),
      isNew: false,
    };
  }
  return {
    visitorId: generateVisitorId(),
    isNew: true,
  };
}

export function setVisitorCookie(
  response: { cookies: { set: (...args: any[]) => any } },
  visitorId: string,
  isProduction = process.env.NODE_ENV === "production",
): void {
  response.cookies.set(
    VISITOR_COOKIE_NAME,
    visitorId,
    getVisitorCookieOptions(isProduction),
  );
}

export function ensureVisitorCookie(
  request: NextRequest,
  response: NextResponse,
  isProduction = process.env.NODE_ENV === "production",
): { visitorId: string; rotated: boolean } {
  const current = request.cookies.get(VISITOR_COOKIE_NAME)?.value;
  if (current && isValidVisitorId(current)) {
    return { visitorId: current.trim().toLowerCase(), rotated: false };
  }
  const newId = generateVisitorId();
  setVisitorCookie(response, newId, isProduction);
  return { visitorId: newId, rotated: true };
}

export async function getOrReconcileVisitorId(): Promise<string> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const raw = cookieStore.get(VISITOR_COOKIE_NAME)?.value;
  const { visitorId, isNew } = resolveVisitorId(raw);
  if (isNew) {
    cookieStore.set(
      VISITOR_COOKIE_NAME,
      visitorId,
      getVisitorCookieOptions(),
    );
  }
  return visitorId;
}
