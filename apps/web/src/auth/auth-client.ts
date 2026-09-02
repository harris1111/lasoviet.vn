"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient(
  process.env.NEXT_PUBLIC_AUTH_URL === undefined
    ? {}
    : { baseURL: process.env.NEXT_PUBLIC_AUTH_URL },
);
