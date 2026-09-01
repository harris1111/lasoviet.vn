import { describe, expect, it } from "vitest";
import {
  HealthV1Schema,
  InternalActorV1Schema,
  createVersionedContractSchema,
} from "./index.js";

describe("versioned runtime contracts", () => {
  it("accepts the requested version and rejects other versions or keys", () => {
    expect(createVersionedContractSchema(1).parse({ version: 1 })).toEqual({
      version: 1,
    });
    expect(() =>
      createVersionedContractSchema(1).parse({ version: 2 }),
    ).toThrow();
    expect(() =>
      createVersionedContractSchema(1).parse({ version: 1, extra: true }),
    ).toThrow();
  });

  it("accepts a complete account actor", () => {
    expect(
      InternalActorV1Schema.parse({
        version: 1,
        kind: "account",
        sub: "user_1",
        sid: "session_1",
        aud: "lasoviet-api",
        exp: 1,
        requestId: "req_1",
      }),
    ).toEqual({
      version: 1,
      kind: "account",
      sub: "user_1",
      sid: "session_1",
      aud: "lasoviet-api",
      exp: 1,
      requestId: "req_1",
    });
  });

  it("accepts an anonymous actor with an offset-bearing expiry timestamp", () => {
    expect(
      InternalActorV1Schema.parse({
        version: 1,
        kind: "anonymous",
        sub: "anonymous_1",
        sid: "session_1",
        aud: "lasoviet-api",
        exp: 1,
        requestId: "req_1",
        expiresAt: "2026-09-01T12:00:00+07:00",
      }),
    ).toMatchObject({ kind: "anonymous", expiresAt: "2026-09-01T12:00:00+07:00" });
  });

  it("trims non-empty actor identifiers", () => {
    expect(
      InternalActorV1Schema.parse({
        version: 1,
        kind: "account",
        sub: " user_1 ",
        sid: " session_1 ",
        aud: "lasoviet-api",
        exp: 1,
        requestId: " req_1 ",
      }),
    ).toMatchObject({ sub: "user_1", sid: "session_1", requestId: "req_1" });
  });

  it.each([
    ["missing kind", { version: 1, sub: "u", sid: "s", aud: "lasoviet-api", exp: 1, requestId: "r" }],
    ["wrong version", { version: 2, kind: "account", sub: "u", sid: "s", aud: "lasoviet-api", exp: 1, requestId: "r" }],
    ["wrong audience", { version: 1, kind: "account", sub: "u", sid: "s", aud: "other", exp: 1, requestId: "r" }],
    ["non-positive expiry", { version: 1, kind: "account", sub: "u", sid: "s", aud: "lasoviet-api", exp: 0, requestId: "r" }],
    ["non-integer expiry", { version: 1, kind: "account", sub: "u", sid: "s", aud: "lasoviet-api", exp: 1.5, requestId: "r" }],
    ["account expiry timestamp", { version: 1, kind: "account", sub: "u", sid: "s", aud: "lasoviet-api", exp: 1, requestId: "r", expiresAt: "2026-09-01T12:00:00+07:00" }],
    ["unknown key", { version: 1, kind: "account", sub: "u", sid: "s", aud: "lasoviet-api", exp: 1, requestId: "r", extra: true }],
  ])("rejects %s", (_name, value) => {
    expect(() => InternalActorV1Schema.parse(value)).toThrow();
  });
});

describe("health runtime contract", () => {
  it("accepts ok, degraded, and unready status invariants", () => {
    expect(
      HealthV1Schema.parse({
        version: 1,
        status: "ok",
        required: [{ name: "database", status: "ready" }],
        degraded: [],
        checkedAt: "2026-09-01T12:00:00+07:00",
      }),
    ).toMatchObject({ status: "ok" });
    expect(
      HealthV1Schema.parse({
        version: 1,
        status: "degraded",
        required: [{ name: "database", status: "ready" }],
        degraded: [{ name: "ai", status: "degraded" }],
        checkedAt: "2026-09-01T12:00:00+07:00",
      }),
    ).toMatchObject({ status: "degraded" });
    expect(
      HealthV1Schema.parse({
        version: 1,
        status: "unready",
        required: [{ name: "database", status: "unready" }],
        degraded: [],
        checkedAt: "2026-09-01T12:00:00+07:00",
      }),
    ).toMatchObject({ status: "unready" });
  });

  it.each([
    ["wrong version", { version: 2 }],
    ["unknown key", { version: 1, status: "ok", required: [], degraded: [], checkedAt: "2026-09-01T12:00:00+07:00", extra: true }],
    ["degraded required dependency", { version: 1, status: "ok", required: [{ name: "database", status: "degraded" }], degraded: [], checkedAt: "2026-09-01T12:00:00+07:00" }],
    ["unready dependency under ok", { version: 1, status: "ok", required: [{ name: "database", status: "unready" }], degraded: [], checkedAt: "2026-09-01T12:00:00+07:00" }],
    ["degraded without dependency", { version: 1, status: "degraded", required: [{ name: "database", status: "ready" }], degraded: [], checkedAt: "2026-09-01T12:00:00+07:00" }],
  ])("rejects %s", (_name, value) => {
    expect(() => HealthV1Schema.parse(value)).toThrow();
  });
});
