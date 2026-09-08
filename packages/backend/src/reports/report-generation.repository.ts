import { asc, eq } from "drizzle-orm";

import {
  EvidenceItemV1Schema,
  EvidenceSetV1Schema,
  NormalizedZiweiChartV1Schema,
  type Result,
} from "@lasoviet/contracts";
import {
  evidenceItems,
  evidenceSets,
  type Database,
  ziweiChartVersions,
} from "@lasoviet/database";

import {
  KnowledgeError,
  type KnowledgePassageV1,
  type createKnowledgeRetrievalService,
} from "../knowledge/knowledge-retrieval.service.js";
import { buildComprehensiveZiweiFacts } from "./comprehensive-ziwei-facts.js";
import {
  buildComprehensiveKnowledgePacks,
  type ZiweiReportKnowledgePack,
} from "./comprehensive-report-retrieval.js";
import { buildFrozenIdentityReportFacts } from "./frozen-identity-report-facts.js";
import {
  identityReportOutlineV1,
  identityReportOutlineV2,
} from "./identity-report-outline.js";
import { resolveIdentityReportVersionFamily } from "./identity-report-version-family.js";
import { buildSectionRetrievalQuery } from "./identity-report-prompt-context.js";
import {
  identityReportSectionPurpose,
  isBoundIdentityReportSource,
  type IdentityReportSource,
} from "./report-source.js";

export type ReportGenerationSourceInput = {
  reportVersionId: string;
  chartVersionId: string;
  evidenceVersionId: string;
  knowledgeVersionId: string;
  promptVersion: string;
  locale: "vi" | "en";
};

export type ReportGenerationSourceRepository = {
  loadSource(
    input: ReportGenerationSourceInput,
  ): Promise<Result<IdentityReportSource, "REPORT_EVIDENCE_INVALID">>;
};

function invalid(): Result<never, "REPORT_EVIDENCE_INVALID"> {
  return {
    ok: false,
    error: {
      code: "REPORT_EVIDENCE_INVALID",
      messageKey: "reports.report_evidence_invalid",
      retryable: false,
    },
  };
}

export function createDatabaseReportGenerationSourceRepository(dependencies: {
  database: Database;
  knowledgeRetrieval: Pick<
    ReturnType<typeof createKnowledgeRetrievalService>,
    "retrieveKnowledge"
  > & {
    retrieveZiweiKnowledge?: ReturnType<
      typeof createKnowledgeRetrievalService
    >["retrieveZiweiKnowledge"];
  };
}): ReportGenerationSourceRepository {
  return {
    async loadSource(
      input: ReportGenerationSourceInput,
    ): Promise<Result<IdentityReportSource, "REPORT_EVIDENCE_INVALID">> {
      if (
        typeof input.reportVersionId !== "string" ||
        input.reportVersionId.trim().length === 0 ||
        typeof input.chartVersionId !== "string" ||
        input.chartVersionId.trim().length === 0 ||
        typeof input.evidenceVersionId !== "string" ||
        input.evidenceVersionId.trim().length === 0 ||
        typeof input.knowledgeVersionId !== "string" ||
        input.knowledgeVersionId.trim().length === 0 ||
        typeof input.promptVersion !== "string" ||
        input.promptVersion.trim().length === 0 ||
        (input.locale !== "vi" && input.locale !== "en")
      ) {
        return invalid();
      }

      const isV3 =
        input.promptVersion === "ziwei.comprehensive.prompt.v3" &&
        input.knowledgeVersionId === "ziwei.comprehensive.knowledge.v3" &&
        input.locale === "vi";

      if (
        input.promptVersion === "ziwei.comprehensive.prompt.v3" ||
        input.knowledgeVersionId === "ziwei.comprehensive.knowledge.v3"
      ) {
        if (!isV3) {
          return invalid();
        }
      }

      let family: "v1" | "v2" | null = null;
      if (!isV3) {
        family = resolveIdentityReportVersionFamily(
          input.promptVersion,
          input.knowledgeVersionId,
        );
        if (family === null) {
          return invalid();
        }
      }

      const [chartRow] = await dependencies.database
        .select({ normalizedOutput: ziweiChartVersions.normalizedOutput })
        .from(ziweiChartVersions)
        .where(eq(ziweiChartVersions.id, input.chartVersionId))
        .limit(1);

      if (chartRow === undefined) {
        return invalid();
      }

      const parsedChart = NormalizedZiweiChartV1Schema.safeParse(
        chartRow.normalizedOutput,
      );
      if (!parsedChart.success) {
        return invalid();
      }

      const [evidenceSetRow] = await dependencies.database
        .select({
          id: evidenceSets.id,
          chartVersionId: evidenceSets.chartVersionId,
          capabilityId: evidenceSets.capabilityId,
          ruleVersion: evidenceSets.ruleVersion,
        })
        .from(evidenceSets)
        .where(eq(evidenceSets.id, input.evidenceVersionId))
        .limit(1);

      if (
        evidenceSetRow === undefined ||
        evidenceSetRow.chartVersionId !== input.chartVersionId ||
        evidenceSetRow.capabilityId !== "ziwei.identity.p0"
      ) {
        return invalid();
      }

      const itemRows = await dependencies.database
        .select({
          evidenceKey: evidenceItems.evidenceKey,
          payload: evidenceItems.payload,
        })
        .from(evidenceItems)
        .where(eq(evidenceItems.evidenceSetId, evidenceSetRow.id))
        .orderBy(asc(evidenceItems.evidenceKey));

      if (itemRows.length === 0) {
        return invalid();
      }

      const items = [];
      for (const row of itemRows) {
        const parsedItem = EvidenceItemV1Schema.safeParse(row.payload);
        if (!parsedItem.success) {
          return invalid();
        }
        items.push(parsedItem.data);
      }

      const assembledEvidence = EvidenceSetV1Schema.safeParse({
        version: 1,
        capabilityId: evidenceSetRow.capabilityId,
        chartVersionId: evidenceSetRow.chartVersionId,
        ruleVersion: evidenceSetRow.ruleVersion,
        items,
      });

      if (!assembledEvidence.success) {
        return invalid();
      }

      const frozenResult = buildFrozenIdentityReportFacts(
        parsedChart.data,
        assembledEvidence.data,
      );
      if (!frozenResult.ok) {
        return invalid();
      }

      if (isV3) {
        if (!dependencies.knowledgeRetrieval.retrieveZiweiKnowledge) {
          return invalid();
        }

        const comprehensiveFacts = buildComprehensiveZiweiFacts(parsedChart.data);

        let knowledgePacks: ZiweiReportKnowledgePack[];
        try {
          knowledgePacks = await buildComprehensiveKnowledgePacks(
            comprehensiveFacts,
            (query) => dependencies.knowledgeRetrieval.retrieveZiweiKnowledge!(query),
          );
        } catch (error) {
          if (error instanceof KnowledgeError) {
            return invalid();
          }
          throw error;
        }

        const aggregatedPassages: KnowledgePassageV1[] = [];
        const seenPassageIds = new Set<string>();

        for (const pack of knowledgePacks) {
          for (const passage of pack.passages) {
            if (!seenPassageIds.has(passage.passageId)) {
              seenPassageIds.add(passage.passageId);
              aggregatedPassages.push({
                id: passage.passageId,
                passageId: passage.passageId,
                documentId: "",
                discipline: "ziwei",
                locale: "vi",
                reportSections: [],
                knowledgeVersion: input.knowledgeVersionId,
                content: passage.content,
                contentHash: "",
                sourceAttribution: "",
                permittedUse: "reference_rewrite",
                metadata: passage.metadata,
              });
            }
          }
        }

        if (aggregatedPassages.length === 0) {
          return invalid();
        }

        const source: IdentityReportSource = {
          evidence: assembledEvidence.data,
          frozenFacts: frozenResult.value,
          knowledgePassages: aggregatedPassages,
          comprehensiveFacts,
          knowledgePacks,
        };

        if (!isBoundIdentityReportSource(source)) {
          return invalid();
        }

        return {
          ok: true,
          value: source,
        };
      }

      const aggregatedPassages: KnowledgePassageV1[] = [];
      const seenPassageIds = new Set<string>();

      const outline = family === "v1" ? identityReportOutlineV1 : identityReportOutlineV2;

      for (const section of outline) {
        let sectionPassages: KnowledgePassageV1[];
        try {
          const queryText = family === "v1"
            ? identityReportSectionPurpose(section.id, input.locale)
            : buildSectionRetrievalQuery(section.id, input.locale, frozenResult.value.facts);

          sectionPassages = await dependencies.knowledgeRetrieval.retrieveKnowledge({
            discipline: "ziwei",
            locale: input.locale,
            reportSection: section.id,
            knowledgeVersion: input.knowledgeVersionId,
            text: queryText,
            enableVector: false,
          });
        } catch (error) {
          if (error instanceof KnowledgeError) {
            return invalid();
          }
          throw error;
        }

        for (const passage of sectionPassages) {
          if (!seenPassageIds.has(passage.passageId)) {
            seenPassageIds.add(passage.passageId);
            aggregatedPassages.push(passage);
          }
        }
      }

      if (aggregatedPassages.length === 0) {
        return invalid();
      }

      const source: IdentityReportSource = {
        evidence: assembledEvidence.data,
        frozenFacts: frozenResult.value,
        knowledgePassages: aggregatedPassages,
      };

      if (!isBoundIdentityReportSource(source)) {
        return invalid();
      }

      return {
        ok: true,
        value: source,
      };
    },
  };
}
