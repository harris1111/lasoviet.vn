export type AuthClientAdapter = {
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

function result(response: { data?: unknown; error?: unknown }) {
  return response.error === undefined
    ? { ok: true as const, deliveryConfirmation: true as const }
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
      return result(await client.signIn.email(input));
    },
    async signInWithGoogle(callbackURL: string) {
      return result(
        await client.signIn.social({ provider: "google", callbackURL }),
      );
    },
  };
}
