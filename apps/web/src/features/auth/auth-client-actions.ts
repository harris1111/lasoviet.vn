export type AuthClientAdapter = {
  sendVerificationEmail(input: {
    email: string;
    callbackURL: string;
    fetchOptions?: {
      credentials?: RequestCredentials;
    };
  }): Promise<{ data?: unknown; error?: unknown }>;
  requestPasswordReset(input: {
    email: string;
    redirectTo: string;
  }): Promise<{ data?: unknown; error?: unknown }>;
  resetPassword(input: {
    newPassword: string;
    token: string;
  }): Promise<{ data?: unknown; error?: unknown }>;
  signUp: {
    email(input: {
      name: string;
      email: string;
      password: string;
      callbackURL: string;
    }): Promise<{ data?: unknown; error?: unknown }>;
  };
  signIn: {
    email(input: {
      email: string;
      password: string;
      callbackURL: string;
    }): Promise<{ data?: unknown; error?: unknown }>;
    social(input: {
      provider: "google";
      callbackURL: string;
    }): Promise<{ data?: unknown; error?: unknown }>;
  };
};

type AuthError = {
  code?: unknown;
};

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const { code } = error as AuthError;
  return typeof code === "string" ? code : undefined;
}

function result(response: { data?: unknown; error?: unknown }) {
  return response.error == null
    ? { ok: true as const }
    : { ok: false as const };
}

export function createAuthActions(client: AuthClientAdapter) {
  return {
    async signUp(input: {
      name: string;
      email: string;
      password: string;
      callbackURL: string;
    }) {
      return result(await client.signUp.email(input));
    },
    async signIn(input: {
      email: string;
      password: string;
      callbackURL: string;
    }) {
      const response = await client.signIn.email(input);
      if (response.error == null) {
        return { ok: true as const };
      }
      const code = errorCode(response.error);
      if (code === "INVALID_EMAIL_OR_PASSWORD") {
        return { ok: false as const, reason: "invalidCredentials" as const };
      }
      if (code === "EMAIL_NOT_VERIFIED") {
        return { ok: false as const, reason: "verificationRequired" as const };
      }
      return { ok: false as const, reason: "generic" as const };
    },
    async signInWithGoogle(callbackURL: string) {
      return result(
        await client.signIn.social({ provider: "google", callbackURL }),
      );
    },
    async resendVerification(input: {
      email: string;
      callbackURL: string;
    }) {
      return result(
        await client.sendVerificationEmail({
          ...input,
          fetchOptions: { credentials: "omit" },
        }),
      );
    },
    async requestPasswordReset(input: {
      email: string;
      redirectTo: string;
    }) {
      return result(await client.requestPasswordReset(input));
    },
    async resetPassword(input: {
      newPassword: string;
      token: string;
    }) {
      const response = await client.resetPassword(input);
      if (response.error == null) {
        return { ok: true as const };
      }
      return errorCode(response.error) === "INVALID_TOKEN"
        ? { ok: false as const, reason: "invalidToken" as const }
        : { ok: false as const, reason: "generic" as const };
    },
  };
}
