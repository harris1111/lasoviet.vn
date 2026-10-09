import { isDeepStrictEqual } from "node:util";
import { eq } from "drizzle-orm";
import type { CurrentActor, BaziDecadalSourceV1, BaziFactsInputV1 } from "@lasoviet/contracts";
import { baziSources, birthProfileRevisions, type Database } from "@lasoviet/database";
import { buildBaziDecadalSource } from "@lasoviet/engine-adapters";
import { createDatabaseBaziSourceRepository } from "./bazi-source.repository.js";

export type OwnedBaziDecadalResult = {ok: true; value: {sourceId: string; source: BaziDecadalSourceV1}}
  | {ok: false; error: {code: "BAZI_DECADAL_SOURCE_UNAVAILABLE"}};
const denied = (): OwnedBaziDecadalResult => ({ok: false, error: {code: "BAZI_DECADAL_SOURCE_UNAVAILABLE"}});

/** Private factual preparation, not paid admission. CurrentActor comes from authentication. */
export function createDatabaseBaziDecadalSourceRepository(database: Database, options: {clock?: () => Date} = {}) {
  const clock = options.clock ?? (() => new Date());
  return {
    async prepare(actor: CurrentActor, sourceId: string): Promise<OwnedBaziDecadalResult> {
      if (typeof sourceId !== "string" || !sourceId.trim() || sourceId.length > 255) return denied();
      return database.transaction(async tx => {
        // Savepoint reads retain coordinator/owner/profile locks in this outer
        // transaction. Only the immutable referenced revision supplies gender.
        const repository = createDatabaseBaziSourceRepository(tx as Database, {clock});
        const owned = await repository.read(actor, sourceId);
        if (!owned.ok) return denied();
        const [stored] = await tx.select({resolvedInput: baziSources.resolvedInput,
          originalInput: birthProfileRevisions.originalInput}).from(baziSources)
          .innerJoin(birthProfileRevisions, eq(birthProfileRevisions.id, baziSources.profileRevisionId))
          .where(eq(baziSources.id, sourceId));
        if (!stored || typeof stored.originalInput !== "object" || stored.originalInput === null) return denied();
        const gender = (stored.originalInput as Record<string, unknown>).gender;
        if (gender !== "male" && gender !== "female") return denied();
        let source: BaziDecadalSourceV1;
        try {source = buildBaziDecadalSource({resolvedInput: stored.resolvedInput as BaziFactsInputV1,
          storedChart: owned.value.chart, gender});}
        catch {return denied();}
        // Revalidate lifecycle after projection with a fresh authoritative clock.
        // A hash/DTO never replaces owned source authority at the return boundary.
        const final = await repository.read(actor, sourceId);
        if (!final.ok || final.value.sourceId !== sourceId || !isDeepStrictEqual(final.value.chart, owned.value.chart)) return denied();
        return {ok: true, value: {sourceId, source}};
      });
    },
  };
}
