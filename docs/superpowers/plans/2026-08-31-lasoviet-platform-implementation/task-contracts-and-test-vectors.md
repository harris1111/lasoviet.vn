# Task Contracts and Test Vectors

## Normative Use

This file completes each phase task's `Interfaces` and TDD sections. Task
`Pxx-Tyy` means Task `yy` in Phase `xx`. An implementor must read the phase
task and this matching contract together. If they conflict, stop and return
the conflict to Terra.

Upstream-specific signatures that are not verified during planning remain
preflight outputs. The task must record the real export before Luna receives
an implementation instruction; no vendor API may be invented from this file.

## Common Types

```ts
type Brand<T, TName extends string> = T & { readonly __brand: TName };

type UserId = Brand<string, "UserId">;
type SessionId = Brand<string, "SessionId">;
type ProfileId = Brand<string, "ProfileId">;
type ProfileRevisionId = Brand<string, "ProfileRevisionId">;
type ChartId = Brand<string, "ChartId">;
type ChartVersionId = Brand<string, "ChartVersionId">;
type EvidenceVersionId = Brand<string, "EvidenceVersionId">;
type OrderId = Brand<string, "OrderId">;
type EntitlementId = Brand<string, "EntitlementId">;
type ReportId = Brand<string, "ReportId">;
type ReportVersionId = Brand<string, "ReportVersionId">;
type AssetId = Brand<string, "AssetId">;

type Locale = "vi" | "en";

type AppError<TCode extends string> = {
  code: TCode;
  messageKey: string;
  retryable: boolean;
  field?: string;
  details?: Record<string, string | number | boolean>;
};

type Result<T, TCode extends string> =
  | { ok: true; value: T }
  | { ok: false; error: AppError<TCode> };
```

Public/BFF errors expose only `code`, `messageKey`, `retryable`, and safe field
metadata. Provider payloads, stack traces, SQL details, secrets, and private
records remain server-only.

## Representative TDD Form

Every required vector is first written as a failing Vitest or Playwright test.
The minimum form is:

```ts
it("enforces the named contract", async () => {
  const result = await subject(givenInput);
  expect(result).toEqual(expectedResult);
  expect(await persistedState()).toEqual(expectedState);
  expect(await emittedContracts()).toEqual(expectedEvents);
});
```

For error vectors, assert the exact error code and confirm that no forbidden
row, event, job, object, email, or analytics payload was created.

## Phase 00 Contracts

| ID | Exact inputs | Outputs and errors | Persistence/events | Required failing vector |
|---|---|---|---|---|
| P00-T01 | Repository root and approved exact dependency selections | Workspace packages `@lasoviet/web`, `api`, `worker`, `backend`, `contracts`, `config`; scripts `build`, `typecheck`, `test`, `lint`, `check`; errors `NON_EXACT_VERSION`, `WORKSPACE_BOUNDARY_VIOLATION` | Root manifests and `pnpm-lock.yaml`; no runtime event | Web manifest containing `@lasoviet/backend` fails boundary test |
| P00-T02 | `loadEnvironment(source: NodeJS.ProcessEnv)` | `Result<AppEnvironment, "MISSING_REQUIRED_ENV" | "INVALID_ENV" | "PARTIAL_OPTIONAL_GROUP">`; optional provider groups are `{ enabled: false }` or complete typed objects | No persistence; errors contain variable names but never values | Production input missing `DATABASE_URL` returns `MISSING_REQUIRED_ENV` and serialized error excludes source values |
| P00-T03 | `resolveLocale(pathname: string, cookieLocale?: string): Locale`; VI/EN JSON trees | Canonical VI root, `/en` English routes; errors `UNSUPPORTED_LOCALE`, `I18N_KEY_MISMATCH`, `I18N_TOKEN_MISMATCH` | Locale cookie only; no localized domain values | Missing EN key and incompatible `{name}` interpolation both fail parity |
| P00-T04 | `createLogger(serviceName: string, context?: RequestContext)` and dependency probes | Redacted logger; `HealthV1 { status, required, degraded, checkedAt }`; error `REQUIRED_DEPENDENCY_UNREADY` | Structured stdout only; no PII persistence | Log input containing password, API key, birth profile, report content, and signed URL emits redaction markers only |

## Phase 01 Contracts

| ID | Exact inputs | Outputs and errors | Persistence/events | Required failing vector |
|---|---|---|---|---|
| P01-T01 | `runMigrations(databaseUrl: string)`; `enqueueOutbox(tx, WorkflowEnvelopeV1)` | `Database`; migration result with applied versions; errors `MIGRATION_FAILED`, `OUTBOX_DUPLICATE_KEY` | Auth, privacy, profile, outbox, audit tables; outbox unique on `eventId` and domain idempotency key | Empty DB and previously migrated DB converge to the same schema; duplicate event inserts once |
| P01-T02 | `createInternalActorToken({ userId, sessionId }, requestId)`; API bearer token | `CurrentActor { userId, sessionId, requestId }`; errors `EMAIL_UNVERIFIED`, `SESSION_REVOKED`, `ACTOR_TOKEN_EXPIRED`, `ACTOR_TOKEN_AUDIENCE`, `ACTOR_TOKEN_INVALID` | Better Auth user/account/session rows; no token body persistence | Tampered token returns `ACTOR_TOKEN_INVALID`; browser-supplied user ID never changes actor |
| P01-T03 | `recordConsent(userId, documentVersion, purpose)`; deletion request/cancel timestamps | Consent record; deletion state `{ requestedAt, recoverUntil, status }`; errors `CONSENT_VERSION_UNKNOWN`, `DELETION_ALREADY_REQUESTED`, `DELETION_RECOVERY_EXPIRED` | Versioned consent, deletion request, audit row; purge outbox after deadline | Request revokes sessions immediately, cancellation at day 29 succeeds, cancellation after day 30 fails |
| P01-T04 | `normalizeBirthProfile(input: BirthProfileV1)`; `resolveZiweiTimeIndex(profile)` | `NormalizedBirthProfileV1`; `Result<number, "TIME_UNKNOWN" | "TIME_RANGE_MULTIPLE_BRANCHES" | "INVALID_TIMEZONE" | "INVALID_CALENDAR_INPUT">` | Original input plus immutable normalized revision and provenance | Range inside one branch succeeds with limitation; crossing range returns `TIME_RANGE_MULTIPLE_BRANCHES` and creates no chart |

## Phase 02 Contracts

| ID | Exact inputs | Outputs and errors | Persistence/events | Required failing vector |
|---|---|---|---|---|
| P02-T01 | `CalculationEngine<Input, Output>.calculate(input, config)` | `EngineResult<Output> { output, provenance, warnings }`; normalized Zi Wei schema with 12 unique palaces; errors `ENGINE_INPUT_INVALID`, `ENGINE_UNAVAILABLE`, `NORMALIZATION_INVALID` | None in contract task | Duplicate palace ID or vendor-localized canonical star ID fails schema |
| P02-T02 | Eligible `ProfileRevisionId`, explicit iztro `default` config | `calculateZiwei(actor, profileRevisionId): Result<{ chartId, chartVersionId }, "PROFILE_FORBIDDEN" | "ZIWEI_TIME_INELIGIBLE" | "ENGINE_FAILED" | "NORMALIZATION_INVALID">` | Immutable run keyed by input/config/engine/adapter hashes; private raw snapshot | Two identical requests return one chart version; unknown time creates no run |
| P02-T03 | Versioned fixture record `{ input, method, expected, source, reviewStatus }` | Fixture result `{ fixtureId, pass, differences[] }`; errors `UNEXPLAINED_MISMATCH`, `REFERENCE_METHOD_INCOMPATIBLE` | Fixture manifest and trusted-source record only | Mingyu Zi Wei cannot satisfy independent-validator count; unexplained mismatch blocks expectation changes |
| P02-T04 | `buildZiweiIdentityEvidence(chart: NormalizedZiweiChartV1)` | `EvidenceSetV1` with stable key, facts, bounds, confidence, limitations, risk tags; errors `EVIDENCE_FACT_MISSING`, `EVIDENCE_RULE_UNSUPPORTED` | Immutable evidence version linked to chart and rule version | Every evidence ID resolves to normalized facts; unsupported rule creates no evidence version |

## Phase 03 Contracts

| ID | Exact inputs | Outputs and errors | Persistence/events | Required failing vector |
|---|---|---|---|---|
| P03-T01 | `privateApiClient(actor, requestId)`; controlled route registry | Versioned server-only API client and route metadata; errors `PRIVATE_API_UNREACHABLE`, `ROUTE_REGISTRY_INVALID` | No browser API host; generated sitemap from registry | Built client bundle contains no private API hostname; every public route has VI/EN metadata |
| P03-T02 | Authenticated actor, `BirthProfileV1`, consent version | `saveBirthProfile(): Result<{ profileId, revisionId, ziweiEligibility }, "CONSENT_REQUIRED" | "VALIDATION_FAILED" | "PROFILE_FORBIDDEN">` | Profile revision, consent, privacy-safe analytics event | Unknown time persists accurately and returns ineligible state; no checkout link appears |
| P03-T03 | Actor, `ChartId`, selected `EvidenceItemV1` | Owner-authorized chart view; errors `CHART_NOT_FOUND`, `CHART_FORBIDDEN`, `EVIDENCE_NOT_FOUND` | No new business row; access request log excludes chart content | Another user receives not-found-equivalent response and no sequential-ID disclosure |
| P03-T04 | Chart version and identity evidence version | `buildFreeIdentityPreview(): { insights: [EvidencePreview, EvidencePreview, EvidencePreview], strength, tension, paidExcerpt }`; errors `INSUFFICIENT_EVIDENCE` | Privacy-safe funnel events only | Preview contains 3 linked insights and 10-15% real excerpt; analytics rejects birth/chart/report fields |

## Phase 04 Contracts

| ID | Exact inputs | Outputs and errors | Persistence/events | Required failing vector |
|---|---|---|---|---|
| P04-T01 | `createOrder(actor, chartId, sku)`; server catalog entry `{ sku, priceVnd, public, purchasable }` | `Result<{ orderId, checkout }, "SKU_UNAVAILABLE" | "CHART_FORBIDDEN" | "ZIWEI_TIME_INELIGIBLE" | "ENTITLEMENT_EXISTS">`; `PaymentProvider.createPayment(order)` | Pending order with server price and provider reference | Client price is ignored; unknown-time chart returns `ZIWEI_TIME_INELIGIBLE` and creates no order |
| P04-T02 | Raw SePay body, required headers, receipt timestamp | `handleSePayWebhook(): Result<{ paymentId, orderId, duplicate }, "SIGNATURE_INVALID" | "ORDER_NOT_FOUND" | "AMOUNT_MISMATCH" | "EVENT_CONFLICT">` | Payment event, paid order, entitlement, report reservation, and `report.generation.requested.v1` in one transaction | Two concurrent valid deliveries produce one payment, entitlement, report version, and outbox event |
| P04-T03 | Contracts in `workflow-event-contracts.md`; `WORKER_QUEUES` | Queue registry and report transition result; errors `JOB_PAYLOAD_INVALID`, `WORKFLOW_STATE_CONFLICT`, `JOB_RETRY_EXHAUSTED` | Report state plus attempts; outbox maps `report.generation.requested.v1` to `report.generate.v1`; terminal failure emits `report.fulfillment.failed.v1` | Crash after claim resumes from DB state; duplicate job creates no second report version |
| P04-T04 | Approved knowledge files with discipline, locale, source, permitted-use basis, hash, version | `ingestKnowledge()` and `retrieveKnowledge(query): KnowledgePassageV1[]`; errors `KNOWLEDGE_UNAPPROVED`, `KNOWLEDGE_METADATA_INVALID`, `KNOWLEDGE_CONTEXT_LIMIT` | Versioned document/chunk rows and optional vector index | Unapproved or wrong-locale chunk is never returned; disabled vector mode still passes |
| P04-T05 | Frozen facts/evidence/knowledge, locale, provider config, capability probe | `AiProvider.generateStructured(request): Result<IdentityReportV1, "AI_CAPABILITY_UNSUPPORTED" | "AI_TIMEOUT" | "AI_OUTPUT_INVALID" | "REPORT_EVIDENCE_INVALID" | "REPORT_SAFETY_REJECTED">` | Immutable generation attempt with model/prompt/config versions; no real-user smoke data | Fabricated evidence ID and absolute disease claim both reject output; due-diligence gate blocks production call |
| P04-T06 | Actor and `ReportId` | `getReport(actor, reportId): Result<ReportView, "REPORT_NOT_FOUND" | "REPORT_FORBIDDEN">`; immutable `supersedesReportId` lineage | Report version rows; no in-place content update | Old version remains byte-stable after approved regeneration and another user cannot access it |

## Phase 05 Contracts

| ID | Exact inputs | Outputs and errors | Persistence/events | Required failing vector |
|---|---|---|---|---|
| P05-T01 | `ReportVersionId`, render version, immutable report content | `renderReportPdf(): Result<PdfArtifact, "PDF_RENDER_FAILED" | "PDF_FONT_MISSING" | "PDF_TEMP_CLEANUP_FAILED">` | Worker-local artifact only; no queue event or durable path | Vietnamese glyph fixture renders; failure removes temporary artifact and keeps HTML available |
| P05-T02 | `ReportPdfRequestedV1`, immutable report content, owner download request | PDF-and-Garage processor plus `ObjectStore.put/getMetadata/delete/createSignedDownload`; errors `GARAGE_UNAVAILABLE`, `ASSET_CHECKSUM_MISMATCH`, `ASSET_KEY_CONFLICT`, `ASSET_FORBIDDEN`, `SIGNED_URL_EXPIRED` | Reserved deterministic key stays in PostgreSQL; matching post-upload object is adopted on retry; asset `stored`, report `complete`, `report.asset.stored.v1`; retry exhaustion emits `report.fulfillment.failed.v1` | Post-upload DB failure then retry keeps one Garage object and one event; checksum conflict never overwrites; HTML remains available |
| P05-T03 | `StorageReplicationV1`, `StorageReconcileV1`, or `AssetDeletionV1` | Replication transition; errors `REPLICA_UNAVAILABLE`, `REPLICA_CHECKSUM_MISMATCH`, `REPLICA_DELETE_FAILED` | Replica state, attempts, tombstone; jobs from workflow map | Cloud outage leaves Garage success intact; retry reaches replicated; reconciliation is idempotent; deletion failure remains visible |
| P05-T04 | `ReportReadyEmailV1` or `ReportFailedEmailV1`; account email resolved inside worker | `EmailProvider.send(message, idempotencyKey)`; errors `SMTP_RETRYABLE`, `SMTP_ADDRESS_REJECTED`, `SMTP_CONFIG_INVALID` | Notification state and provider message ID; no report body or internal error in email | Duplicate job sends once; success email contains authenticated report link; failure email contains safe status/support link only |
| P05-T05 | Admin actor, reason code, order/report/support IDs, optional corrected profile revision | Audited commands; errors `ADMIN_FORBIDDEN`, `REGENERATION_POLICY_DENIED`, `CORRECTION_WINDOW_EXPIRED`, `REFUND_STATE_INVALID` | Support case, audit row, optional new report version and workflow event | Non-admin denied; same-person correction inside 24h creates superseding version without mutating old content |

## Phase 06 Contracts

| ID | Exact inputs | Outputs and errors | Persistence/events | Required failing vector |
|---|---|---|---|---|
| P06-T01 | `DEPLOY_ENV_FILE`, Compose files, host bind probe | `selectWebHostPort(range, outputPath): Result<number, "DEPLOY_ENV_FILE_MISSING" | "PORT_RANGE_INVALID" | "PORT_UNAVAILABLE" | "OUTPUT_PATH_INSIDE_REPOSITORY">`; every production Compose command consumes the same `--env-file` | Stable value in operator-owned env file outside Git; no Nginx mutation | First run selects unused high port; second run reuses it; unresolved `WEB_HOST_PORT` fails; private services have no host ports |
| P06-T02 | Actor/request metadata, endpoint policy, purge-eligible account | Rate-limit decision and purge result; errors `RATE_LIMITED`, `CSRF_INVALID`, `PURGE_NOT_ELIGIBLE`, `PURGE_INCOMPLETE` | Minimal retained transaction projection, audit row, asset deletion events | Purge before day 30 fails; eligible purge removes private data and creates deletion tombstones |
| P06-T03 | Measured staging peak, VPS inventory, backup destination, encryption config | Capacity verdict; PostgreSQL and Garage backup manifests; errors `CAPACITY_HEADROOM_INSUFFICIENT`, `BACKUP_FAILED`, `BACKUP_UNENCRYPTED`, `RESTORE_VERIFICATION_FAILED` | Encrypted offsite backup artifacts, checksums, drill evidence | Restore both PostgreSQL and Garage into isolated targets and verify report-to-object integrity |
| P06-T04 | Production-like Compose stack and controlled fixture/account/provider inputs | Machine-readable smoke result with step, duration, status, trace ID; errors identify exact failed dependency | Test-only orders/reports/assets cleaned by documented procedure | Full paid flow passes; AI/Redis/Garage/cloud/SMTP degraded vectors match specified state |
| P06-T05 | Fixture results, 20 report reviews, security evidence, runbooks, provider review, legal/accounting record | Release verdict `approved` or blocking findings; no waiver path for severity-1 | Signed QA and release records | Missing legal/accounting or AI due-diligence evidence returns blocked release |

## Phase 07 Contracts

| ID | Exact inputs | Outputs and errors | Persistence/events | Required failing vector |
|---|---|---|---|---|
| P07-T01 | Existing Zi Wei chart/evidence plus topic and period where required | Topic-specific report contract; errors `TOPIC_EVIDENCE_INSUFFICIENT`, `TOPIC_NOT_PUBLIC`, `TOPIC_PERIOD_INVALID` | Separate immutable report versions and catalog flags | Disabled OD-001 topic cannot create order; annual report without period provenance fails |
| P07-T02 | Normalized Unicode name parts and birth date | `calculateNumerology(input): Result<NormalizedNumerologyChartV1, "NAME_REQUIRED" | "DATE_INVALID">` | Optional saved calculation; formula version and privacy-safe event | VI diacritics normalize deterministically; 11/22/33 are not reduced incorrectly |
| P07-T03 | Actor, spread `daily | three_card`, question, stored or generated seed | `drawTarot(): Result<NormalizedTarotReadingV1, "DAILY_DRAW_EXISTS" | "QUESTION_INVALID" | "SPREAD_UNSUPPORTED">` | Immutable reading with seed, card IDs, orientations, order | Same seed replays exactly; second daily draw returns prior reading |
| P07-T04 | Date-selection query or zodiac birth date/timezone | Normalized utility result; errors `DATE_RANGE_INVALID`, `TIMEZONE_INVALID`, `UTILITY_SCOPE_UNSUPPORTED` | Optional saved query and privacy-safe analytics | Zodiac boundary fixture and unsupported auspicious-certainty field both enforce contract |

## Phase 08 Contracts

| ID | Exact inputs | Outputs and errors | Persistence/events | Required failing vector |
|---|---|---|---|---|
| P08-T01 | Audited Mingyu BaZi exports and dependency evidence | Method record containing exact input/output mapping, defaults, exclusions, and limitation IDs; error `METHOD_AMBIGUITY` blocks implementation | Documentation and dependency register only | Missing timezone/true-solar behavior or unresolved export fails Terra gate |
| P08-T02 | Eligible `ProfileRevisionId` and approved BaZi method version | `calculateBazi(): Result<{ chartId, chartVersionId }, "PROFILE_FORBIDDEN" | "BAZI_INPUT_UNSUPPORTED" | "ENGINE_FAILED" | "NORMALIZATION_INVALID">` | Immutable run and private raw snapshot | Repeated input/config returns one version; unexplained trusted-case mismatch blocks change |
| P08-T03 | BaZi chart/evidence versions and actor | Free BaZi view; errors `BAZI_CHART_FORBIDDEN`, `BAZI_EVIDENCE_INSUFFICIENT` | Evidence version and privacy-safe funnel event | UI shows method limitation and never uses Zi Wei terminology |
| P08-T04 | Founder-resolved SKU, BaZi chart/evidence/knowledge versions | `BaziReportV1`; common report errors plus `SKU_DECISION_OPEN` | Product catalog row, entitlement, immutable report workflow | Open OD-002 keeps catalog non-purchasable; valid paid flow reaches Garage/email once |

## Phase 09 Contracts

| ID | Exact inputs | Outputs and errors | Persistence/events | Required failing vector |
|---|---|---|---|---|
| P09-T01 | Audited Celestine exports and dependency evidence | Natal method record with zodiac, center, point set, houses, aspects/orbs, coordinates/time requirements, polar behavior; `METHOD_AMBIGUITY` blocks | Documentation and dependency register only | Solar Return or hidden location default in method record fails gate |
| P09-T02 | Exact-time/location profile and natal method version | `calculateWesternNatal(): Result<{ chartId, chartVersionId }, "LOCATION_REQUIRED" | "POLAR_LIMITATION" | "ENGINE_FAILED" | "NORMALIZATION_INVALID">` | Immutable natal run and private raw snapshot | Trusted ASC/MC/house fixture passes; invalid coordinates create no run |
| P09-T03 | Founder-resolved SKU, natal chart/evidence/knowledge versions | Free natal view and `WesternNatalReportV1`; errors `SKU_DECISION_OPEN`, `NATAL_EVIDENCE_INSUFFICIENT` plus common report errors | Catalog entry and common report workflow | Open OD-003 blocks order; output contains no Vedic or Solar Return claim |
| P09-T04 | Natal production metrics and audited predictive exports | Decision packet only; errors `INSUFFICIENT_STABILITY_EVIDENCE`, `PREDICTIVE_METHOD_UNVERIFIED` | Documentation and risk updates; no capability flag | Attempt to add route, contract, or adapter fails task scope review |

## Phase 10 Contracts

| ID | Exact inputs | Outputs and errors | Persistence/events | Required failing vector |
|---|---|---|---|---|
| P10-T01 | Audited Mingyu Liu Yao exports, reference methods, founder OD-004 answer | Method/cooldown record; error `COOLDOWN_DECISION_OPEN` blocks public release | Documentation and dependency register | Missing replay input or open OD-004 fails gate |
| P10-T02 | Manual six-line input or approved seeded method, question hash, cast time | `castIChing(): Result<NormalizedHexagramV1, "CAST_INPUT_INVALID" | "CAST_METHOD_UNSUPPORTED" | "ENGINE_FAILED">` | Immutable cast with complete replay data | Manual and seeded fixtures replay byte-equivalent normalized output |
| P10-T03 | Actor, normalized question, prior cast history, approved cooldown | `requestReading(): Result<IChingReadingV1, "QUESTION_INVALID" | "CAST_COOLDOWN_ACTIVE" | "EVIDENCE_INVALID" | "READING_SAFETY_REJECTED">` | Cast history, evidence, immutable reading | Same question inside cooldown returns prior cast and expiry, never a reroll |

## Phase 11 Contracts

| ID | Exact inputs | Outputs and errors | Persistence/events | Required failing vector |
|---|---|---|---|---|
| P11-T01 | Stability evidence for each candidate system, two-profile consent model, OD-005 answer | Compatibility readiness record and exact approved system set; errors `SOURCE_SYSTEM_UNSTABLE`, `COMPATIBILITY_DECISION_OPEN` | Documentation, capability metadata remains private until pass | Any selected system with open severity-1 or missing consent contract fails gate |
| P11-T02 | Actor, two authorized profile revisions, approved source evidence versions | `buildCompatibility(): Result<CompatibilityReportV1, "SECOND_PROFILE_CONSENT_REQUIRED" | "PROFILE_FORBIDDEN" | "SOURCE_EVIDENCE_MISSING" | "SYNTHESIS_UNSUPPORTED">` | Consent/access records and immutable common report workflow | Revoked second-profile consent blocks access; disagreement stays source-separated |
| P11-T03 | OD-006 utility selection, audited Mingyu export, exact utility input | `calculateFengshui(): Result<NormalizedFengshuiResultV1, "FENGSHUI_DECISION_OPEN" | "INPUT_INSUFFICIENT" | "METHOD_UNSUPPORTED">` | Immutable calculation/evidence version and capability flag | Non-selected utility and physical-commerce output both fail contract |
| P11-T04 | Measured module latency, CPU, memory, queue, failure, security, runtime, deployment data | Extraction decision packet; errors `NO_OPERATIONAL_JUSTIFICATION`, `ROLLBACK_UNDEFINED`, `DATA_OWNERSHIP_UNCLEAR` | Documentation and risk updates only; no deployment change | Any service/deployment file change fails task scope review |

## Review Rule

Terra rejects a task instruction when it omits:

1. its matching contract ID;
2. exact accepted input and output shape;
3. exact error codes;
4. persistence and event effects;
5. the named failing vector;
6. the focused pass command and expected result from the phase file.
