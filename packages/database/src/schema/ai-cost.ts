import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const aiModelPricing = pgTable(
  "ai_model_pricing",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pricingVersion: text("pricing_version").notNull(),
    providerId: text("provider_id").notNull(),
    modelId: text("model_id").notNull(),
    currency: text("currency").notNull(),
    inputPricePerMillion: bigint("input_price_per_million", { mode: "bigint" }).notNull(),
    outputPricePerMillion: bigint("output_price_per_million", { mode: "bigint" }).notNull(),
    cachedInputPricePerMillion: bigint("cached_input_price_per_million", {
      mode: "bigint",
    }).notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true, mode: "date" }).notNull(),
    source: text("source").notNull(),
    sourceCurrency: text("source_currency").notNull(),
    sourceReference: text("source_reference").notNull(),
    fxSource: text("fx_source").notNull(),
    fxRate: bigint("fx_rate", { mode: "bigint" }).notNull(),
    fxTimestamp: timestamp("fx_timestamp", { withTimezone: true, mode: "date" }).notNull(),
    referenceMetadata: jsonb("reference_metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("ai_model_pricing_version_unique").on(table.pricingVersion),
    uniqueIndex("ai_model_pricing_provider_model_effective_unique").on(
      table.providerId,
      table.modelId,
      table.effectiveFrom,
    ),
    index("ai_model_pricing_lookup_idx").on(
      table.providerId,
      table.modelId,
      table.effectiveFrom,
      table.status,
    ),
    check(
      "ai_model_pricing_prices_non_negative",
      sql`${table.inputPricePerMillion} >= 0 AND ${table.outputPricePerMillion} >= 0 AND ${table.cachedInputPricePerMillion} >= 0`,
    ),
    check("ai_model_pricing_currency_vnd", sql`${table.currency} = 'VND'`),
    check(
      "ai_model_pricing_status_valid",
      sql`${table.status} IN ('active', 'retired', 'pending_approval')`,
    ),
    check("ai_model_pricing_source_non_empty", sql`btrim(${table.source}) <> ''`),
    check("ai_model_pricing_source_currency_non_empty", sql`btrim(${table.sourceCurrency}) <> ''`),
    check("ai_model_pricing_source_reference_non_empty", sql`btrim(${table.sourceReference}) <> ''`),
    check("ai_model_pricing_fx_source_non_empty", sql`btrim(${table.fxSource}) <> ''`),
    check("ai_model_pricing_fx_rate_positive", sql`${table.fxRate} > 0`),
  ],
);

export const aiCallAttempts = pgTable(
  "ai_call_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    callId: text("call_id").notNull(),
    attemptNumber: integer("attempt_number").notNull().default(0),
    idempotencyKey: text("idempotency_key"),
    purpose: text("purpose").notNull(),
    providerId: text("provider_id").notNull(),
    requestedModelId: text("requested_model_id").notNull(),
    reportId: uuid("report_id"),
    reportVersionId: uuid("report_version_id"),
    orderId: uuid("order_id"),
    entitlementId: uuid("entitlement_id"),
    chartId: text("chart_id"),
    chartVersionId: text("chart_version_id"),
    sku: text("sku"),
    maxOutputTokens: integer("max_output_tokens").notNull(),
    pricingVersion: text("pricing_version").notNull(),
    inputPricePerMillion: bigint("input_price_per_million", { mode: "bigint" }).notNull(),
    outputPricePerMillion: bigint("output_price_per_million", { mode: "bigint" }).notNull(),
    cachedInputPricePerMillion: bigint("cached_input_price_per_million", {
      mode: "bigint",
    }).notNull(),
    currency: text("currency").notNull(),
    sourceCurrency: text("source_currency").notNull(),
    sourceReference: text("source_reference").notNull(),
    fxSource: text("fx_source").notNull(),
    fxRate: bigint("fx_rate", { mode: "bigint" }).notNull(),
    fxTimestamp: timestamp("fx_timestamp", { withTimezone: true, mode: "date" }).notNull(),
    pricingSource: text("pricing_source").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("ai_call_attempts_call_attempt_unique").on(table.callId, table.attemptNumber),
    index("ai_call_attempts_idempotency_idx").on(table.idempotencyKey),
    index("ai_call_attempts_report_idx").on(table.reportId),
    index("ai_call_attempts_order_idx").on(table.orderId),
    index("ai_call_attempts_chart_idx").on(table.chartId),
    index("ai_call_attempts_purpose_idx").on(table.purpose, table.startedAt),
    check(
      "ai_call_attempts_purpose_valid",
      sql`${table.purpose} IN ('report', 'critic', 'rewrite', 'free_preview', 'synthetic_probe')`,
    ),
    check("ai_call_attempts_attempt_non_negative", sql`${table.attemptNumber} >= 0`),
    check("ai_call_attempts_max_output_tokens_positive", sql`${table.maxOutputTokens} > 0`),
    check("ai_call_attempts_currency_vnd", sql`${table.currency} = 'VND'`),
    check(
      "ai_call_attempts_pricing_non_negative",
      sql`${table.inputPricePerMillion} >= 0 AND ${table.outputPricePerMillion} >= 0 AND ${table.cachedInputPricePerMillion} >= 0`,
    ),
    check("ai_call_attempts_fx_rate_positive", sql`${table.fxRate} > 0`),
    check("ai_call_attempts_source_non_empty", sql`btrim(${table.pricingSource}) <> ''`),
    check("ai_call_attempts_source_currency_non_empty", sql`btrim(${table.sourceCurrency}) <> ''`),
    check("ai_call_attempts_source_reference_non_empty", sql`btrim(${table.sourceReference}) <> ''`),
    check("ai_call_attempts_fx_source_non_empty", sql`btrim(${table.fxSource}) <> ''`),
  ],
);

export const aiUsageOutcomes = pgTable(
  "ai_usage_outcomes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => aiCallAttempts.id),
    responseModelId: text("response_model_id"),
    httpStatus: integer("http_status"),
    errorCode: text("error_code"),
    invalidOutputReason: text("invalid_output_reason"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cachedTokens: integer("cached_tokens"),
    totalTokens: integer("total_tokens"),
    tokensUnknown: boolean("tokens_unknown").notNull().default(false),
    costMicroVnd: bigint("cost_micro_vnd", { mode: "bigint" }),
    costVnd: integer("cost_vnd"),
    costStatus: text("cost_status").notNull().default("resolved"),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("ai_usage_outcomes_attempt_unique").on(table.attemptId),
    index("ai_usage_outcomes_completed_idx").on(table.completedAt),
    check(
      "ai_usage_outcomes_cost_status_valid",
      sql`${table.costStatus} IN ('resolved', 'unknown')`,
    ),
    check(
      "ai_usage_outcomes_invalid_output_reason_valid",
      sql`${table.invalidOutputReason} IS NULL OR ${table.invalidOutputReason} IN ('response_json_parse_failed', 'message_content_missing_or_non_string', 'content_not_json_object', 'json_object_malformed', 'schema_validation_failed', 'resolved_model_missing', 'resolved_model_disallowed')`,
    ),
    check(
      "ai_usage_outcomes_invalid_output_reason_relation",
      sql`${table.invalidOutputReason} IS NULL OR ${table.errorCode} = 'AI_OUTPUT_INVALID'`,
    ),
    check(
      "ai_usage_outcomes_tokens_and_cost_consistency",
      sql`(${table.costStatus} = 'unknown' AND ${table.costMicroVnd} IS NULL AND ${table.costVnd} IS NULL AND ${table.tokensUnknown} = true) OR (${table.costStatus} = 'resolved' AND ${table.tokensUnknown} = false AND ${table.costMicroVnd} IS NOT NULL AND ${table.costMicroVnd} >= 0 AND ${table.costVnd} IS NOT NULL AND ${table.costVnd} >= 0 AND ${table.inputTokens} IS NOT NULL AND ${table.inputTokens} >= 0 AND ${table.outputTokens} IS NOT NULL AND ${table.outputTokens} >= 0 AND ${table.cachedTokens} IS NOT NULL AND ${table.cachedTokens} >= 0 AND ${table.cachedTokens} <= ${table.inputTokens} AND ${table.totalTokens} IS NOT NULL AND ${table.totalTokens} >= ${table.inputTokens} AND ${table.totalTokens} >= ${table.outputTokens})`,
    ),
  ],
);
