import { expect, test } from "@playwright/test";

test.describe("authentication and actor boundaries", () => {
  test("creates an anonymous session and keeps the actor server-resolved", async ({
    page,
  }) => {
    await page.goto("/");
    const response = await page.request.post("/api/auth/sign-in/anonymous");

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.user?.isAnonymous).toBe(true);
    expect(body.user?.id).toBeDefined();
    expect(body.actorId).toBeUndefined();
  });

  test("rejects browser attempts to mark an email verified", async ({
    page,
  }) => {
    await page.goto("/");
    const response = await page.request.post("/api/auth/verify-email", {
      data: { userId: "browser-supplied", verified: true },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("does not expose reset tokens or internal actor secrets", async ({
    page,
  }) => {
    await page.goto("/");
    const response = await page.request.post("/api/auth/request-password-reset", {
      data: { email: "synthetic-user@example.test" },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.token).toBeUndefined();
    expect(body.internalActorSecret).toBeUndefined();
  });
});
