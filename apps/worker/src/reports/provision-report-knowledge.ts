import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvironment } from "@lasoviet/config";
import { createDatabase, type Database } from "@lasoviet/database";
import {
  createKnowledgeIngestionService,
  type createKnowledgeIngestionService as IngestionFactory,
} from "@lasoviet/backend";

export type ProvisionReportKnowledgeOptions = {
  databaseUrl?: string;
  database?: Database;
  repositoryRoot?: string;
  ingestionService?: Pick<ReturnType<typeof IngestionFactory>, "ingestKnowledge">;
  manifestLoader?: () => { viManifest: unknown; enManifest: unknown };
};

export async function provisionReportKnowledge(
  options: ProvisionReportKnowledgeOptions = {},
): Promise<void> {
  const repositoryRoot = options.repositoryRoot ? resolve(options.repositoryRoot) : resolve(process.cwd());

  let viManifest: unknown;
  let enManifest: unknown;

  if (options.manifestLoader !== undefined) {
    const loaded = options.manifestLoader();
    viManifest = loaded.viManifest;
    enManifest = loaded.enManifest;
  } else {
    try {
      const viPath = resolve(repositoryRoot, "content/knowledge/vi/ziwei/identity-report-foundation.v2.json");
      const enPath = resolve(repositoryRoot, "content/knowledge/en/ziwei/identity-report-foundation.v2.json");
      viManifest = JSON.parse(readFileSync(viPath, "utf8"));
      enManifest = JSON.parse(readFileSync(enPath, "utf8"));
    } catch {
      throw new Error("REPORT_KNOWLEDGE_PROVISION_FAILED");
    }
  }

  let ingestionService = options.ingestionService;
  if (ingestionService === undefined) {
    let database = options.database;
    if (database === undefined) {
      const environment = loadEnvironment(process.env);
      if (!environment.ok || environment.value.databaseUrl === undefined) {
        throw new Error("WORKER_CONFIG_INVALID");
      }
      database = createDatabase(environment.value.databaseUrl);
    }
    ingestionService = createKnowledgeIngestionService({ database, repositoryRoot });
  }

  const viResult = await ingestionService.ingestKnowledge(viManifest);
  if (!viResult.ok) {
    console.error("REPORT_KNOWLEDGE_PROVISION_FAILED", viResult.code);
    throw new Error("REPORT_KNOWLEDGE_PROVISION_FAILED");
  }

  const enResult = await ingestionService.ingestKnowledge(enManifest);
  if (!enResult.ok) {
    console.error("REPORT_KNOWLEDGE_PROVISION_FAILED", enResult.code);
    throw new Error("REPORT_KNOWLEDGE_PROVISION_FAILED");
  }
}
