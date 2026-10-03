import "server-only";

import { FreePalaceGiftViewV1Schema, type CurrentActor, type FreePalaceGiftViewV1 } from "@lasoviet/contracts";
import { z } from "zod";

import { privateApiClient, type PrivateApiClient } from "../../api/private-api-client";
import { resolveCurrentActor } from "../../auth/resolve-current-actor";

export type FreePalaceGiftLoaderDependencies = {
  resolveCurrentActor(): Promise<CurrentActor>;
  privateApiClient(actor: CurrentActor, requestId: string): PrivateApiClient;
};

const envelope = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), value: z.unknown() }).strict(),
  z.object({ ok: z.literal(false), error: z.object({ code: z.string() }).passthrough() }).strict(),
]);

// Defensive by construction: the page is already authorized by the chart loader, and the gift only
// ENRICHES it. So every failure — backend down, auth error, malformed or unsupported payload, a
// view for another chart version — returns null and the Phase A structural fallback renders. It
// never throws, never retries and never triggers generation (the endpoint is read-only).
export function createFreePalaceGiftLoader(dependencies: FreePalaceGiftLoaderDependencies) {
  return {
    async load(input: { chartId: string; chartVersionId: string; locale: "vi" | "en" }): Promise<FreePalaceGiftViewV1 | null> {
      try {
        const actor = await dependencies.resolveCurrentActor();
        const response = envelope.safeParse(
          await dependencies.privateApiClient(actor, actor.requestId)
            .request<unknown>(`/ziwei/charts/${encodeURIComponent(input.chartId)}/free-palace?locale=${input.locale}`),
        );
        if (!response.success || !response.data.ok) return null;
        const view = FreePalaceGiftViewV1Schema.safeParse(response.data.value);
        if (!view.success) return null;
        if (view.data.status === "ready" && (view.data.chartVersionId !== input.chartVersionId || view.data.locale !== input.locale)) return null;
        return view.data;
      } catch {
        return null;
      }
    },
  };
}

export const freePalaceGiftLoader = createFreePalaceGiftLoader({ resolveCurrentActor, privateApiClient });
