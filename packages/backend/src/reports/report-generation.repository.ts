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
import { buildFrozenIdentityReportFacts } from "./frozen-identity-report-facts.js";
import { identityReportOutline } from "./identity-report-outline.js";
import { buildSectionRetrievalQuery } from "./identity-report-prompt-context.js";
import {
  isBoundIdentityReportSource,
  type IdentityReportSource,
} from "./report-source.js";

export type ReportGenerationSourceInput = {
  reportVersionId: string;
  chartVersionId: string;
  evidenceVersionId: string;
  knowledgeVersionId: string;
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
  >;
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
        (input.locale !== "vi" && input.locale !== "en")
      ) {
        return invalid();
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

      const aggregatedPassages: KnowledgePassageV1[] = [];
      const seenPassageIds = new Set<string>();

      for (const section of identityReportOutline) {
        let sectionPassages: KnowledgePassageV1[];
        try {
          sectionPassages = await dependencies.knowledgeRetrieval.retrieveKnowledge({
            discipline: "ziwei",
            locale: input.locale,
            reportSection: section.id,
            knowledgeVersion: input.knowledgeVersionId,
            text: buildSectionRetrievalQuery(section.id, input.locale, frozenResult.value.facts),
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
