import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvironment } from "@lasoviet/config";
import { createDatabase, type Database } from "@lasoviet/database";
import {
  createKnowledgeIngestionService,
  validateKnowledgeManifest,
  type createKnowledgeIngestionService as IngestionFactory,
  type KnowledgeManifestV1,
} from "@lasoviet/backend";

export const DEFAULT_REPORT_KNOWLEDGE_PATHS = {
  vi: "content/knowledge/vi/ziwei/comprehensive-report.v3.json",
  en: "content/knowledge/en/ziwei/identity-report-foundation.v2.json",
} as const;

export type ManifestValidator = (
  input: unknown,
  options?: { repositoryRoot?: string },
) => { ok: true; value: KnowledgeManifestV1 } | { ok: false; code: string; message: string };

export type ProvisionReportKnowledgeOptions = {
  databaseUrl?: string;
  database?: Database;
  repositoryRoot?: string;
  ingestionService?: Pick<ReturnType<typeof IngestionFactory>, "ingestKnowledge">;
  manifestLoader?: () => { viManifest: unknown; enManifest: unknown };
  manifestValidator?: ManifestValidator;
};

export async function provisionReportKnowledge(
  options: ProvisionReportKnowledgeOptions = {},
): Promise<void> {
  try {
    const repositoryRoot = options.repositoryRoot ? resolve(options.repositoryRoot) : resolve(process.cwd());

    let viManifest: unknown;
    let enManifest: unknown;

    if (options.manifestLoader !== undefined) {
      const loaded = options.manifestLoader();
      viManifest = loaded.viManifest;
      enManifest = loaded.enManifest;
    } else {
      const viPath = resolve(repositoryRoot, DEFAULT_REPORT_KNOWLEDGE_PATHS.vi);
      const enPath = resolve(repositoryRoot, DEFAULT_REPORT_KNOWLEDGE_PATHS.en);
      viManifest = JSON.parse(readFileSync(viPath, "utf8"));
      enManifest = JSON.parse(readFileSync(enPath, "utf8"));
    }

    const validator = options.manifestValidator ?? validateKnowledgeManifest;

    const viValidation = validator(viManifest, { repositoryRoot });
    if (!viValidation.ok) {
      console.error("REPORT_KNOWLEDGE_PROVISION_FAILED", viValidation.code);
      throw new Error("REPORT_KNOWLEDGE_PROVISION_FAILED");
    }

    const enValidation = validator(enManifest, { repositoryRoot });
    if (!enValidation.ok) {
      console.error("REPORT_KNOWLEDGE_PROVISION_FAILED", enValidation.code);
      throw new Error("REPORT_KNOWLEDGE_PROVISION_FAILED");
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

    const viResult = await ingestionService.ingestKnowledge(viValidation.value);
    if (!viResult.ok) {
      console.error("REPORT_KNOWLEDGE_PROVISION_FAILED", viResult.code);
      throw new Error("REPORT_KNOWLEDGE_PROVISION_FAILED");
    }

    const enResult = await ingestionService.ingestKnowledge(enValidation.value);
    if (!enResult.ok) {
      console.error("REPORT_KNOWLEDGE_PROVISION_FAILED", enResult.code);
      throw new Error("REPORT_KNOWLEDGE_PROVISION_FAILED");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "REPORT_KNOWLEDGE_PROVISION_FAILED") {
      throw error;
    }
    console.error("REPORT_KNOWLEDGE_PROVISION_FAILED");
    throw new Error("REPORT_KNOWLEDGE_PROVISION_FAILED");
  }
}
