"use server";

// Reports that the reader opened a tab of their own free reading. Best-effort and silent: the server
// decides what, if anything, this means (engagement count, gift request). Never throws to the client.
export async function recordFreePalaceEngagement(chartId: string, locale: "vi" | "en", tab: string): Promise<void> {
  try {
    const [{ privateApiClient }, { resolveCurrentActor }] = await Promise.all([
      import("../../api/private-api-client"),
      import("../../auth/resolve-current-actor"),
    ]);
    const actor = await resolveCurrentActor();
    await privateApiClient(actor, actor.requestId).request<unknown>(
      `/ziwei/charts/${encodeURIComponent(chartId)}/free-palace/engagement`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tab, locale: locale === "en" ? "en" : "vi" }) },
    );
  } catch {
    // intentionally silent
  }
}
