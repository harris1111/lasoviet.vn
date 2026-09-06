import { describe, expect, it, vi } from "vitest";

import { createAuthActions } from "./auth-client-actions";

describe("browser auth actions", () => {
  it("uses Better Auth email sign-up without treating generic success as delivery confirmation", async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });
    const actions = createAuthActions({
      signUp: { email: signUp },
      signIn: { email: vi.fn(), social: vi.fn() },
      sendVerificationEmail: vi.fn(),
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
    });

    await expect(
      actions.signUp({
        name: "Nguyen Van A",
        email: "a@example.com",
        password: "password-with-enough-length",
        callbackURL: "/tao-la-so/tu-vi",
      }),
    ).resolves.toEqual({ ok: true });
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
      sendVerificationEmail: vi.fn(),
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
    });

    await expect(
      actions.signUp({
        name: "Nguyen Van A",
        email: "a@example.com",
        password: "password-with-enough-length",
        callbackURL: "/tao-la-so/tu-vi",
      }),
    ).resolves.toEqual({ ok: true });
  });

  it("uses Better Auth email sign-in and Google redirect with local callback URLs", async () => {
    const email = vi.fn().mockResolvedValue({ data: { redirect: false } });
    const social = vi.fn().mockResolvedValue({ data: { redirect: true } });
    const actions = createAuthActions({
      signUp: { email: vi.fn() },
      signIn: { email, social },
      sendVerificationEmail: vi.fn(),
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
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

  it("uses Better Auth's verification endpoint without exposing account existence", async () => {
    const sendVerificationEmail = vi.fn().mockResolvedValue({
      data: { status: true },
      error: null,
    });
    const actions = createAuthActions({
      signUp: { email: vi.fn() },
      signIn: { email: vi.fn(), social: vi.fn() },
      sendVerificationEmail,
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
    });

    await expect(
      actions.resendVerification({
        email: "a@example.com",
        callbackURL: "/tao-la-so/tu-vi",
      }),
    ).resolves.toEqual({ ok: true });

    expect(sendVerificationEmail).toHaveBeenCalledWith({
      email: "a@example.com",
      callbackURL: "/tao-la-so/tu-vi",
      fetchOptions: { credentials: "omit" },
    });
  });

  it("returns a generic error when Better Auth rejects a resend request", async () => {
    const actions = createAuthActions({
      signUp: { email: vi.fn() },
      signIn: { email: vi.fn(), social: vi.fn() },
      sendVerificationEmail: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "UNEXPECTED_ERROR" },
      }),
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
    });

    await expect(
      actions.resendVerification({
        email: "a@example.com",
        callbackURL: "/tao-la-so/tu-vi",
      }),
    ).resolves.toEqual({ ok: false });
  });

  it("maps invalid email credentials without identifying the incorrect field", async () => {
    const actions = createAuthActions({
      signUp: { email: vi.fn() },
      signIn: {
        email: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "INVALID_EMAIL_OR_PASSWORD" },
        }),
        social: vi.fn(),
      },
      sendVerificationEmail: vi.fn(),
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
    });

    await expect(
      actions.signIn({
        email: "a@example.com",
        password: "password-with-enough-length",
        callbackURL: "/tao-la-so/tu-vi",
      }),
    ).resolves.toEqual({ ok: false, reason: "invalidCredentials" });
  });

  it("maps an unverified email sign-in to the verification recovery flow", async () => {
    const actions = createAuthActions({
      signUp: { email: vi.fn() },
      signIn: {
        email: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "EMAIL_NOT_VERIFIED" },
        }),
        social: vi.fn(),
      },
      sendVerificationEmail: vi.fn(),
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
    });

    await expect(
      actions.signIn({
        email: "a@example.com",
        password: "password-with-enough-length",
        callbackURL: "/tao-la-so/tu-vi",
      }),
    ).resolves.toEqual({ ok: false, reason: "verificationRequired" });
  });

  it("requests a password reset without revealing whether the account exists", async () => {
    const requestPasswordReset = vi.fn().mockResolvedValue({
      data: { status: true },
      error: null,
    });
    const actions = createAuthActions({
      signUp: { email: vi.fn() },
      signIn: { email: vi.fn(), social: vi.fn() },
      sendVerificationEmail: vi.fn(),
      requestPasswordReset,
      resetPassword: vi.fn(),
    });

    await expect(
      actions.requestPasswordReset({
        email: "a@example.com",
        redirectTo: "https://lasoviet.vn/dat-lai-mat-khau",
      }),
    ).resolves.toEqual({ ok: true });
    expect(requestPasswordReset).toHaveBeenCalledWith({
      email: "a@example.com",
      redirectTo: "https://lasoviet.vn/dat-lai-mat-khau",
    });
  });

  it("submits a new password with Better Auth's reset token", async () => {
    const resetPassword = vi.fn().mockResolvedValue({
      data: { status: true },
      error: null,
    });
    const actions = createAuthActions({
      signUp: { email: vi.fn() },
      signIn: { email: vi.fn(), social: vi.fn() },
      sendVerificationEmail: vi.fn(),
      requestPasswordReset: vi.fn(),
      resetPassword,
    });

    await expect(
      actions.resetPassword({
        newPassword: "new-password-with-enough-length",
        token: "reset-token",
      }),
    ).resolves.toEqual({ ok: true });
    expect(resetPassword).toHaveBeenCalledWith({
      newPassword: "new-password-with-enough-length",
      token: "reset-token",
    });
  });
});
