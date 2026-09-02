"use server";

import { headers as requestHeaders } from "next/headers";
import { redirect } from "next/navigation";

import { privateApiClient } from "../../api/private-api-client";
import { getAuth } from "../../auth/auth";
import { resolveCurrentActor } from "../../auth/resolve-current-actor";
import {
  createAnonymousDataDeletion,
  type AnonymousDeletionResult,
} from "./delete-anonymous-data";

export async function deleteAnonymousDataAction(
  locale: "en" | "vi",
): Promise<AnonymousDeletionResult> {
  const safeLocale = locale === "en" ? "en" : "vi";
  const headers = await requestHeaders();
  const result = await createAnonymousDataDeletion({
    resolveCurrentActor,
    privateApiClient,
    signOut: async () => {
      await getAuth().api.signOut({ headers });
    },
  })();

  if (!result.ok) {
    return result;
  }
  redirect(safeLocale === "en" ? "/en" : "/");
}
