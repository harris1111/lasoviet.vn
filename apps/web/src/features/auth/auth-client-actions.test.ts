import { describe, expect, it, vi } from "vitest";

import { createAuthActions } from "./auth-client-actions";

describe("browser auth actions", () => {
  it("uses Better Auth email sign-up and reports delivery confirmation", async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });
    const actions = createAuthActions({
      signUp: { email: signUp },
      signIn: { email: vi.fn(), social: vi.fn() },
    });

    await expect(
      actions.signUp({
        name: "Nguyen Van A",
        email: "a@example.com",
        password: "password-with-enough-length",
        callbackURL: "/tao-la-so/tu-vi",
      }),
    ).resolves.toEqual({ ok: true, deliveryConfirmation: true });
    expect(signUp).toHaveBeenCalledWith({
      name: "Nguyen Van A",
      email: "a@example.com",
      password: "password-with-enough-length",
      callbackURL: "/tao-la-so/tu-vi",
    });
  });

  it("treats Better Auth's null error field as a successful signup", async () => {
    const actions = createAuthActions({
      signUp: {
        email: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      signIn: { email: vi.fn(), social: vi.fn() },
    });

    await expect(
      actions.signUp({
        name: "Nguyen Van A",
        email: "a@example.com",
        password: "password-with-enough-length",
        callbackURL: "/tao-la-so/tu-vi",
      }),
    ).resolves.toEqual({ ok: true, deliveryConfirmation: true });
  });

  it("uses Better Auth email sign-in and Google redirect with local callback URLs", async () => {
    const email = vi.fn().mockResolvedValue({ data: { redirect: false } });
    const social = vi.fn().mockResolvedValue({ data: { redirect: true } });
    const actions = createAuthActions({
      signUp: { email: vi.fn() },
      signIn: { email, social },
    });

    await actions.signIn({
      email: "a@example.com",
      password: "password-with-enough-length",
      callbackURL: "/tao-la-so/tu-vi",
    });
    await actions.signInWithGoogle("/tao-la-so/tu-vi");

    expect(email).toHaveBeenCalledWith({
      email: "a@example.com",
      password: "password-with-enough-length",
      callbackURL: "/tao-la-so/tu-vi",
    });
    expect(social).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/tao-la-so/tu-vi",
    });
  });
});
