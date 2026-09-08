import {
  EvidenceItemV1Schema,
  IdentityReportV1Schema,
  ReportPendingViewV1Schema,
  ReportReadyViewV1Schema,
  ReportFailedViewV1Schema,
  ReportViewV1Schema,
  REPORT_PENDING_STATUSES,
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN,
  ZiweiComprehensiveReportContentV1Schema,
  projectComprehensiveReportPublicContent,
  type CurrentActor,
  type EvidenceItemV1,
  type ReportViewV1,
  type Result,
} from "@lasoviet/contracts";

import type {
  AuthorizedReportQueryRecord,
  ReportQueryRepository,
} from "./report-query.repository.js";
import { resolveIdentityReportVersionFamily } from "./identity-report-version-family.js";

export type {
  AuthorizedReportQueryRecord,
  ReportQueryRepository,
} from "./report-query.repository.js";

export type ReportQueryError = "REPORT_NOT_FOUND" | "REPORT_FORBIDDEN";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ReportQueryDataError extends Error {
  constructor(message = "REPORT_QUERY_DATA_INVALID") {
    super(message);
    this.name = "ReportQueryDataError";
  }
}

export type ReportQueryService = {
  getReport(
    actor: CurrentActor,
    reportId: string,
  ): Promise<Result<ReportViewV1, ReportQueryError>>;
};

function notFound(): Result<never, ReportQueryError> {
  return {
    ok: false,
    error: {
      code: "REPORT_NOT_FOUND",
      messageKey: "reports.report_not_found",
      retryable: false,
    },
  };
}

function forbidden(): Result<never, ReportQueryError> {
  return {
    ok: false,
    error: {
      code: "REPORT_FORBIDDEN",
      messageKey: "reports.report_forbidden",
      retryable: false,
    },
  };
}

export function createReportQueryService(options: {
  repository: ReportQueryRepository;
}): ReportQueryService {
  return {
    async getReport(actor, reportId) {
      if (typeof reportId !== "string" || reportId.trim().length === 0) {
        return notFound();
      }

      if (actor.kind !== "account") {
        return forbidden();
      }

      if (!UUID_REGEX.test(reportId.trim())) {
        return notFound();
      }

      const cleanReportId = reportId.trim();
      const record = await options.repository.readAuthorizedReport(
        actor.userId,
        cleanReportId,
      );

      if (!record) {
        return notFound();
      }

      const { reservation, version, evidenceItems } = record;

      if (
        (reservation.locale !== "vi" && reservation.locale !== "en") ||
        reservation.sku !== "ZIWEI-IDENTITY-P0"
      ) {
        throw new ReportQueryDataError();
      }

      const validFulfillmentStatuses = [
        "requested",
        "generating",
        "validating",
        "html_ready",
        "pdf_pending",
        "complete",
        "retryable_failure",
        "terminal_failure",
      ] as const;
      type ValidFulfillmentStatus = typeof validFulfillmentStatuses[number];
      if (!validFulfillmentStatuses.includes(reservation.status as ValidFulfillmentStatus)) {
        throw new ReportQueryDataError();
      }

      const reservationFulfillmentStatus = reservation.status as ValidFulfillmentStatus;

      if (!version) {
        if (reservationFulfillmentStatus === "terminal_failure") {
          const failedParse = ReportFailedViewV1Schema.safeParse({
            version: 1,
            state: "failed",
            reportId: reservation.reportId,
            reportVersionId: reservation.reportVersionId,
            locale: reservation.locale,
            sku: reservation.sku,
            fulfillmentStatus: "terminal_failure",
          });
          if (!failedParse.success) {
            throw new ReportQueryDataError();
          }
          return { ok: true, value: failedParse.data };
        }

        type PendingStatus = typeof REPORT_PENDING_STATUSES[number];
        if ((REPORT_PENDING_STATUSES as readonly string[]).includes(reservationFulfillmentStatus)) {
          const pendingParse = ReportPendingViewV1Schema.safeParse({
            version: 1,
            state: "pending",
            reportId: reservation.reportId,
            reportVersionId: reservation.reportVersionId,
            locale: reservation.locale,
            sku: reservation.sku,
            fulfillmentStatus: reservationFulfillmentStatus as PendingStatus,
            refreshAfterMs: 5000,
          });
          if (!pendingParse.success) {
            throw new ReportQueryDataError();
          }
          return { ok: true, value: pendingParse.data };
        }

        throw new ReportQueryDataError();
      }

      // Consistency checks between reservation and immutable version:
      if (
        version.reportId !== reservation.reportId ||
        version.reportVersionId !== reservation.reportVersionId ||
        version.entitlementId !== reservation.entitlementId ||
        version.chartVersionId !== reservation.chartVersionId ||
        version.evidenceVersionId !== reservation.evidenceVersionId ||
        version.knowledgeVersionId !== reservation.knowledgeVersionId ||
        version.promptVersion !== reservation.promptVersion ||
        version.reportConfigVersion !== reservation.reportConfigVersion ||
        version.locale !== reservation.locale ||
        version.sku !== reservation.sku
      ) {
        throw new ReportQueryDataError();
      }

      const family = resolveIdentityReportVersionFamily(
        version.promptVersion,
        version.knowledgeVersionId,
      );
      if (family === null) {
        throw new ReportQueryDataError();
      }

      if (family === "v3") {
        if (reservation.locale !== "vi" || version.locale !== "vi") {
          throw new ReportQueryDataError();
        }

        const parsedV3 = ZiweiComprehensiveReportContentV1Schema.safeParse(version.structuredContent);
        if (!parsedV3.success) {
          throw new ReportQueryDataError();
        }

        const publicContent = projectComprehensiveReportPublicContent(parsedV3.data);

        const readyParse = ReportReadyViewV1Schema.safeParse({
          version: 1,
          state: "ready",
          contentVersion: "ziwei-comprehensive.v1",
          reportId: reservation.reportId,
          reportVersionId: reservation.reportVersionId,
          locale: "vi",
          sku: reservation.sku,
          fulfillmentStatus: reservationFulfillmentStatus,
          content: publicContent,
          lineage: {
            supersedesReportVersionId: version.supersedesReportVersionId ?? null,
          },
        });

        if (!readyParse.success) {
          throw new ReportQueryDataError();
        }

        return { ok: true, value: readyParse.data };
      }

      const parsedContent = IdentityReportV1Schema.safeParse(version.structuredContent);
      if (!parsedContent.success) {
        throw new ReportQueryDataError();
      }

      const contentData = parsedContent.data;
      if (contentData.locale !== reservation.locale || contentData.sku !== reservation.sku) {
        throw new ReportQueryDataError();
      }

      // Require structured content provenance to agree with the persisted version/reservation
      if (
        contentData.provenance.chartVersionId !== version.chartVersionId ||
        contentData.provenance.knowledgeVersion !== version.knowledgeVersionId ||
        contentData.provenance.promptVersion !== version.promptVersion
      ) {
        throw new ReportQueryDataError();
      }

      const parsedEvidenceMap = new Map<string, EvidenceItemV1>();
      for (const item of evidenceItems) {
        const parsedItem = EvidenceItemV1Schema.safeParse(item.payload);
        if (!parsedItem.success) {
          throw new ReportQueryDataError();
        }
        parsedEvidenceMap.set(parsedItem.data.id, parsedItem.data);
      }

      const referencedEvidenceIds = new Set<string>();
      for (const section of contentData.sections) {
        for (const claim of section.claims) {
          for (const evId of claim.evidenceIds) {
            if (!parsedEvidenceMap.has(evId)) {
              throw new ReportQueryDataError();
            }
            referencedEvidenceIds.add(evId);
          }
        }
      }

      const boundEvidence = Array.from(referencedEvidenceIds)
        .sort()
        .map((id) => parsedEvidenceMap.get(id)!);

      const disclaimer =
        reservation.locale === "vi"
          ? CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER
          : CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN;

      const readyParse = ReportReadyViewV1Schema.safeParse({
        version: 1,
        state: "ready",
        contentVersion: "identity.v1",
        reportId: reservation.reportId,
        reportVersionId: reservation.reportVersionId,
        locale: reservation.locale,
        sku: reservation.sku,
        fulfillmentStatus: reservationFulfillmentStatus,
        content: {
          sections: contentData.sections,
          reflectionQuestions: contentData.reflectionQuestions,
          summaryActions: contentData.summaryActions,
          professionalAdviceDisclaimer: disclaimer,
        },
        evidence: boundEvidence,
        lineage: {
          supersedesReportVersionId: version.supersedesReportVersionId ?? null,
        },
        provenance: {
          method: "ziwei",
          ruleVersion: contentData.provenance.ruleVersion,
          evidenceVersion: contentData.provenance.evidenceVersion,
          knowledgeVersion: contentData.provenance.knowledgeVersion,
          templateVersion: contentData.provenance.templateVersion,
          createdAt: version.createdAt.toISOString(),
        },
      });

      if (!readyParse.success) {
        throw new ReportQueryDataError();
      }

      return { ok: true, value: readyParse.data };
    },
  };
}
