import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { anonymous } from "better-auth/plugins/anonymous";

import { loadEnvironment } from "@lasoviet/config/load-environment";
import {
  authAccounts,
  authAnonymousActors,
  authSessions,
  authUsers,
  authVerifications,
  createDatabase,
  linkAnonymousActorToAccount,
} from "@lasoviet/database/runtime";

import { sendAuthEmail } from "./auth-email-client";

function configuration() {
  const result = loadEnvironment(process.env);
  if (!result.ok) {
    throw new Error("AUTH_CONFIG_INVALID");
  }
  const { betterAuthSecret, databaseUrl, ...environment } = result.value;
  if (
    databaseUrl === undefined ||
    betterAuthSecret === undefined
  ) {
    throw new Error("AUTH_CONFIG_INVALID");
  }
  return { ...environment, betterAuthSecret, databaseUrl };
}

function anonymousActorExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

let authDatabase: ReturnType<typeof createDatabase> | undefined;

export function getAuthDatabase() {
  authDatabase ??= createDatabase(configuration().databaseUrl);
  return authDatabase;
}

export function createAuth() {
  const config = configuration();
  const database = getAuthDatabase();

  return betterAuth({
  secret: config.betterAuthSecret,
  ...(config.betterAuthUrl ? { baseURL: config.betterAuthUrl } : {}),
  database: drizzleAdapter(database, {
    provider: "pg",
    schema: {
      user: authUsers,
      session: authSessions,
      account: authAccounts,
      verification: authVerifications,
    },
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      await sendAuthEmail("password_reset", user.email, url, token, request);
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      await sendAuthEmail(
        "email_verification",
        user.email,
        url,
        token,
        request,
      );
    },
  },
  account: {
    accountLinking: {
      trustedProviders: ["google"],
      requireLocalEmailVerified: true,
      allowDifferentEmails: false,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (user.isAnonymous !== true) {
            return;
          }
          await database
            .insert(authAnonymousActors)
            .values({ id: user.id, expiresAt: anonymousActorExpiry() })
            .onConflictDoNothing();
        },
      },
    },
  },
  ...(config.google
    ? {
        socialProviders: {
          google: {
            clientId: config.google.clientId,
            clientSecret: config.google.clientSecret,
          },
        },
      }
    : {}),
  plugins: [
    anonymous({
      disableDeleteAnonymousUser: true,
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        const result = await linkAnonymousActorToAccount(
          database,
          anonymousUser.user.id,
          newUser.user.id,
        );
        if (!result.ok) {
          throw new Error(result.error.code);
        }
      },
    }),
    nextCookies(),
  ],
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  authInstance ??= createAuth();
  return authInstance;
}
