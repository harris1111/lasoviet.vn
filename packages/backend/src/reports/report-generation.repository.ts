import { and, asc, eq } from "drizzle-orm";

import {
  EvidenceItemV1Schema,
  EvidenceSetV1Schema,
  NormalizedZiweiChartV1Schema,
  ReadingContextV1Schema,
  type Result,
} from "@lasoviet/contracts";
import {
  evidenceItems,
  evidenceSets,
  birthProfileReadingContextRevisions,
  birthProfiles,
  type Database,
  reportReservations,
  ziweiCharts,
  ziweiChartVersions,
} from "@lasoviet/database";

import {
  KnowledgeError,
  type KnowledgePassageV1,
  type createKnowledgeRetrievalService,
} from "../knowledge/knowledge-retrieval.service.js";
import { REPORT_KNOWLEDGE_VERSION_V3 } from "./identity-report-config.js";
import { buildComprehensiveZiweiFacts } from "./comprehensive-ziwei-facts.js";
import { buildComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import {
  createDatabaseReportSourceSnapshotRepository,
  type ReportSourceSnapshotRepository,
} from "./report-source-snapshot.repository.js";
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
  type ComprehensiveReportSourceV4,
} from "./report-source.js";

export type ReportGenerationSourceInput = {
  reportVersionId: string;
  chartVersionId: string;
  evidenceVersionId: string;
  knowledgeVersionId: string;
  promptVersion: string;
  locale: "vi" | "en";
  readingContextRevisionId?: string | null;
};

export type ReportGenerationSourceRepository = {
  loadSource(
    input: ReportGenerationSourceInput,
  ): Promise<Result<IdentityReportSource, "REPORT_EVIDENCE_INVALID">>;
  validateLifecycle(input: {
    reportVersionId: string;
    jobId: string;
    readingContextRevisionId: string | null;
  }): Promise<Result<
    { readingContextRevisionId: string | null },
    "REPORT_PROFILE_PURGED" | "REPORT_CONTEXT_MISMATCH"
  >>;
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
  snapshotRepository?: ReportSourceSnapshotRepository;
}): ReportGenerationSourceRepository {
  return {
    async validateLifecycle(input) {
      const [row] = await dependencies.database
        .select({
          reservationContextRevisionId: reportReservations.readingContextRevisionId,
          profileId: birthProfiles.id,
          revisionId: birthProfileReadingContextRevisions.id,
          revisionProfileId: birthProfileReadingContextRevisions.profileId,
        })
        .from(reportReservations)
        .leftJoin(
          ziweiChartVersions,
          eq(ziweiChartVersions.id, reportReservations.chartVersionId),
        )
        .leftJoin(ziweiCharts, eq(ziweiCharts.id, ziweiChartVersions.chartId))
        .leftJoin(birthProfiles, eq(birthProfiles.id, ziweiCharts.profileId))
        .leftJoin(
          birthProfileReadingContextRevisions,
          eq(
            birthProfileReadingContextRevisions.id,
            reportReservations.readingContextRevisionId,
          ),
        )
        .where(
          and(
            eq(reportReservations.reportVersionId, input.reportVersionId),
            eq(reportReservations.activeJobId, input.jobId),
          ),
        )
        .limit(1);

      if (!row || row.profileId === null) {
        return {
          ok: false,
          error: {
            code: "REPORT_PROFILE_PURGED",
            messageKey: "reports.report_profile_purged",
            retryable: false,
          },
        };
      }
      if ((row.reservationContextRevisionId ?? null) !== input.readingContextRevisionId) {
        return {
          ok: false,
          error: {
            code: "REPORT_CONTEXT_MISMATCH",
            messageKey: "reports.report_context_mismatch",
            retryable: false,
          },
        };
      }
      if (
        row.reservationContextRevisionId !== null &&
        (row.revisionId === null || row.revisionProfileId !== row.profileId)
      ) {
        return {
          ok: false,
          error: {
            code: "REPORT_CONTEXT_MISMATCH",
            messageKey: "reports.report_context_mismatch",
            retryable: false,
          },
        };
      }
      return { ok: true, value: { readingContextRevisionId: row.reservationContextRevisionId ?? null } };
    },
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

      const family = resolveIdentityReportVersionFamily(
        input.promptVersion,
        input.knowledgeVersionId,
      );
      if (family === null) {
        return invalid();
      }

      if ((family === "v3" || family === "v4") && input.locale !== "vi") {
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

      if (family === "v4") {
        const snapshotRepo =
          dependencies.snapshotRepository ??
          createDatabaseReportSourceSnapshotRepository(dependencies.database);

        let snapshotRecord;
        try {
          snapshotRecord = await snapshotRepo.getByReportVersionId(input.reportVersionId);
        } catch {
          return invalid();
        }

        if (!snapshotRecord || snapshotRecord.chartVersionId !== input.chartVersionId) {
          return invalid();
        }

        const sourceSnapshot = {
          version: 1 as const,
          reportId: snapshotRecord.reportId,
          reportVersionId: snapshotRecord.reportVersionId,
          chartVersionId: snapshotRecord.chartVersionId,
          asOfDate: snapshotRecord.asOfDate,
          targetYear: snapshotRecord.targetYear,
          timingRuleVersion: snapshotRecord.timingRuleVersion,
          sensitivityRuleVersion: snapshotRecord.sensitivityRuleVersion,
          snapshotHash: snapshotRecord.snapshotHash,
          snapshot: snapshotRecord.snapshot,
        };

        let factsV4;
        try {
          factsV4 = buildComprehensiveZiweiFactsV4(parsedChart.data, sourceSnapshot);
        } catch (err) {
          return invalid();
        }

        if (!dependencies.knowledgeRetrieval.retrieveZiweiKnowledge) {
          return invalid();
        }

        let knowledgePacks: ZiweiReportKnowledgePack[];
        try {
          knowledgePacks = await buildComprehensiveKnowledgePacks(
            factsV4.natal,
            (query) => dependencies.knowledgeRetrieval.retrieveZiweiKnowledge!({
              ...query,
              knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V3,
            }),
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
                knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V3,
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

        let readingContext: IdentityReportSource["readingContext"] = null;
        if (input.readingContextRevisionId) {
          const [revision] = await dependencies.database
            .select({
              lifeStage: birthProfileReadingContextRevisions.lifeStage,
              topConcern: birthProfileReadingContextRevisions.topConcern,
            })
            .from(birthProfileReadingContextRevisions)
            .where(eq(birthProfileReadingContextRevisions.id, input.readingContextRevisionId))
            .limit(1);
          if (!revision) {
            return invalid();
          }
          const parsedContext = ReadingContextV1Schema.safeParse({
            version: 1,
            ...(revision.lifeStage === null ? {} : { lifeStage: revision.lifeStage }),
            ...(revision.topConcern === null ? {} : { topConcern: revision.topConcern }),
          });
          if (!parsedContext.success) {
            return invalid();
          }
          readingContext = parsedContext.data;
        }

        const source: ComprehensiveReportSourceV4 = {
          evidence: assembledEvidence.data,
          frozenFacts: frozenResult.value,
          knowledgePassages: aggregatedPassages,
          comprehensiveFacts: factsV4.natal,
          comprehensiveFactsV4: factsV4,
          knowledgePacks,
          readingContext,
        };

        if (!isBoundIdentityReportSource(source)) {
          return invalid();
        }

        return {
          ok: true,
          value: source,
        };
      }

      if (family === "v3") {
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
