import {
  EvidenceItemV1Schema,
  NormalizedZiweiChartV1Schema,
  PaidTopicSelectionRequestV1Schema,
  PaidTopicSelectionViewV1Schema,
  type CurrentActor,
  type FreeIdentityPreviewV1,
  type PaidTopicSelectionViewV1,
  type Result,
  ZiweiChartViewV1Schema,
  ZiweiEvidenceViewV1Schema,
  type ZiweiChartViewV1,
  type ZiweiEvidenceViewV1,
} from "@lasoviet/contracts";
import { productCatalog } from "@lasoviet/config";

import type { AnalyticsService } from "../analytics/analytics.service.js";
import {
  buildFreeIdentityPreview,
} from "../reports/free-identity-preview.js";
import type { ZiweiQueryRepository } from "./ziwei-query.repository.js";

export type { ZiweiQueryRepository } from "./ziwei-query.repository.js";

export type ZiweiQueryError =
  | "CHART_NOT_FOUND"
  | "EVIDENCE_NOT_FOUND"
  | "ANONYMOUS_EXPIRED"
  | "INSUFFICIENT_EVIDENCE"
  | "SKU_UNAVAILABLE";

export type ZiweiQueryServiceOptions = {
  repository: ZiweiQueryRepository;
  now?: () => Date;
  analytics?: AnalyticsService;
};

export class ZiweiQueryDataError extends Error {
  constructor() {
    super("ZIWEI_QUERY_DATA_INVALID");
    this.name = "ZiweiQueryDataError";
  }
}

function error(code: ZiweiQueryError): Result<never, ZiweiQueryError> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `ziwei.${code.toLowerCase()}`,
      retryable: false,
    },
  };
}

function anonymousExpired(actor: CurrentActor, now: Date): boolean {
  return actor.kind === "anonymous" && new Date(actor.expiresAt) <= now;
}

function chartView(record: Awaited<ReturnType<ZiweiQueryRepository["readAuthorizedChart"]>> extends infer T ? Exclude<T, null> : never): ZiweiChartViewV1 {
  const chart = NormalizedZiweiChartV1Schema.safeParse(record.normalizedOutput);
  const items = record.items.map((item) =>
    EvidenceItemV1Schema.safeParse(item.payload),
  );
  if (
    !chart.success ||
    items.some((item) => !item.success) ||
    record.evidenceSetId === null ||
    record.capabilityId !== "ziwei.identity.p0" ||
    record.ruleVersion !== "ziwei.identity.v1"
  ) {
    throw new ZiweiQueryDataError();
  }
  const itemIds = items.map((item) => {
    if (!item.success) {
      throw new ZiweiQueryDataError();
    }
    return item.data.id;
  });
  const view = ZiweiChartViewV1Schema.safeParse({
    version: 1,
    chartId: record.chartId,
    chartVersionId: record.chartVersionId,
    chart: chart.data,
    evidenceIndex: {
      version: 1,
      evidenceSetId: record.evidenceSetId,
      capabilityId: record.capabilityId,
      chartVersionId: record.chartVersionId,
      ruleVersion: record.ruleVersion,
      itemIds,
    },
  });
  if (!view.success) {
    throw new ZiweiQueryDataError();
  }
  return view.data;
}

export function createZiweiQueryService(options: ZiweiQueryServiceOptions) {
  const now = options.now ?? (() => new Date());

  async function authorizedChart(actor: CurrentActor, chartId: string) {
    const record = await authorizedRecord(actor, chartId);
    return "ok" in record ? record : chartView(record);
  }

  async function authorizedRecord(actor: CurrentActor, chartId: string) {
    const currentTime = now();
    if (anonymousExpired(actor, currentTime)) {
      return error("ANONYMOUS_EXPIRED");
    }
    const record = await options.repository.readAuthorizedChart(
      actor,
      chartId,
      currentTime,
    );
    return record === null ? error("CHART_NOT_FOUND") : record;
  }

  function topicView(
    chartId: string,
    chartVersionId: string,
  ): PaidTopicSelectionViewV1 {
    const view = PaidTopicSelectionViewV1Schema.safeParse({
      version: 1,
      chartId,
      chartVersionId,
      offers: productCatalog.firstPaidOffers().map((offer) => ({
        sku: offer.sku,
        method: offer.method,
        price: offer.price,
        currency: offer.currency,
        sections: offer.sections,
      })),
    });
    if (!view.success) {
      throw new ZiweiQueryDataError();
    }
    return view.data;
  }

  return {
    async readChart(
      actor: CurrentActor,
      chartId: string,
    ): Promise<Result<ZiweiChartViewV1, ZiweiQueryError>> {
      const record = await authorizedChart(actor, chartId);
      return "ok" in record ? record : { ok: true, value: record };
    },

    async readEvidence(
      actor: CurrentActor,
      chartId: string,
      evidenceId: string,
    ): Promise<Result<ZiweiEvidenceViewV1, ZiweiQueryError>> {
      const chart = await authorizedChart(actor, chartId);
      if ("ok" in chart) {
        return chart;
      }
      if (!chart.evidenceIndex.itemIds.includes(evidenceId)) {
        return error("EVIDENCE_NOT_FOUND");
      }
      const item = await options.repository.readEvidenceItem(
        chart.evidenceIndex.evidenceSetId,
        evidenceId,
      );
      const evidence = item === null
        ? undefined
        : EvidenceItemV1Schema.safeParse(item.payload);
      if (evidence === undefined) {
        return error("EVIDENCE_NOT_FOUND");
      }
      if (!evidence.success || evidence.data.id !== evidenceId) {
        throw new ZiweiQueryDataError();
      }
      const view = ZiweiEvidenceViewV1Schema.safeParse({
        version: 1,
        chartId: chart.chartId,
        chartVersionId: chart.chartVersionId,
        evidence: evidence.data,
      });
      if (!view.success) {
        throw new ZiweiQueryDataError();
      }
      return { ok: true, value: view.data };
    },

    async readPreview(
      actor: CurrentActor,
      chartId: string,
    ): Promise<Result<FreeIdentityPreviewV1, ZiweiQueryError>> {
      const record = await authorizedRecord(actor, chartId);
      if ("ok" in record) {
        return record;
      }
      return buildFreeIdentityPreview({
        chartId: record.chartId,
        chartVersionId: record.chartVersionId,
        evidence: record.items.map((item) => item.payload),
      });
    },

    async listTopics(
      actor: CurrentActor,
      chartId: string,
    ): Promise<Result<PaidTopicSelectionViewV1, ZiweiQueryError>> {
      const record = await authorizedRecord(actor, chartId);
      return "ok" in record
        ? record
        : { ok: true, value: topicView(record.chartId, record.chartVersionId) };
    },

    async selectTopic(
      actor: CurrentActor,
      chartId: string,
      request: unknown,
    ): Promise<Result<PaidTopicSelectionViewV1, ZiweiQueryError>> {
      const record = await authorizedRecord(actor, chartId);
      if ("ok" in record) {
        return record;
      }
      const selection = PaidTopicSelectionRequestV1Schema.safeParse(request);
      if (
        !selection.success ||
        productCatalog.findSelectableOffer(
          typeof request === "object" && request !== null && "sku" in request
            ? String(request.sku)
            : "",
        ) === undefined
      ) {
        return error("SKU_UNAVAILABLE");
      }
      const view = topicView(record.chartId, record.chartVersionId);
      await options.analytics?.emit({
        name: "paid_topic_selected",
        properties: {
          sku: selection.data.sku,
          method: "ziwei",
          recommendation_source: "topic_selection",
        },
      });
      return { ok: true, value: view };
    },
  };
}
