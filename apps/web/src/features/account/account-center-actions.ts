"use server";

import { headers as requestHeaders } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult = {
  ok: boolean;
  error?: string;
};

export async function deleteProfile(profileId: string): Promise<ActionResult> {
  try {
    const [{ privateApiClient }, { resolveVerifiedAccountActor }] = await Promise.all([
      import("../../api/private-api-client"),
      import("../../auth/resolve-current-actor"),
    ]);

    const actor = await resolveVerifiedAccountActor();
    const result = await privateApiClient(actor, actor.requestId).request<unknown>(
      `/birth-profiles/${encodeURIComponent(profileId)}`,
      {
        method: "DELETE",
      },
    );

    if (
      !result ||
      typeof result !== "object" ||
      !("ok" in result) ||
      (result as { ok: unknown }).ok !== true
    ) {
      const code =
        result &&
        typeof result === "object" &&
        "error" in result &&
        result.error &&
        typeof result.error === "object" &&
        "code" in result.error
          ? String((result.error as { code: unknown }).code)
          : "DELETE_FAILED";
      return { ok: false, error: code };
    }

    revalidatePath("/[locale]/tai-khoan/ho-so-sinh", "page");
    revalidatePath("/[locale]/tai-khoan", "page");
    return { ok: true };
  } catch {
    return { ok: false, error: "DELETE_FAILED" };
  }
}

export async function requestAccountDeletionAction(
  locale: "en" | "vi",
): Promise<ActionResult> {
  const safeLocale = locale === "en" ? "en" : "vi";
  const headers = await requestHeaders();

  let actor;
  try {
    const { resolveVerifiedAccountActor } = await import(
      "../../auth/resolve-current-actor"
    );
    actor = await resolveVerifiedAccountActor();
  } catch {
    return { ok: false, error: "DELETION_FAILED" };
  }

  let result: { ok?: boolean; error?: { code?: string } };
  try {
    const { privateApiClient } = await import("../../api/private-api-client");
    result = await privateApiClient(actor, actor.requestId).request<{
      ok?: boolean;
      error?: { code?: string };
    }>("/privacy/account/deletion", {
      method: "POST",
    });
  } catch {
    return { ok: false, error: "DELETION_FAILED" };
  }

  if (!result || result.ok !== true) {
    return { ok: false, error: "DELETION_FAILED" };
  }

  try {
    const { getAuth } = await import("../../auth/auth");
    await getAuth().api.signOut({ headers });
  } catch {
    return { ok: false, error: "SIGN_OUT_FAILED" };
  }

  redirect(safeLocale === "en" ? "/en/dang-nhap" : "/dang-nhap");
}

export async function cancelAccountDeletionAction(
  locale: "en" | "vi",
): Promise<ActionResult> {
  let actor;
  try {
    const { resolveVerifiedAccountActor } = await import(
      "../../auth/resolve-current-actor"
    );
    actor = await resolveVerifiedAccountActor();
  } catch {
    return { ok: false, error: "CANCEL_FAILED" };
  }

  let result: { ok?: boolean; error?: { code?: string } };
  try {
    const { privateApiClient } = await import("../../api/private-api-client");
    result = await privateApiClient(actor, actor.requestId).request<{
      ok?: boolean;
      error?: { code?: string };
    }>("/privacy/account/deletion/cancel", {
      method: "POST",
    });
  } catch {
    return { ok: false, error: "CANCEL_FAILED" };
  }

  if (!result || result.ok !== true) {
    return { ok: false, error: "CANCEL_FAILED" };
  }

  revalidatePath("/[locale]/tai-khoan/quyen-rieng-tu", "page");
  return { ok: true };
}

export async function signOutAction(locale: "en" | "vi"): Promise<ActionResult> {
  const safeLocale = locale === "en" ? "en" : "vi";
  const headers = await requestHeaders();
  try {
    const { getAuth } = await import("../../auth/auth");
    await getAuth().api.signOut({ headers });
  } catch {
    return { ok: false, error: "SIGN_OUT_FAILED" };
  }
  redirect(safeLocale === "en" ? "/en" : "/");
}
