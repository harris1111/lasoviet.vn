import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("auth server configuration", () => {
  it("enables autoSignInAfterVerification in emailVerification config", async () => {
    process.env.BETTER_AUTH_SECRET = "12345678901234567890123456789012";
    process.env.DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:5432/test";
    process.env.SEPAY_ENV = "disabled";

    const { createAuth } = await import("../../auth/auth");
    const auth = createAuth();
    expect(auth.options.emailVerification?.autoSignInAfterVerification).toBe(true);
  });
});
