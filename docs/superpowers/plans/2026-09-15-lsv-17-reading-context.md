# LSV-17 Reading Context Contract, Persistence, and Personalization Handoff Implementation Plan

**Date:** 2026-09-15
**Ticket:** Kaneo LSV-17 (`v3dl93levb3q2jeoid7qssxq`)
**Status:** Planning milestone replan cycle (Cycle 2, Bounded Correction Pass). Product decision FD-078 is approved by founder Lãm. Implementation requires technical decision owner An's explicit technical approval of this plan under `AGENTS.md`. Visual UI implementation is deferred to the dedicated UI artifact branch per FD-024.

---

## 1. Status, Scope, and Approval Gates

### 1.1 Context and Purpose

The founder reviewed a live V4 comprehensive report and determined it lacked depth and personalization. In response, founder decision **FD-078** approved introducing two optional, single-choice context questions into the birth wizard (current life stage and top concern) formatted as tappable selection lists with clear skip options.

This implementation plan defines the complete architecture for reading context:
- **Contract Definition:** Strict, versioned enum codes (`ReadingContextV1`) decoupled from `BirthProfileV1Schema`. Astrological normalization, input hashes, and chart deduplication remain immutable.
- **Exact Backward-Compatible Request Contract:** A strict union (`BirthProfileCreateRequestV1Schema`) accepting either legacy raw `BirthProfileV1Schema` or a strict wrapper (`BirthProfileCreateWrapperV1Schema`), with a normalization helper converting both shapes before calling the composite domain service. Existing API success responses (`profileId`, `revisionId`, `ziweiEligibility`) are preserved exactly.
- **Additive Persistence & Foreign Key Integrity:** Additive tables `birth_profile_reading_context_revisions` (immutable history) and `birth_profile_reading_contexts` (current state pointer). The composite foreign key `(profile_id, current_revision_id)` uses `ON DELETE CASCADE`, not `SET NULL`. Revisions are append-only and never deleted individually; they disappear only under profile hard purge, where deleting current state is correct. Clearing context is an application `UPDATE` setting `current_revision_id = NULL` and incrementing `state_version`, which is valid in PostgreSQL because composite foreign keys with a null component are not checked under standard `MATCH SIMPLE`.
- **Skip vs. Persist Semantics:** Skipping in the wizard creates zero reading context rows. `GET` for an active profile without a current-state row returns `{ context: null, stateVersion: 0 }`. The first subsequent `SET` requires `expectedStateVersion: 0` and atomically inserts revision 1 and the current-state row with `stateVersion: 1` using insert/CAS semantics.
- **Advisory Locking & Durable Mutation Receipts:**
  - All reading-context mutations per profile are serialized using a transaction-scoped PostgreSQL advisory lock keyed by the profile ID (`SELECT pg_advisory_xact_lock(hashtext('reading_context:' || :profileId))`), following the repository's established commerce locking pattern.
  - Planned table `birth_profile_reading_context_mutation_receipts` records mutation receipts keyed by `(profile_id, idempotency_key)`.
  - Canonical request fingerprints are computed as `SHA-256` over an unambiguous fixed-position JSON tuple `[1, commandType, expectedStateVersion, lifeStage ?? null, topConcern ?? null]`. The fingerprint strictly excludes actor IDs, request IDs, timestamps, or secret material.
  - Active profile owner authority is revalidated before receipt replay. Same key + same fingerprint replays the original stored result even after newer mutations have progressed `stateVersion`; same key + different fingerprint returns `IDEMPOTENCY_KEY_REUSED`.
  - Concurrent first SETs with different keys serialize on the advisory lock: the winner advances state 0 to 1, and the loser encounters a state version mismatch and returns `READING_CONTEXT_CONFLICT` without creating duplicate revisions or audits.
- **Anti-Enumeration Boundary:** Unified `PROFILE_NOT_FOUND` (HTTP 404) across nonexistent, foreign, archived, or expired anonymous profiles.
- **Repository Lifecycle Fence Before EVERY Provider Call (Live V2 Job Contract):**
  - Against the current baseline, extend `ReportGenerationRequestedV2Schema` with optional nullable `readingContextRevisionId`. All new V4 reservations set it explicitly to ID or null; existing queued V2 payloads without the property default to legacy null (no V3 invented).
  - `report_reservations.reading_context_revision_id` references the revision by ID with `ON DELETE SET NULL`.
  - The worker and generation service execute a repository lifecycle fence that loads the reservation under the existing report-version/active-job fence and joins its `chart_version_id` through `ziwei_chart_versions` -> `ziwei_charts` -> `birth_profiles`.
  - The fence distinguishes:
    1. **Hard purge:** chart/profile ownership chain no longer exists -> non-retryable `REPORT_PROFILE_PURGED`, bounded status/audit evidence, no next provider call.
    2. **Soft archive:** profile row still exists with `deleted_at` set -> an already-created reservation is allowed to continue.
    3. **Active source:** continues only when normalized payload `readingContextRevisionId` (missing legacy V2 property normalizes to null) equals the reservation's frozen ID. If the context FK was nulled independently under hard purge, lifecycle failure wins (`REPORT_PROFILE_PURGED`). If profile/source is present but payload/reservation context differs, return a distinct non-retryable `REPORT_CONTEXT_MISMATCH` and do not call provider.
  - This fence is invoked immediately before **EVERY** configured AI-provider-backed operation in the current V2/V4 path: initial writer, initial critic, bounded rewrite writer, rewrite re-critic, and any repeated section/provider calls introduced by merged LSV-15.
- **Free-Preview Purge Boundary:** Verified fact: current `buildGuardedFreeIdentityPreview` is synchronous and has no persisted checkpoints. This plan defines equivalent lifecycle revalidation requirements for future asynchronous checkpoint provider calls under LSV-15 / FD-068.
- **Sanitized Audit Logging:** Audit logs record opaque identifiers, actions, presence flags (`hasLifeStage`, `hasTopConcern`), state versions, and request IDs. Invariant: audit logs strictly exclude enum values and mutation receipt fingerprints.
- **Account Export & Privacy:** Complete context revision history included in account privacy export (capped at 100 entries, failing closed with `ACCOUNT_EXPORT_LIMIT_EXCEEDED` on overflow). Property denylists prevent leakage to third-party analytics (FD-053).

### 1.2 Scope

1. **Contracts (`packages/contracts`):**
   - Define `LifeStageV1Schema`, `TopConcernV1Schema`, `ReadingContextV1Schema`, `SetReadingContextRequestV1Schema`, `ClearReadingContextRequestV1Schema`, `BirthProfileCreateWrapperV1Schema`, `BirthProfileCreateRequestV1Schema`, and normalizer `normalizeBirthProfileCreateRequest`.
   - Extend live `ReportGenerationRequestedV2Schema` in `packages/contracts/src/jobs.ts` with optional nullable `readingContextRevisionId`.
   - Update `AccountExportProfileV1Schema` to include reading context history up to 100 entries.
2. **Database & Persistence (`packages/database`):**
   - Create `birth_profile_reading_context_revisions` with composite unique `(profile_id, id)` and `(profile_id, revision_number)`.
   - Create `birth_profile_reading_contexts` with composite FK `(profile_id, current_revision_id)` on delete cascade, nullable `current_revision_id`, `state_version`, and `last_revision_number`.
   - Create `birth_profile_reading_context_mutation_receipts` keyed by `(profile_id, idempotency_key)` with canonical request fingerprint, result metadata, and cascade to `birth_profiles.id`.
   - Add `reading_context_revision_id` to `report_reservations` referencing context revisions with `ON DELETE SET NULL`.
3. **Backend Service & Repositories (`packages/backend`):**
   - Refactor `BirthProfileRepository` to provide `createWithContext()` managing atomic creation of profile, profile revision 1, context revision 1, current state, and initial mutation receipt in a single transaction.
   - Implement `ReadingContextRepository` and `ReadingContextService` with transaction-scoped advisory locking, CAS optimistic locking, mutation receipt persistence, and durable idempotency replay.
   - Extend `commerce.repository.ts` to capture active reading context revision ID when creating report reservations.
   - Implement the repository lifecycle fence in `report-generation.service.ts` and worker processor `report-generate.processor.ts` joining through `ziwei_chart_versions` -> `ziwei_charts` -> `birth_profiles` before each writer/critic AI provider dispatch.
4. **API Endpoints (`apps/api`):**
   - Update `POST /birth-profiles` to validate `BirthProfileCreateRequestV1Schema` and normalize input.
   - Implement `GET /birth-profiles/:profileId/reading-context`, `PUT /birth-profiles/:profileId/reading-context` (full replacement), and `POST /birth-profiles/:profileId/reading-context/clear` with uniform `PROFILE_NOT_FOUND` anti-enumeration.
5. **Web Headless Integration (`apps/web`):**
   - Update `saveBirthProfile` to submit the wrapper format and preserve exact response properties.
   - Define non-visual draft state interface for LSV-6 autosave and OAuth resume.
6. **Account Center & Privacy:**
   - Populate context history in account export (max 100).
   - Enforce telemetry denylists against analytics sinks.

### 1.3 Non-Goals

- **No modification to BirthProfileV1Schema:** `BirthProfileV1Schema` remains `.strict()`. Astrological normalization, input hashes, and chart deduplication must not include reading context.
- **No chart recalculation:** Updating reading context never triggers a new calculation run, engine calculation, or chart version.
- **No free-form text:** Only strict predefined enum codes are permitted; no custom text, user notes, or arbitrary tags.
- **No visual UI implementation:** All visual layouts, styling, components, and CSS must wait for the approved UI artifact branch per FD-024.
- **No commercial or pricing alterations:** Reading context must never affect tier prices, Lá balances, or entitlement validity.
- **No third-party analytics disclosure:** Reading context must never be sent to external tracking tools, pixels, or marketing SDKs (FD-053).
- **No static migration reservation:** Migration numbers are allocated dynamically at implementation time.
- **No production deployment or overnight migration:** This plan does not authorize executing migrations or deploying to production.

### 1.4 Binding Decisions

| Decision | Date | Summary | Impact on LSV-17 |
|---|---|---|---|
| **FD-020** | 2026-08-31 | Purge unlinked anonymous birth profile and chart data after 24 hours. | Reading context rows cascade-delete with the birth profile. Anonymous linking transfers context ownership automatically. |
| **FD-024** | 2026-09-01 | Defer user-facing UI to a dedicated artifact branch. | Non-visual branch implements contracts, backend, headless state, and API. Visual rendering waits for the approved UI branch (LSV-21). |
| **FD-053** | 2026-09-09 | Third-party analytics must never receive personal data, names, or birth details. | Reading context is strictly internal and excluded from third-party analytics. Configured AI provider receives enum codes for report generation only. |
| **FD-068** | 2026-09-13 | Generate personalized free preview sections based on customer interest. | Reading context `topConcern` informs which palace/theme section is pre-generated. |
| **FD-078** | 2026-09-13 | Add two optional context questions to the wizard as a list picker with skip options; store as separate `ReadingContextV1`. | Direct authority for this ticket: exact enum values, separate storage, enum-only prompt injection. |
| **FD-081** | 2026-09-13 | Identified account-linked tracking via wizard consent. | Reading context is stored under first-party account/profile data, but remains strictly excluded from third-party analytics tools. |
| **FD-082** | 2026-09-14 | Natural professional referral advice allowed in V4 reports. | Prompt rules regarding referral advice remain independent of reading context. |

### 1.5 Approval Gates

1. **Terra Milestone Review:** Independent audit of this plan against binding sources and repository invariants.
2. **Technical Architecture Approval:** Explicit written approval from technical decision owner An before implementation starts.
3. **UI Artifact Approval:** Sign-off from founder Lãm on the visual UI artifact before visual UI implementation merges.
4. **Implementation & Verification:** Full verification across all test suites, migrations, and characterization fixtures.
5. **Deployment Authorization:** Technical owner An's explicit authorization for migration execution and staging/production release.

---

## 2. Strict Versioned ReadingContextV1 Contract

### 2.1 Domain Enums and Values

Following FD-078, the domain uses two strict enums. Only exact lowercase string codes are stored and passed.

#### Question 1: `lifeStage` ('Hiện tại bạn đang…')

| Code | Vietnamese Label | English Reference |
|---|---|---|
| `studying` | Đang đi học | Studying / Student |
| `early_career` | Mới đi làm (dưới 3 năm) | Early career (< 3 years) |
| `established_career` | Đi làm lâu năm | Established career |
| `business_owner` | Tự kinh doanh, làm chủ | Business owner / Entrepreneur |
| `between_paths` | Đang nghỉ hoặc tìm hướng đi mới | In transition / Seeking new path |
| `retired` | Đã nghỉ hưu | Retired |

#### Question 2: `topConcern` ('Điều bạn quan tâm nhất lúc này')

| Code | Vietnamese Label | English Reference |
|---|---|---|
| `career` | Công việc, sự nghiệp | Career & work |
| `money` | Tiền bạc | Finances & wealth |
| `love` | Tình cảm, hôn nhân | Love & marriage |
| `family` | Gia đình, con cái | Family & children |
| `wellbeing` | Sức khỏe, tinh thần | Health & wellbeing |
| `self_understanding` | Hiểu rõ bản thân | Self understanding & personal growth |

### 2.2 Zod Schema Definitions

Located in planned file `packages/contracts/src/reading-context-v1.ts`:

```typescript
import { z } from "zod";
import { BirthProfileV1Schema, type BirthProfileV1 } from "./birth-profile-v1.js";

export const LifeStageV1Schema = z.enum([
  "studying",
  "early_career",
  "established_career",
  "business_owner",
  "between_paths",
  "retired",
]);
export type LifeStageV1 = z.infer<typeof LifeStageV1Schema>;

export const TopConcernV1Schema = z.enum([
  "career",
  "money",
  "love",
  "family",
  "wellbeing",
  "self_understanding",
]);
export type TopConcernV1 = z.infer<typeof TopConcernV1Schema>;

/**
 * Strict versioned ReadingContextV1 contract.
 * Represents a saved reading context record.
 * At least one field (lifeStage or topConcern) must be selected.
 */
export const ReadingContextV1Schema = z
  .object({
    version: z.literal(1),
    lifeStage: LifeStageV1Schema.optional(),
    topConcern: TopConcernV1Schema.optional(),
  })
  .strict()
  .refine(
    (data) => data.lifeStage !== undefined || data.topConcern !== undefined,
    "At least one reading context field (lifeStage or topConcern) must be selected",
  );
export type ReadingContextV1 = z.infer<typeof ReadingContextV1Schema>;

/**
 * Mutation input for full replacement of reading context (PUT).
 * Omitted optional fields represent skipped/cleared questions.
 * expectedStateVersion is nonnegative: 0 for the first set on an uninitialized/skipped profile,
 * or the positive current stateVersion for subsequent replacements.
 */
export const SetReadingContextRequestV1Schema = z
  .object({
    version: z.literal(1),
    lifeStage: LifeStageV1Schema.optional(),
    topConcern: TopConcernV1Schema.optional(),
    expectedStateVersion: z.number().int().nonnegative(),
    idempotencyKey: z.string().trim().min(1).max(128),
  })
  .strict()
  .refine(
    (data) => data.lifeStage !== undefined || data.topConcern !== undefined,
    "At least one reading context field must be selected in PUT replacement",
  );
export type SetReadingContextRequestV1 = z.infer<
  typeof SetReadingContextRequestV1Schema
>;

/**
 * Mutation input for explicit full clear command (POST .../clear).
 * Clear requires an existing initialized context, so expectedStateVersion must be positive.
 */
export const ClearReadingContextRequestV1Schema = z
  .object({
    version: z.literal(1),
    expectedStateVersion: z.number().int().positive(),
    idempotencyKey: z.string().trim().min(1).max(128),
  })
  .strict();
export type ClearReadingContextRequestV1 = z.infer<
  typeof ClearReadingContextRequestV1Schema
>;

/**
 * Wrapper request schema for saving a birth profile with optional initial reading context.
 */
export const BirthProfileCreateWrapperV1Schema = z
  .object({
    profile: BirthProfileV1Schema,
    readingContext: ReadingContextV1Schema.optional(),
  })
  .strict();
export type BirthProfileCreateWrapperV1 = z.infer<
  typeof BirthProfileCreateWrapperV1Schema
>;

/**
 * Strict union accepting either legacy raw BirthProfileV1Schema OR wrapper with optional context.
 * Exported for API request validation in POST /birth-profiles.
 */
export const BirthProfileCreateRequestV1Schema = z.union([
  BirthProfileCreateWrapperV1Schema,
  BirthProfileV1Schema,
]);
export type BirthProfileCreateRequestV1 = z.infer<
  typeof BirthProfileCreateRequestV1Schema
>;

/**
 * Normalization helper converting either request shape into canonical { profile, readingContext? }
 * before passing into the composite domain service.
 */
export function normalizeBirthProfileCreateRequest(
  input: BirthProfileCreateRequestV1,
): { profile: BirthProfileV1; readingContext?: ReadingContextV1 } {
  if ("profile" in input) {
    return {
      profile: input.profile,
      readingContext: input.readingContext,
    };
  }
  return {
    profile: input,
    readingContext: undefined,
  };
}

/**
 * Reading context record returned by API and services.
 * stateVersion is 0 when uninitialized/skipped, or positive when initialized.
 */
export const ReadingContextRecordV1Schema = z
  .object({
    profileId: z.string().trim().min(1),
    revisionId: z.string().trim().min(1).nullable(),
    revisionNumber: z.number().int().positive().nullable(),
    stateVersion: z.number().int().nonnegative(),
    lifeStage: LifeStageV1Schema.nullable(),
    topConcern: TopConcernV1Schema.nullable(),
    createdAt: z.string().datetime({ offset: true }).nullable(),
    updatedAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();
export type ReadingContextRecordV1 = z.infer<
  typeof ReadingContextRecordV1Schema
>;
```

### 2.3 Canonical Fingerprint Specification

The deterministic request fingerprint stored in `birth_profile_reading_context_mutation_receipts` is computed using `SHA-256` over an unambiguous, fixed-position JSON tuple:

```typescript
import { createHash } from "node:crypto";

export function computeReadingContextFingerprint(
  commandType: "set" | "clear",
  expectedStateVersion: number,
  context?: { lifeStage?: LifeStageV1 | null; topConcern?: TopConcernV1 | null },
): string {
  const canonical = JSON.stringify([
    1,
    commandType,
    expectedStateVersion,
    context?.lifeStage ?? null,
    context?.topConcern ?? null,
  ] as const);
  return createHash("sha256").update(canonical).digest("hex");
}
```

#### Fixed Tuple Positions and JSON Primitive/Null Encoding
- **Fixed Position Indexing:**
  - Index `0`: Schema version (fixed integer `1`).
  - Index `1`: Command type string (`"set"` | `"clear"`).
  - Index `2`: Monotonic integer `expectedStateVersion`.
  - Index `3`: Normalized `lifeStage` (valid enum string or primitive `null`).
  - Index `4`: Normalized `topConcern` (valid enum string or primitive `null`).
- **No Replacer Array:** `JSON.stringify` is invoked directly on the 5-element tuple without a property replacer array. In standard JSON serialization (RFC 8259 / ECMA-404), array element ordering is strictly fixed by index position. Passing property replacers on nested structures is avoided, eliminating nested property filtering hazards or key reordering issues.
- **Deterministic Primitive & Null Encoding:** Primitives (numbers and ASCII strings) and `null` have deterministic, canonical representations without whitespace or formatting divergence.
- **Normalized Null Equivalence:** Context properties omitted or submitted as `undefined` are coerced via `?? null` to explicit JSON `null`, ensuring identical canonical serialization whether a field is omitted or explicitly set to `null`.
- **Strict Exclusion:** The fingerprint strictly captures domain command inputs. It must **never** include actor IDs, user IDs, request/trace IDs, timestamps, session tokens, or secret material.

#### Verification Obligations
Unit test suite `packages/contracts/src/reading-context-v1.test.ts` must explicitly prove:
1. **Enum Sensitivity:** Every distinct allowed enum value for `lifeStage` (`studying`, `early_career`, `established_career`, `business_owner`, `between_paths`, `retired`) and `topConcern` (`career`, `money`, `love`, `family`, `wellbeing`, `self_understanding`) produces a distinct, unique SHA-256 hash.
2. **Normalization Equivalence:** An omitted optional field (`undefined`) and an explicitly normalized `null` value produce the identical canonical serialization tuple and identical hash while at least one valid selection remains (e.g., `{ lifeStage: "early_career" }` vs. `{ lifeStage: "early_career", topConcern: null }`, or `{ topConcern: "money" }` vs. `{ lifeStage: null, topConcern: "money" }`). Canonical null representation for clear commands (where both context fields evaluate to `null` alongside `commandType: "clear"`) is tested separately under clear-command semantics.
3. **Control Field Sensitivity:** Any change to schema version (`1`), command type (`"set"` vs. `"clear"`), or `expectedStateVersion` (e.g., `0` vs. `1`) produces a distinct, unique SHA-256 hash.
4. **Stability:** Multiple computations on the same normalized request inputs consistently produce the exact same hex digest across runs and execution contexts.

### 2.4 Skip vs. Persist Semantics

- **Skipping in Wizard:** When a user skips both questions in the wizard, `readingContext` is omitted or submitted as `undefined`. The system creates the birth profile normally with **zero rows** in `birth_profile_reading_contexts`, `birth_profile_reading_context_revisions`, and `birth_profile_reading_context_mutation_receipts`.
- **GET on Uninitialized Profile:** `GET /birth-profiles/:profileId/reading-context` for an active profile with no current-state row returns `{ context: null, stateVersion: 0 }` (or domain equivalent with `stateVersion: 0`, `revisionId: null`, `lifeStage: null`, `topConcern: null`).
- **First Later SET:** To initialize reading context on a profile where it was skipped, the client sends `PUT /birth-profiles/:profileId/reading-context` with `expectedStateVersion: 0`. The repository atomically creates revision 1 and inserts the current-state row with `stateVersion: 1` and `lastRevisionNumber: 1`.
- **Partial Selection:** If the user answers one question and skips the other, the answered field is populated and the other is `undefined` (or `null`). This satisfies the refinement requirement.
- **Full Replacement (PUT):** `PUT /birth-profiles/:profileId/reading-context` performs a full replacement. Any omitted field is cleared in the newly created revision. At least one field must remain selected.
- **Full Clear Command (POST .../clear):** To clear all reading context, the client calls `POST /birth-profiles/:profileId/reading-context/clear`. This updates the current-state row setting `currentRevisionId = NULL` and incrementing `stateVersion`, while leaving all historical revisions immutable and retaining the concurrency state.

---

## 3. Persistence Design and Lifecycle Architecture

### 3.1 Decoupling from Birth Profile Calculation Identity

In Lá Số Việt, astronomical calculation and chart normalization are strictly deterministic and immutable:
- `BirthProfileV1Schema` is `.strict()` and captures only astrological coordinates (calendar, time, timezone, place, gender, consent).
- `birth_profile_revisions` drives `calculation_runs` and `input_hash`.
- `ziwei_charts` and `ziwei_chart_versions` are pinned to a specific `profile_revision_id`.

Reading context represents subjective, transient life-situation context used solely for editorial framing, example selection, and emphasis. It has **zero** bearing on planetary positions, palace stars, or astrological facts. Therefore:
- Reading context is **never** added to `BirthProfileV1Schema` or `birth_profile_revisions`.
- Updating reading context does **not** create a new `birth_profile_revisions` row.
- Updating reading context does **not** invalidate or recompute `calculation_runs` or `ziwei_charts`.

### 3.2 Database Schema with Cascade Integrity and Durable Receipts

Three additive PostgreSQL tables will be introduced under `packages/database/src/schema/birth-profile.ts`:

```typescript
import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { birthProfiles } from "./birth-profile.js";

/**
 * Immutable, append-only history of reading context revisions.
 */
export const birthProfileReadingContextRevisions = pgTable(
  "birth_profile_reading_context_revisions",
  {
    id: text("id").primaryKey(), // UUID
    profileId: text("profile_id")
      .notNull()
      .references(() => birthProfiles.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    lifeStage: text("life_stage"),
    topConcern: text("top_concern"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("reading_context_revisions_profile_id_id_unique").on(
      table.profileId,
      table.id,
    ),
    uniqueIndex("reading_context_revisions_profile_revision_idx").on(
      table.profileId,
      table.revisionNumber,
    ),
    index("reading_context_revisions_profile_id_idx").on(table.profileId),
    check(
      "reading_context_at_least_one",
      sql`num_nonnulls(${table.lifeStage}, ${table.topConcern}) >= 1`,
    ),
    check(
      "reading_context_valid_life_stage",
      sql`${table.lifeStage} IS NULL OR ${table.lifeStage} IN ('studying', 'early_career', 'established_career', 'business_owner', 'between_paths', 'retired')`,
    ),
    check(
      "reading_context_valid_top_concern",
      sql`${table.topConcern} IS NULL OR ${table.topConcern} IN ('career', 'money', 'love', 'family', 'wellbeing', 'self_understanding')`,
    ),
  ],
);

/**
 * Current reading context state per birth profile.
 * Composite FK (profile_id, current_revision_id) uses ON DELETE CASCADE.
 * Context revisions are append-only and never deleted individually; they disappear
 * only under profile hard purge, where deleting current state is correct.
 * Current-state clear is an application UPDATE setting current_revision_id = NULL,
 * which PostgreSQL does not check under standard MATCH SIMPLE.
 * Note: lastIdempotencyKey is removed in favor of durable mutation receipts.
 */
export const birthProfileReadingContexts = pgTable(
  "birth_profile_reading_contexts",
  {
    profileId: text("profile_id")
      .primaryKey()
      .references(() => birthProfiles.id, { onDelete: "cascade" }),
    currentRevisionId: text("current_revision_id"), // Nullable when cleared
    stateVersion: integer("state_version").notNull().default(1),
    lastRevisionNumber: integer("last_revision_number").notNull().default(0),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.profileId, table.currentRevisionId],
      foreignColumns: [
        birthProfileReadingContextRevisions.profileId,
        birthProfileReadingContextRevisions.id,
      ],
      name: "birth_profile_reading_contexts_same_profile_fk",
    }).onDelete("cascade"),
    index("reading_contexts_current_revision_idx").on(
      table.currentRevisionId,
    ),
  ],
);

/**
 * Durable mutation receipts table for reading context mutations.
 * Keyed by (profile_id, idempotency_key). Replays deterministic results across
 * retries and rejects conflicting payloads under the same key with IDEMPOTENCY_KEY_REUSED.
 */
export const birthProfileReadingContextMutationReceipts = pgTable(
  "birth_profile_reading_context_mutation_receipts",
  {
    profileId: text("profile_id")
      .notNull()
      .references(() => birthProfiles.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    commandType: text("command_type").notNull(), // 'set' | 'clear'
    requestFingerprint: text("request_fingerprint").notNull(), // SHA-256 of canonical request payload
    resultStateVersion: integer("result_state_version").notNull(),
    resultRevisionId: text("result_revision_id"), // Nullable for clear
    resultRevisionNumber: integer("result_revision_number"), // Nullable for clear
    resultKind: text("result_kind").notNull(), // 'created' | 'updated' | 'cleared'
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.profileId, table.idempotencyKey],
      name: "reading_context_mutation_receipts_pk",
    }),
    index("reading_context_mutation_receipts_profile_idx").on(table.profileId),
  ],
);
```

### 3.3 Concurrency Architecture, Advisory Locking, and State Transitions

#### 3.3.1 Transaction-Scoped Advisory Locking Protocol

All reading-context mutations per profile are serialized using a transaction-scoped PostgreSQL advisory lock keyed by the profile ID:
```sql
SELECT pg_advisory_xact_lock(hashtext('reading_context:' || :profileId));
```
This lock is held for the duration of the database transaction and automatically released upon commit or rollback, following the repository's established commerce locking pattern (`packages/backend/src/commerce/commerce.repository.ts`).

Inside the locked transaction:
1. **Acquire Advisory Lock:** Block until the profile lock is granted.
2. **Revalidate Owner/Active Profile Authority:**
   Verify that `birthProfiles` exists, is active (`isNull(deletedAt)`), and matches the caller (`userId` for accounts, or non-expired `anonymousActorId` for anonymous actors). If invalid, abort and return uniform `PROFILE_NOT_FOUND` (HTTP 404).
3. **Lookup Existing Receipt:**
   Query `birth_profile_reading_context_mutation_receipts` where `profile_id = :profileId AND idempotency_key = :idempotencyKey`.
   - **Receipt Found:**
     - Compare `receipt.requestFingerprint === computedFingerprint`.
     - If fingerprints match: replay the original stored result using `resultStateVersion`, `resultRevisionId`, and `resultRevisionNumber`. Current state is not modified, no revision is created, and no duplicate audit log is written—**even if subsequent mutations have advanced `stateVersion`**.
     - If fingerprints mismatch: return `IDEMPOTENCY_KEY_REUSED` (HTTP 409 / 422).
4. **Evaluate Current State:**
   If no receipt exists, query `birth_profile_reading_contexts` for `profileId`.
   - If no row exists: `currentStateVersion = 0`, `lastRevisionNumber = 0`.
   - If row exists: `currentStateVersion = row.stateVersion`, `lastRevisionNumber = row.lastRevisionNumber`.
5. **CAS State Version Validation:**
   - If `currentStateVersion !== expectedStateVersion`:
     Return `READING_CONTEXT_CONFLICT` (HTTP 409) without creating any revision, updating state, or writing audit logs.
   - If `currentStateVersion === expectedStateVersion`:
     - If `currentStateVersion === 0` (initial set):
       Insert revision 1 (`revisionNumber = 1`).
       Insert current-state row (`currentRevisionId = rev1.id, stateVersion = 1, lastRevisionNumber = 1`).
       `resultKind = "created"`.
     - If `currentStateVersion > 0` and command is `set` (replacement update):
       Insert revision `lastRevisionNumber + 1`.
       Update current-state row (`currentRevisionId = newRev.id, stateVersion = stateVersion + 1, lastRevisionNumber = lastRevisionNumber + 1`).
       `resultKind = "updated"`.
     - If `currentStateVersion > 0` and command is `clear`:
       Update current-state row (`currentRevisionId = NULL, stateVersion = stateVersion + 1`).
       `resultKind = "cleared"`.
     - Append bounded audit log (`birth_profile.reading_context.created`, `updated`, or `cleared`) with sanitized presence flags.
     - Persist the immutable mutation receipt in `birth_profile_reading_context_mutation_receipts`.
6. **Commit Transaction.**

#### 3.3.2 Concurrency Scenarios and Transitions

1. **Concurrent First SET with Same Key and Same Fingerprint:**
   - Client sends two identical first SET requests concurrently (`expectedStateVersion: 0`, Key K1, identical payload).
   - Transaction 1 acquires the advisory lock, finds no receipt, validates `currentStateVersion === 0`, creates revision 1, sets `stateVersion = 1`, persists receipt K1, and commits.
   - Transaction 2 waits on the advisory lock. Once acquired, it revalidates authority, queries receipts for K1, finds the newly committed receipt, verifies matching fingerprint, and replays the committed receipt (`stateVersion: 1`, revision 1). Zero duplicate revisions or audits created.
2. **Concurrent First SET with Same Key but Different Fingerprint:**
   - Transaction 1 sends Key K1 for `career`, acquires lock, and commits state 1.
   - Transaction 2 sends Key K1 for `money`, waits on lock, acquires lock, finds receipt K1, detects fingerprint mismatch, and returns `IDEMPOTENCY_KEY_REUSED`.
3. **Concurrent First SET with Different Keys and Expected State 0 (Winner / Loser):**
   - Client sends Request A (Key KA, `expectedStateVersion: 0`) and Request B (Key KB, `expectedStateVersion: 0`) concurrently.
   - Transactions serialize on the advisory lock.
   - Winner (Transaction A) acquires lock first, finds `currentStateVersion === 0`, creates revision 1, advances state to 1, persists receipt KA, and commits.
   - Loser (Transaction B) acquires lock second. Checks receipt for KB (none found). Evaluates current state: finds `currentStateVersion = 1`, which does not match `expectedStateVersion: 0`. Transaction B returns `READING_CONTEXT_CONFLICT` without creating revision or audit log.
4. **Duplicate Older-Key Replay After Newer Mutation:**
   - Client executes Key A (`stateVersion` 1 -> 2).
   - Client executes Key B (`stateVersion` 2 -> 3).
   - Client retries Key A with identical payload.
   - Transaction acquires advisory lock, validates authority, looks up receipt KA, verifies matching fingerprint, and replays original result (`stateVersion: 2`, revision from Key A). Current state remains 3; zero revisions or audits created.
5. **Key Reused with Mismatched Payload on Existing State:**
   - Client executes Key A for `career`.
   - Client later submits Key A for `love`.
   - Fingerprint comparison fails; service returns `IDEMPOTENCY_KEY_REUSED`.
6. **Duplicate Clear Replay:**
   - Retrying Key C with clear replays the original cleared result without updating state or emitting audits.
7. **Stale Update or Stale Clear:**
   - If `state_version !== expectedStateVersion`, CAS fails; transaction returns `READING_CONTEXT_CONFLICT`.
8. **Clear -> Re-set Transition:**
   - After clearing (`stateVersion` 2 -> 3, `currentRevisionId = NULL`, `lastRevisionNumber = 1`), client calls `PUT` with `expectedStateVersion: 3`.
   - Revision allocated is `lastRevisionNumber + 1 = 2`.
   - Transaction sets `currentRevisionId = rev2.id, stateVersion = 4, lastRevisionNumber = 2`. Re-set succeeds cleanly.

### 3.4 Ownership, Retention, and Cascade Lifecycle

- **Anonymous 24-Hour Expiry (FD-020):**
  When `purgeExpired` or `deleteNow` in `anonymous-retention.repository.ts` deletes an expired `authAnonymousActors` row, PostgreSQL cascades:
  `authAnonymousActors` -> `birth_profiles` -> `birth_profile_reading_contexts`, `birth_profile_reading_context_revisions`, and `birth_profile_reading_context_mutation_receipts`.
  All context rows and receipts are completely deleted with zero orphan rows.
- **Account Deletion (FD-015):**
  When a 30-day account deletion grace period completes and `authUsers` is deleted, the cascade flows through `birth_profiles` down to all three reading context tables.
- **Anonymous to Account Linking:**
  When an anonymous user registers, `linkAnonymousActorToAccount()` updates `birth_profiles.userId = userId` and nulls `anonymousActorId`. The `birth_profiles.id` is unchanged; all context revisions, receipts, and current state transfer to the authenticated user with zero data duplication.
- **Profile Archival (Soft Deletion):**
  When a user archives a profile, `birth_profiles.deletedAt` is set. Context repository queries enforce `isNull(birthProfiles.deletedAt)`, returning `PROFILE_NOT_FOUND` for all context operations.

---

## 4. API, Service, and Repository Boundaries

### 4.1 Composite Atomicity and Repository Refactoring

In the live repository, `BirthProfileRepository.create()` internally owns its database transaction. It cannot be composed with external context creation simply by passing an optional transaction.

**Domain Refactoring:**
Refactor `packages/backend/src/birth-profile/birth-profile.repository.ts` and `birth-profile.service.ts` to expose a dedicated atomic composite creation method:
```typescript
export type BirthProfileWithContextWriteInput = {
  actor: CurrentActor;
  originalInput: BirthProfileV1;
  normalized: NormalizedBirthProfileV1;
  readingContext?: ReadingContextV1;
  now: Date;
};
```
Within a single database transaction managed by `BirthProfileRepository.createWithContext()`:
1. Validate anonymous actor status and expiry if anonymous.
2. Insert `birth_profiles` row.
3. Insert `birth_profile_revisions` row (revision 1).
4. If `readingContext` is provided:
   - Insert `birth_profile_reading_context_revisions` (revisionNumber = 1).
   - Insert `birth_profile_reading_contexts` (`currentRevisionId = rev1.id, stateVersion = 1, lastRevisionNumber = 1`).
   - If `actor.requestId` or idempotency key is present, compute canonical fingerprint and record initial mutation receipt.
   - Append audit log for `birth_profile.reading_context.created` (with sanitized presence flags).
5. Append audit log for `birth_profile.created`.
6. Commit transaction atomically.

If any insert or constraint fails, the transaction rolls back completely. Profile creation is **never** reported successful if declared reading context fails to persist.

**Response Preservation Invariant:**
The composite creation method preserves the exact existing success response shape:
```typescript
{
  profileId: string;
  revisionId: string;
  revisionNumber: number;
  originalInput: BirthProfileV1;
  normalizedInput: Record<string, unknown>;
  normalizationWarnings: string[];
  limitations: string[];
  ziweiEligibility: ZiweiEligibilityV1;
}
```
Anonymous expiry (`expiresAt`) is added exclusively by the web BFF layer (`apps/web/src/features/birth-profile/save-birth-profile.ts`) as it is today.

### 4.2 Reading Context Repository Layer

Planned file `packages/backend/src/birth-profile/reading-context.repository.ts`:

```typescript
export type ReadingContextCurrentRecord = {
  profileId: string;
  revisionId: string | null;
  revisionNumber: number | null;
  stateVersion: number;
  lifeStage: LifeStageV1 | null;
  topConcern: TopConcernV1 | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type MutationReceiptRecord = {
  profileId: string;
  idempotencyKey: string;
  commandType: string;
  requestFingerprint: string;
  resultStateVersion: number;
  resultRevisionId: string | null;
  resultRevisionNumber: number | null;
  resultKind: string;
  createdAt: Date;
};

export type ReadingContextRepository = {
  getCurrent(profileId: string): Promise<ReadingContextCurrentRecord | null>;
  getRevision(profileId: string, revisionId: string): Promise<ReadingContextRecord | null>;
  listRevisions(profileId: string): Promise<ReadingContextRecord[]>;
  getReceipt(profileId: string, idempotencyKey: string): Promise<MutationReceiptRecord | null>;
  mutateContextWithAdvisoryLock(
    profileId: string,
    operation: {
      commandType: "set" | "clear";
      context?: ReadingContextV1;
      expectedStateVersion: number;
      idempotencyKey: string;
      requestFingerprint: string;
      now: Date;
    },
  ): Promise<
    Result<
      ReadingContextCurrentRecord,
      "READING_CONTEXT_CONFLICT" | "IDEMPOTENCY_KEY_REUSED" | "PROFILE_NOT_FOUND"
    >
  >;
};
```

### 4.3 Service Layer and Anti-Enumeration Error Boundary

Planned file `packages/backend/src/birth-profile/reading-context.service.ts`:

```typescript
export type ReadingContextErrorCode =
  | "READING_CONTEXT_INVALID"
  | "PROFILE_NOT_FOUND"
  | "READING_CONTEXT_CONFLICT"
  | "IDEMPOTENCY_KEY_REUSED"
  | "READING_CONTEXT_UNAVAILABLE";

export type ReadingContextService = {
  getCurrentContext(
    actor: CurrentActor,
    profileId: string,
  ): Promise<Result<ReadingContextCurrentRecord, ReadingContextErrorCode>>;

  setContext(
    actor: CurrentActor,
    profileId: string,
    input: SetReadingContextRequestV1,
  ): Promise<Result<ReadingContextCurrentRecord, ReadingContextErrorCode>>;

  clearContext(
    actor: CurrentActor,
    profileId: string,
    input: ClearReadingContextRequestV1,
  ): Promise<Result<ReadingContextCurrentRecord, ReadingContextErrorCode>>;
};
```

**Anti-Enumeration Invariant:**
Every service call validates profile ownership against the active actor:
- If `actor.kind === "account"`: requires `birthProfiles.userId === actor.userId`.
- If `actor.kind === "anonymous"`: requires `birthProfiles.anonymousActorId === actor.anonymousActorId` and `birthProfiles.anonymousExpiresAt > now`.
- Requires `isNull(birthProfiles.deletedAt)`.

If the profile does not exist, belongs to another actor, is soft-deleted/archived, or belongs to an expired anonymous session, the service returns **uniform 404 `PROFILE_NOT_FOUND`**. It must **never** return `FORBIDDEN` or leak profile existence.

### 4.4 Sanitized Audit Logging

State-changing operations append records to `audit_logs`:
- `birth_profile.reading_context.created`
- `birth_profile.reading_context.updated`
- `birth_profile.reading_context.cleared`

**Audit Sanitization Invariant:**
Audit log metadata must **never** record literal enum values (`lifeStage`, `topConcern`) or request fingerprints.
Recorded metadata shape:
```json
{
  "profileId": "uuid",
  "revisionId": "uuid-or-null",
  "revisionNumber": 1,
  "stateVersion": 2,
  "hasLifeStage": true,
  "hasTopConcern": false,
  "action": "set",
  "outcome": "success"
}
```

### 4.5 HTTP Controller Endpoints

In `apps/api/src/birth-profile/reading-context.controller.ts`:
1. `GET /birth-profiles/:profileId/reading-context`
   - Returns current active context or `{ context: null, stateVersion: 0 }` if skipped.
2. `PUT /birth-profiles/:profileId/reading-context`
   - Full replacement; accepts `SetReadingContextRequestV1Schema`.
   - Supports `expectedStateVersion: 0` for initial set on uninitialized profiles.
   - Enforces advisory locking, durable idempotency replay, and CAS concurrency.
3. `POST /birth-profiles/:profileId/reading-context/clear`
   - Dedicated explicit clear command; accepts `ClearReadingContextRequestV1Schema`.
   - Requires `expectedStateVersion >= 1`.

In `apps/api/src/birth-profile/birth-profile.controller.ts`:
- `POST /birth-profiles`: accepts `BirthProfileCreateRequestV1Schema` (strict union).
- Converts via `normalizeBirthProfileCreateRequest()`.
- Calls `BirthProfileService.createWithContext()`.

---

## 5. Account-Center Export and Privacy Boundary

### 5.1 Account Center Data Export (Statutory Privacy Compliance)

Users downloading their personal data receive their complete reading context history.

Update `packages/contracts/src/account-center.ts`:
```typescript
export const AccountExportReadingContextRevisionV1Schema = z
  .object({
    revisionNumber: z.number().int().positive(),
    lifeStage: LifeStageV1Schema.nullable(),
    topConcern: TopConcernV1Schema.nullable(),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type AccountExportReadingContextRevisionV1 = z.infer<
  typeof AccountExportReadingContextRevisionV1Schema
>;

export const AccountExportReadingContextV1Schema = z
  .object({
    currentRevisionNumber: z.number().int().positive().nullable(),
    stateVersion: z.number().int().positive(),
    revisions: z.array(AccountExportReadingContextRevisionV1Schema).max(100),
  })
  .strict();
export type AccountExportReadingContextV1 = z.infer<
  typeof AccountExportReadingContextV1Schema
>;

// Add optional readingContext to AccountExportProfileV1Schema:
export const AccountExportProfileV1Schema = z
  .object({
    id: z.string().trim().min(1).max(128),
    readingContext: AccountExportReadingContextV1Schema.optional(),
    revisions: z.array(AccountExportProfileRevisionV1Schema).min(1).max(100),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();
```

Update `packages/backend/src/accounts/account-center.service.ts`:
- In `getExport(userId)`, query `birth_profile_reading_context_revisions` and `birth_profile_reading_contexts` for all owned profiles.
- **Export Limit Invariant:** Align with the live profile revision limit of 100. If context revisions exceed 100, fail closed with established error `ACCOUNT_EXPORT_LIMIT_EXCEEDED` rather than silently truncating history.

### 5.2 Privacy and Telemetry Isolation (FD-053)

1. **Public Chart Isolation:**
   Public chart endpoints (`GET /api/charts/:chartId` and `/la-so/[chartId]` SSR props) return calculated chart outputs (`ZiweiChartOutput`). Reading context is strictly omitted from public chart contracts.
2. **Third-Party Analytics Denylist (FD-053):**
   Client-side and server-side tracking pipelines must enforce an explicit property denylist:
   `['readingContext', 'reading_context', 'lifeStage', 'life_stage', 'topConcern', 'top_concern']`.
   Third-party analytics tools (Google Analytics, Meta Pixel, PostHog, etc.) must never receive reading context properties.
3. **Configured AI Provider Boundary (FD-078):**
   Enum codes are sent exclusively to the configured external AI provider during report generation prompts.

---

## 6. Wizard Non-Visual Handoff and LSV-6 Coordination

### 6.1 Non-Visual State & Behavior Contract

In strict accordance with FD-024, this plan prescribes **zero visual layouts, multi-step flows, card designs, or CSS**. Visual implementation is owned by the approved UI artifact branch (LSV-21).

Non-visual behavioral obligations:
1. Reading context selections occur between birth detail validation and profile creation.
2. Both questions are optional and skippable.
3. Skipping both questions submits normal profile creation with no reading context.
4. Answering one or both questions submits `BirthProfileCreateWrapperV1`.
5. In `apps/web/src/features/birth-profile/save-birth-profile.ts`, composite submission is executed. If context persistence fails, the composite transaction rolls back and the user is notified.

### 6.2 Coordination with LSV-6 (Draft Autosave & OAuth Resume)

LSV-6 owns wizard draft persistence in client storage (`sessionStorage` / `localStorage`) and draft restoration across OAuth redirects.

Reading context draft schema interface for LSV-6:
```typescript
export type WizardReadingContextDraft = {
  lifeStage?: LifeStageV1;
  topConcern?: TopConcernV1;
  skippedQuestions: {
    lifeStage: boolean;
    topConcern: boolean;
  };
};

export type WizardDraftV2 = {
  version: 2;
  step: number;
  subject: unknown;
  birth: unknown;
  readingContext?: WizardReadingContextDraft;
  updatedAt: string;
};
```
- If the user selects answers and completes OAuth login, the draft restore restores their selections.
- If the user explicitly skipped questions, `skippedQuestions` preserves the skip state so they are not re-prompted.

---

## 7. Chart-Page Context Management: Non-Visual Future-Client Contract

### 7.1 Scope, Authority, and Visual Gating Adjudication

- **Evidence & Authority Note:**
  Allowing customers to view and update context answers later from the chart page is not a new or speculative visual proposal. It is directly quoted from binding repository sources:
  - Spec `docs/superpowers/specs/2026-09-13-ziwei-v4-report-depth-and-personalization.md` (Section 7) mandates: *"Customer can change answers later from the chart page; a changed answer affects only reports generated afterward."*
  - Kaneo LSV-17 acceptance criteria state: *"Customer can change answers later from the chart page; a changed answer affects only reports generated afterward."*
- **Visual Gating under FD-024:**
  While approved product behavior associates future context management with the customer's owned chart page, FD-024 explicitly forbids inventing or pre-empting visual design, controls, or page layout on non-UI branches.
  Therefore:
  - This plan specifies **only the non-visual HTTP API contract and state semantics** needed by any future client interface.
  - The exact visual placement (e.g., toolbar item, side panel, modal dialog, or embedded card), visual component structure, copy arrangement, responsive styling, and interaction animations are **wholly deferred** to the approved dedicated UI artifact workflow (LSV-21 / UI artifact brief).
  - No visual component files (such as inline drawers, panels, or editors) are prescribed or created in this plan.

### 7.2 Non-Visual Client API Protocol

The future client interacts with reading context on the chart page exclusively through headless REST endpoints:
1. **Retrieve Current Context:** The client invokes `GET /birth-profiles/:profileId/reading-context` to retrieve current selections (`lifeStage`, `topConcern`), `revisionId`, and monotonic `stateVersion`. If context was skipped at creation, the endpoint returns `{ context: null, stateVersion: 0 }`.
2. **Update Context (Full Replacement):** The customer may update selections via `PUT /birth-profiles/:profileId/reading-context` with `expectedStateVersion`, client-generated `idempotencyKey`, and complete replacement context fields.
3. **Clear Context:** The customer may clear selections via `POST /birth-profiles/:profileId/reading-context/clear` with `expectedStateVersion` and `idempotencyKey`.
4. **Concurrency Handling:** If concurrent activity or another tab advanced `stateVersion`, the server returns HTTP 409 `READING_CONTEXT_CONFLICT`, signaling the client to refresh current state before retrying.

### 7.3 Forward-Only Personalization Semantics

- **No Retroactive Report Mutation:**
  Existing completed reports, locked PDF files, and historical HTML reports remain strictly **immutable**. They retain the exact reading context revision frozen at the time their report reservation was created.
- **Future Report & Preview Impact:**
  Updated context applies **exclusively** to future report reservations, subsequent report upgrades (e.g. Tier 1 to Tier 2), and subsequent free-preview pre-generations.
- **No Chart Recalculation:**
  The underlying chart version (`chartVersionId`), planetary coordinates, and input calculation hashes remain unchanged.

---

## 8. Durable Report Freezing, Hard-Purge Fencing, and AI Provider Boundary

### 8.1 Live V2 Job Contract Extension (No V3 Invented)

Against the live baseline in `packages/contracts/src/jobs.ts`, extend the existing `ReportGenerationRequestedV2Schema` with optional nullable `readingContextRevisionId`:

```typescript
export const ReportGenerationRequestedV2Schema = z
  .object({
    reportId: z.string().min(1),
    reportVersionId: z.string().min(1),
    entitlementId: z.string().min(1),
    chartVersionId: z.string().min(1),
    evidenceVersionId: z.string().min(1),
    knowledgeVersionId: z.string().min(1),
    promptVersion: z.string().min(1),
    reportConfigVersion: z.string().min(1),
    locale: z.enum(["vi", "en"]),
    sku: z.string().min(1),
    asOfDate: z.iso.date(),
    targetYear: z.number().int(),
    timingRuleVersion: z.string().trim().min(1),
    sensitivityRuleVersion: z.string().trim().min(1),
    readingContextRevisionId: z.string().trim().min(1).nullable().optional(),
  })
  .strict()
  .superRefine((payload, ctx) => {
    const asOfDateYear = parseInt(payload.asOfDate.slice(0, 4), 10);
    if (payload.targetYear !== asOfDateYear) {
      ctx.addIssue({
        code: "custom",
        path: ["targetYear"],
        message: "targetYear (" + payload.targetYear + ") must match asOfDate year (" + asOfDateYear + ")",
      });
    }
  });
```

All new V4 report reservations created after LSV-17 explicitly set `readingContextRevisionId` to a revision ID or `null`. Existing queued V2 payloads without this field parse successfully and are treated as legacy `null`. Do not invent a V3 job contract.

### 8.2 Report Reservation Schema & Foreign Key Integrity

In `packages/database/src/schema/reports.ts`, add:
```typescript
readingContextRevisionId: text("reading_context_revision_id").references(
  () => birthProfileReadingContextRevisions.id,
  { onDelete: "set null" },
),
```
Using `ON DELETE SET NULL` ensures that when an account or profile undergoes hard purge, commercial report reservations and payment ledger records are not retention-blocked or cascade-deleted.

In `packages/backend/src/commerce/commerce.repository.ts` (`recordPaid` and `claimPaymentCode`):
- When creating a V4 `reportReservations` row, query `birth_profile_reading_contexts` for the chart's profile.
- Insert `reading_context_revision_id: contextRow?.currentRevisionId ?? null`.
- Enqueue outbox event `report.generation.requested.v2` carrying `readingContextRevisionId`.

### 8.3 Repository Lifecycle Fence Before EVERY Provider Call

Before every configured AI provider invocation, the worker and generation service execute a repository lifecycle fence that loads the reservation under the existing report-version/active-job fence and joins its `chart_version_id` through:
```sql
report_reservations -> ziwei_chart_versions -> ziwei_charts -> birth_profiles
```

The query structure:
```sql
SELECT
  report_reservations.id AS reservation_id,
  report_reservations.reading_context_revision_id AS reservation_context_revision_id,
  birth_profiles.id AS profile_id,
  birth_profiles.deleted_at AS profile_deleted_at
FROM report_reservations
LEFT JOIN ziwei_chart_versions
  ON ziwei_chart_versions.id = report_reservations.chart_version_id
LEFT JOIN ziwei_charts
  ON ziwei_charts.id = ziwei_chart_versions.chart_id
LEFT JOIN birth_profiles
  ON birth_profiles.id = ziwei_charts.profile_id
WHERE report_reservations.report_version_id = :reportVersionId
  AND report_reservations.active_job_id = :activeJobId;
```

#### Lifecycle Fence Outcomes
1. **Hard Purge (Profile Purged):**
   If `profile_id IS NULL` (the chart or profile row was hard-purged):
   - Result: non-retryable failure `REPORT_PROFILE_PURGED`.
   - Write bounded terminal status/audit evidence (`report.generation.failed`, `outcome: "profile_purged"`).
   - Abort immediately; **do NOT call the AI provider**.
2. **Soft Archive (Profile Archived):**
   If `profile_id IS NOT NULL` and `profile_deleted_at IS NOT NULL`:
   - The profile row still exists with `deleted_at` set (soft archive).
   - An already-created reservation is allowed to continue generation.
3. **Active Source & Context Matching:**
   Normalize payload context ID: if missing in a legacy V2 job payload, it normalizes to `null`.
   - Compare: `normalizedPayloadContextRevisionId === reservation_context_revision_id`.
   - If the context FK was nulled independently under hard purge, lifecycle failure wins (`REPORT_PROFILE_PURGED`).
   - If profile/source is present and intact but payload context ID differs from reservation context ID:
     - Result: non-retryable failure `REPORT_CONTEXT_MISMATCH`.
     - Write bounded terminal status/audit evidence.
     - Abort immediately; **do NOT call the AI provider**.
   - If they match: fence passes; proceed to provider call.

#### Invocation Invariant
This lifecycle fence is evaluated immediately before **EVERY** configured AI-provider-backed operation in the current V2/V4 path:
1. Before initial writer (`writeComprehensiveZiweiReportV4` / `writeIdentityReportDraft`)
2. Before initial critic (`critiqueComprehensiveZiweiReportV4` / `critiqueIdentityReport`)
3. Before bounded rewrite writer (when initial validation or critic fails and rewrite budget is consumed)
4. Before rewrite re-critic (when critique is executed on a rewritten draft)
5. Before every section generator/critic provider invocation introduced by merged LSV-15.

The service must **never** rely on a single job-start check, because a customer hard purge may occur while the worker is actively running between writer and critic or between critic and rewrite.

### 8.4 Planned Ownership & Test Requirements for Slice 17D

Slice 17D coordinates these actual live paths:
- `packages/contracts/src/jobs.ts` and `packages/contracts/src/jobs.test.ts`
- `packages/database/src/schema/reports.ts`
- `packages/backend/src/commerce/commerce.repository.ts` and integration tests
- `packages/backend/src/reports/report-generation.repository.ts`
- `packages/backend/src/reports/report-generation.service.ts` and tests
- `packages/backend/src/reports/report-generation.service.test.ts`
- `packages/backend/src/reports/comprehensive-report-writer-v4.test.ts`
- `packages/backend/src/reports/comprehensive-report-critic-v4.test.ts`
- `apps/worker/src/processors/report-generate.processor.ts` and tests/wiring

*Execution Constraint:* Slice 17D touches shared generation paths and must be integrated after LSV-15 shared-path changes are merged/adjudicated to prevent duplicate refactoring.

### 8.5 Provider Prompt Injection Rules

When assembling prompts for the configured AI provider:
1. **Enum Codes Only:** Only raw enum codes (e.g. `lifeStage: "early_career"`, `topConcern: "career"`) are passed into the prompt payload.
2. **Strict System Instructions:**
   - "Use `lifeStage` and `topConcern` exclusively to choose relatable life-situation examples and prioritize thematic emphasis."
   - "NEVER state or imply that the chart itself revealed the reader's life stage or concern."
   - "NEVER invent astrological claims linking chart stars to declared context."
3. **Deterministic Fallback:** If `readingContext` is null/omitted, the generator uses neutral, balanced examples across life stages and standard palace/theme ordering.

---

## 9. LSV-15 and FD-068 Handoff

### 9.1 Free-Preview Purge Boundary

**Verified Fact:** Current `buildGuardedFreeIdentityPreview` in `packages/backend/src/reports/free-identity-preview.ts` is strictly synchronous and in-memory. It maintains zero persisted database checkpoints.

**Handoff Requirements for Future LSV-15 / FD-068 Checkpoint Design:**
- If LSV-15 introduces persisted/asynchronous section checkpoints:
  - Persist `profile_id` alongside the frozen context revision ID/snapshot under a profile-owned lifecycle.
  - Apply equivalent lifecycle revalidation before every AI provider call: verify profile chain exists (aborting with `REPORT_PROFILE_PURGED` on hard purge) and verify active context revision matches before provider dispatch.
- If LSV-15 retains the synchronous request/response model:
  - Freeze validated enum codes only for the duration of the authorized synchronous request.
  - Revalidate active profile ownership and non-archived status before calling the provider.

### 9.2 LSV-15 Sectioned V4 Generator Handoff

LSV-15 implements section-by-section generation (`overview`, `coreAxis`, 12 palaces, 4 themes, decadal, annual, actions).
- **Overview & Core Axis:** The generator uses `lifeStage` to calibrate the reader's current career/life footing when framing broad life patterns.
- **Thematic Synthesis:** The generator orders and emphasizes the theme matching `topConcern` (e.g. `career` -> Career theme; `money` -> Wealth theme; `love` -> Romance theme).
- **Practical Direction:** Actions highlight concrete immediate steps relevant to `topConcern`.
- **Characterization Assertion:** Tests must assert that the exact same chart fixture evaluated with different `ReadingContextV1` values produces distinct narrative examples while chart facts and evidence keys remain identical.
- **Corpus Dependency:** Context-driven generated examples require LSV-16 knowledge base activation before acceptance.

### 9.3 FD-068 Free Preview Pre-generation Handoff

Under FD-068, free chart visitors receive up to three pre-generated sections to prove report value before purchase.
- If the visitor selected a `topConcern`, the preview pre-generator prioritizes the matching section:
  - `career` -> Quan Lộc palace or Career theme.
  - `money` -> Tài Bạch palace or Wealth theme.
  - `love` -> Phu Thê palace or Relationships theme.
- If the visitor skipped reading context, the preview generator defaults to the canonical preview set (Mệnh palace / Core Axis).

---

## 10. Migration Sequencing and Conflict Isolation

### 10.1 Dynamic Migration Allocation Rule

**Rule:** Do not hard-code or reserve static migration numbers in this plan.
- Integration branch `product/experience-spec-v1` currently contains migration `0026_ai_usage_and_cost.sql`.
- Ticket LSV-12 owns resolving analytics migration naming.
- Ticket LSV-15 will introduce report section checkpoint migrations.

**Action at Implementation Time:**
When Slice 17A begins:
1. Fast-forward or rebase onto the latest `origin/product/experience-spec-v1`.
2. Inspect `packages/database/drizzle/meta/_journal.json`.
3. Allocate the next unused sequential integer: `00XX_birth_profile_reading_context.sql`.

### 10.2 Conflict Isolation Map

| Branch / Ticket | Overlapping Areas | Semantic Relationship | Isolation Strategy |
|---|---|---|---|
| **LSV-10** (Admin Metrics) | `packages/contracts/src/index.ts`, `packages/backend/src/index.ts` | None | Avoid unnecessary barrel exports. Integrate LSV-10 before merging. |
| **LSV-12** (Analytics) | Migration journal, telemetry sinks | None | Allocate sequential migration after LSV-12. Test denylists against LSV-12 sink contracts. |
| **LSV-14** (Audit/Planning) | `AGENTS.md` | None | LSV-17 does not touch `AGENTS.md`. |
| **LSV-15** (V4 Generation) | Report reservation & prompt generation | Consumer of context | Slice 17D coordinates with merged LSV-15 to avoid duplicate generator edits. |
| **LSV-16** (Knowledge V4) | Report knowledge corpus | Acceptance dependency | LSV-16 corpus required for example quality acceptance; contracts/persistence proceed independently. |
| **LSV-6** (Autosave) | Wizard state storage | Parent state container | LSV-17 specifies draft schema interface; LSV-6 manages storage mechanics. |
| **LSV-21** (Wizard UI) | Wizard React components & CSS | Visual presentation | Visual components deferred to dedicated UI artifact workflow per FD-024. |

---

## 11. Bounded Implementation Slices

### Slice 17A: Contracts, Database Schema, and Migration
- **Owned Files:**
  - Create `packages/contracts/src/reading-context-v1.ts`
  - Create `packages/contracts/src/reading-context-v1.test.ts`
  - Modify `packages/contracts/src/index.ts`
  - Modify `packages/database/src/schema/birth-profile.ts`
  - Modify `packages/database/src/index.ts`
  - Create `packages/database/drizzle/00XX_birth_profile_reading_context.sql` (dynamically numbered)
  - Modify `packages/database/drizzle/meta/_journal.json`
  - Create `packages/database/src/schema/reading-context.integration.test.ts`
- **Acceptance:** Contracts validate enums, refinements, union `BirthProfileCreateRequestV1Schema`, normalizer, and canonical fingerprinting; tables `birth_profile_reading_context_revisions`, `birth_profile_reading_contexts` (composite FK on delete cascade), and `birth_profile_reading_context_mutation_receipts` created cleanly; migration applies on fresh and upgraded databases; foreign key cascades verified.

### Slice 17B: Backend Composite Creation, Repository, Service, and API Endpoints
- **Owned Files:**
  - Modify `packages/backend/src/birth-profile/birth-profile.repository.ts`
  - Modify `packages/backend/src/birth-profile/birth-profile.repository.test.ts`
  - Modify `packages/backend/src/birth-profile/birth-profile.service.ts`
  - Modify `packages/backend/src/birth-profile/birth-profile.service.test.ts`
  - Create `packages/backend/src/birth-profile/reading-context.repository.ts`
  - Create `packages/backend/src/birth-profile/reading-context.repository.test.ts`
  - Create `packages/backend/src/birth-profile/reading-context.service.ts`
  - Create `packages/backend/src/birth-profile/reading-context.service.test.ts`
  - Modify `packages/backend/src/index.ts`
  - Modify `apps/api/src/api.module.ts`
  - Create `apps/api/src/birth-profile/reading-context.controller.ts`
  - Create `apps/api/src/birth-profile/reading-context.controller.test.ts`
  - Modify `apps/api/src/birth-profile/birth-profile.controller.ts`
  - Modify `apps/api/src/birth-profile/birth-profile-http-flow.test.ts`
- **Acceptance:** Composite `createWithContext()` executes profile and reading context in one transaction; exact success response preserved; mutations acquire transaction-scoped advisory lock; `PUT` and `POST .../clear` enforce `expectedStateVersion` CAS; durable mutation receipts replay original results on matching fingerprint and return `IDEMPOTENCY_KEY_REUSED` on mismatch; concurrent first SETs serialize cleanly (winner creates state 1, loser returns conflict); unauthorized/missing profiles return uniform `PROFILE_NOT_FOUND`; audit logs sanitize enum values and fingerprints to presence flags.

### Slice 17C: Web Headless Integration & Autosave Contract
- **Owned Files:**
  - Modify `apps/web/src/features/birth-profile/save-birth-profile.ts`
  - Modify `apps/web/src/features/birth-profile/save-birth-profile.test.ts`
  - Modify `apps/web/src/features/birth-profile/birth-wizard-state.ts`
  - Create `apps/web/src/features/birth-profile/birth-wizard-state.test.ts` (if still absent)
- **Acceptance:** Headless submit function handles optional wrapper format and rolls back on failure; response preserves `profileId`, `revisionId`, `ziweiEligibility`, and anonymous expiry; wizard state validator supports skip and restore states.

### Slice 17D: Report Generation Context Freezing & Lifecycle Purge Fence
- *Note:* Slice 17D touches live shared paths and must be executed after LSV-15 integrates to avoid duplicate generator edits.
- **Owned Files:**
  - Modify `packages/database/src/schema/reports.ts`
  - Modify `packages/contracts/src/jobs.ts`
  - Modify `packages/contracts/src/jobs.test.ts`
  - Modify `packages/backend/src/commerce/commerce.repository.ts`
  - Modify `packages/backend/src/reports/report-generation.repository.ts`
  - Modify `packages/backend/src/reports/report-generation.service.ts`
  - Modify `packages/backend/src/reports/report-generation.service.test.ts`
  - Modify `packages/backend/src/reports/comprehensive-report-writer-v4.test.ts`
  - Modify `packages/backend/src/reports/comprehensive-report-critic-v4.test.ts`
  - Modify `apps/worker/src/processors/report-generate.processor.ts`
  - Modify `apps/worker/src/processors/report-generate.processor.test.ts`
- **Acceptance:** Report reservations freeze active `reading_context_revision_id` with `ON DELETE SET NULL`; `ReportGenerationRequestedV2Schema` carries optional nullable context revision ID; repository lifecycle fence evaluates reservation join to profile immediately before initial writer, initial critic, rewrite writer, and rewrite critic; hard purge classifies non-retryable `REPORT_PROFILE_PURGED`; context mismatch on active profile classifies `REPORT_CONTEXT_MISMATCH`; soft archive after reservation continues; zero provider calls occur after purge/mismatch boundary; prompt context injects raw enum codes without modifying `ReportSourceSnapshotV1`.

### Slice 17E: Account Export, Retention, and Privacy Lifecycle
- **Owned Files:**
  - Modify `packages/contracts/src/account-center.ts`
  - Modify `packages/backend/src/accounts/account-center.service.ts`
  - Modify `packages/backend/src/accounts/account-center.service.test.ts`
  - Modify `packages/backend/src/privacy/anonymous-retention.service.test.ts`
  - Create `packages/backend/src/privacy/reading-context-privacy.test.ts`
- **Acceptance:** Account export includes up to 100 context revisions and fails closed with `ACCOUNT_EXPORT_LIMIT_EXCEEDED` on overflow; anonymous purge and account deletion cascade cleanly to all three tables; telemetry denylists block context fields from analytics sinks.

### Slice 17F: Dedicated UI Artifact Branch Integration (Visual UI)
- *Deferred to dedicated UI artifact workflow per FD-024 (LSV-21).*
- **Owned Files:**
  - Visual component and test files will be assigned explicitly by the founder-approved UI artifact brief (no specific visual files such as `reading-context-editor.tsx` or concrete step components are prescribed in advance).
  - Localization files as required by the UI artifact brief (e.g., `apps/web/messages/vi/profile.json`, `apps/web/messages/en/profile.json`).
- **Acceptance:** Visual presentation rendered strictly according to the founder-approved UI artifact; mobile 320-430px responsive list items; keyboard navigation and screen-reader accessible; clear "Bỏ qua" options; consumes headless GET/PUT/clear API semantics with forward-only report behavior.

---

## 12. Detailed Verification Matrix

| Area | Test Target | Input Condition | Expected Result | Verification Command |
|---|---|---|---|---|
| **Contract** | `ReadingContextV1Schema` | Valid `lifeStage` and `topConcern` | Parses successfully | `pnpm vitest run packages/contracts/src/reading-context-v1.test.ts` |
| **Contract** | `ReadingContextV1Schema` | Both fields undefined | Throws refinement validation error | `pnpm vitest run packages/contracts/src/reading-context-v1.test.ts` |
| **Contract** | `ReadingContextV1Schema` | Arbitrary strings / free text | Fails enum schema validation | `pnpm vitest run packages/contracts/src/reading-context-v1.test.ts` |
| **Contract** | `BirthProfileCreateRequestV1Schema` | Legacy raw `BirthProfileV1` | Parses as raw profile; normalizer returns `{ profile, readingContext: undefined }` | `pnpm vitest run packages/contracts/src/reading-context-v1.test.ts` |
| **Contract** | `BirthProfileCreateRequestV1Schema` | Wrapper with context | Parses as wrapper; normalizer returns `{ profile, readingContext }` | `pnpm vitest run packages/contracts/src/reading-context-v1.test.ts` |
| **Contract** | `BirthProfileCreateRequestV1Schema` | Wrapper without context | Parses as wrapper; normalizer returns `{ profile, readingContext: undefined }` | `pnpm vitest run packages/contracts/src/reading-context-v1.test.ts` |
| **Contract** | `BirthProfileCreateRequestV1Schema` | Mixed raw + wrapper / unknown keys | Fails strict schema validation | `pnpm vitest run packages/contracts/src/reading-context-v1.test.ts` |
| **Contract** | `computeReadingContextFingerprint` | Every allowed `lifeStage` or `topConcern` | Produces distinct, non-colliding SHA-256 hash | `pnpm vitest run packages/contracts/src/reading-context-v1.test.ts` |
| **Contract** | `computeReadingContextFingerprint` | Omitted fields vs. normalized explicit `null` | Produces identical canonical tuple and identical hash | `pnpm vitest run packages/contracts/src/reading-context-v1.test.ts` |
| **Contract** | `computeReadingContextFingerprint` | Mutated schemaVersion, command, or expectedStateVersion | Produces distinct, non-colliding SHA-256 hash | `pnpm vitest run packages/contracts/src/reading-context-v1.test.ts` |
| **Contract** | `computeReadingContextFingerprint` | Repeated runs with identical normalized inputs | Hex digest is deterministic and stable | `pnpm vitest run packages/contracts/src/reading-context-v1.test.ts` |
| **Database** | Migration & Layout | Clean DB & upgrade DB | Drizzle migration applies without error | `pnpm vitest run packages/database/src/schema/reading-context.integration.test.ts` |
| **Database** | Composite FK Cascade | Profile hard deleted | Cascade deletes current state, revisions, and mutation receipts | `pnpm vitest run packages/database/src/schema/reading-context.integration.test.ts` |
| **Database** | Unique Constraint | Duplicate `(profile_id, revision_number)` | DB rejects with unique constraint violation | `pnpm vitest run packages/database/src/schema/reading-context.integration.test.ts` |
| **Lifecycle** | Anonymous Purge | Anonymous actor expires (24h) | Cascade deletes all context revisions, pointer, and receipts | `pnpm vitest run packages/backend/src/privacy/anonymous-retention.service.test.ts` |
| **Lifecycle** | Account Linking | Anonymous links to User ID | Context rows retained under same `profileId` with new `userId` | `pnpm vitest run packages/backend/src/birth-profile/reading-context.repository.test.ts` |
| **Lifecycle** | Soft Delete Archive | Profile marked `deletedAt = now` | Reading context queries return uniform `PROFILE_NOT_FOUND` | `pnpm vitest run packages/backend/src/birth-profile/reading-context.service.test.ts` |
| **API** | Composite Save | Valid profile + valid context | Profile created and initial context revision 1 saved in 1 TX | `pnpm vitest run apps/api/src/birth-profile/birth-profile-http-flow.test.ts` |
| **API** | Composite Save Failure | Valid profile + invalid context | Transaction rolls back; 0 profile and context rows created | `pnpm vitest run apps/api/src/birth-profile/birth-profile-http-flow.test.ts` |
| **API** | Skip Both Questions | Valid profile + omitted context | Profile created; 0 reading context rows created | `pnpm vitest run apps/api/src/birth-profile/birth-profile-http-flow.test.ts` |
| **API** | Uninitialized GET | Active profile with no context row | Returns `{ context: null, stateVersion: 0 }` | `pnpm vitest run apps/api/src/birth-profile/reading-context.controller.test.ts` |
| **API** | Initial Skip -> First SET | Uninitialized profile + `expectedStateVersion: 0` | Inserts revision 1, sets `stateVersion = 1` | `pnpm vitest run apps/api/src/birth-profile/reading-context.controller.test.ts` |
| **API** | Concurrent First SET (Same Key & Fingerprint) | Competing first SETs (same key, same payload) | Transaction 2 waits on advisory lock, then replays committed receipt | `pnpm vitest run packages/backend/src/birth-profile/reading-context.repository.test.ts` |
| **API** | Concurrent First SET (Same Key, Mismatched Payload) | Competing first SETs (same key, different payload) | Transaction 2 waits on advisory lock, then returns `IDEMPOTENCY_KEY_REUSED` | `pnpm vitest run packages/backend/src/birth-profile/reading-context.repository.test.ts` |
| **API** | Concurrent First SET (Different Keys, Expected 0) | Competing first SETs (KA vs KB, expectedStateVersion: 0) | Serializes on advisory lock; winner sets state 1, loser returns `READING_CONTEXT_CONFLICT` | `pnpm vitest run packages/backend/src/birth-profile/reading-context.repository.test.ts` |
| **API** | Stale Update / Clear | Update with stale `expectedStateVersion` | Returns 409 `READING_CONTEXT_CONFLICT` | `pnpm vitest run apps/api/src/birth-profile/reading-context.controller.test.ts` |
| **API** | Durable Idempotency Replay | Resubmit identical command + idempotencyKey | Replays original receipt without creating revision or audit | `pnpm vitest run apps/api/src/birth-profile/reading-context.controller.test.ts` |
| **API** | Replay After Newer Mutation | Resubmit older key after state advanced | Replays original result; current state remains at higher version | `pnpm vitest run apps/api/src/birth-profile/reading-context.controller.test.ts` |
| **API** | Idempotency Key Mismatch | Resubmit same key with different payload | Returns `IDEMPOTENCY_KEY_REUSED` | `pnpm vitest run apps/api/src/birth-profile/reading-context.controller.test.ts` |
| **API** | Clear -> Re-set | Clear context, then re-set new values | Monotonically increments `stateVersion` and allocates revision 2 | `pnpm vitest run apps/api/src/birth-profile/reading-context.controller.test.ts` |
| **API** | Anti-Enumeration | Unauthorized or expired profile access | Returns uniform 404 `PROFILE_NOT_FOUND` | `pnpm vitest run apps/api/src/birth-profile/reading-context.controller.test.ts` |
| **Chart Identity** | Immutability | Update context on existing profile | `input_hash`, `chart_id`, and `ziwei_charts` unchanged | `pnpm vitest run packages/backend/src/birth-profile/birth-profile.service.test.ts` |
| **Report Freeze** | Provenance | Create report reservation, then update context | Reservation retains frozen initial context revision ID | `pnpm vitest run packages/backend/src/reports/report-generation.service.test.ts` |
| **Lifecycle Fence** | Hard Purge with Context Present | Profile hard deleted; context revision exists in payload | Lifecycle fence aborts with non-retryable `REPORT_PROFILE_PURGED`; zero provider calls | `pnpm vitest run packages/backend/src/reports/report-generation.service.test.ts` |
| **Lifecycle Fence** | Hard Purge with Context Absent | Profile hard deleted; context revision is null in payload | Lifecycle fence aborts with non-retryable `REPORT_PROFILE_PURGED`; zero provider calls | `pnpm vitest run packages/backend/src/reports/report-generation.service.test.ts` |
| **Lifecycle Fence** | Legacy V2 Missing Context | Active profile; legacy V2 payload without context field | Payload normalizes to null; matches null reservation context; continues normally | `pnpm vitest run packages/backend/src/reports/report-generation.service.test.ts` |
| **Lifecycle Fence** | Context Mismatch on Active Profile | Active profile; payload context ID differs from reservation | Aborts with non-retryable `REPORT_CONTEXT_MISMATCH`; zero provider calls | `pnpm vitest run packages/backend/src/reports/report-generation.service.test.ts` |
| **Lifecycle Fence** | Soft Archive After Reservation | Profile archived (`deletedAt` set) after reservation | Reservation and profile join intact; generation completes successfully | `pnpm vitest run packages/backend/src/reports/report-generation.service.test.ts` |
| **Lifecycle Fence** | Purge Between Writer and Critic | Profile hard purged after writer, before critic | Fence before critic detects missing profile; aborts with `REPORT_PROFILE_PURGED`; no critic call | `pnpm vitest run packages/backend/src/reports/report-generation.service.test.ts` |
| **Lifecycle Fence** | Purge Between Critic and Rewrite | Profile hard purged after critic, before rewrite writer | Fence before rewrite detects missing profile; aborts with `REPORT_PROFILE_PURGED`; no rewrite call | `pnpm vitest run packages/backend/src/reports/report-generation.service.test.ts` |
| **AI Prompt** | Personalization | Fixture chart + different contexts | Examples vary; chart facts & evidence keys match 100% | `pnpm vitest run packages/backend/src/reports/report-generation.service.test.ts` |
| **Account Center** | Export | Verified user requests export | Export JSON contains full context revision history (max 100) | `pnpm vitest run packages/backend/src/accounts/account-center.service.test.ts` |
| **Account Center** | Export Overflow | Context revisions exceed 100 | Returns error `ACCOUNT_EXPORT_LIMIT_EXCEEDED` | `pnpm vitest run packages/backend/src/accounts/account-center.service.test.ts` |
| **Privacy** | Denylist | Telemetry sink payload evaluation | Reading context properties confirmed absent | `pnpm vitest run packages/backend/src/privacy/reading-context-privacy.test.ts` |
| **Audit Log** | Sanitization | Any context write | Logs presence flags only; zero enum values or fingerprints | `pnpm vitest run packages/backend/src/birth-profile/reading-context.service.test.ts` |

---

## 13. Rollout, Observability, Rollback, and Unresolved Questions

### 13.1 Observability and Logging

- **Audit Events:** Context writes emit structured audit records with `profileId`, `revisionId`, `revisionNumber`, `stateVersion`, `hasLifeStage`, `hasTopConcern`, `action`, and `outcome`.
- **Log Sanitization Invariant:** Server logs must **never** output personal birth details, enum codes, or mutation receipt fingerprints.
- **Metrics:** Track wizard completion rate with context answered vs. skipped.

### 13.2 Rollback Strategy

- The database schema additions (`birth_profile_reading_context_revisions`, `birth_profile_reading_contexts`, `birth_profile_reading_context_mutation_receipts`, and `report_reservations.reading_context_revision_id`) are strictly additive.
- If backend code must be rolled back:
  1. The application can revert to legacy profile submission without dropping the new tables.
  2. Any created reading context rows remain inert in PostgreSQL.
  3. No chart calculations, reports, or commerce records are affected.

### 13.3 Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Customer perceives questions as required | Abandonment in wizard | Prominent "Bỏ qua" action on each question and clear helper text that questions are optional. |
| AI hallucinating context as astrological facts | Trust & credibility loss | System prompt explicitly forbids claiming context was revealed by the chart or stars. |
| Concurrency conflict on chart-page update | Customer frustration | Transaction-scoped advisory locking, optimistic concurrency detection (`stateVersion`), and durable idempotency receipts. |
| Data leakage to analytics | Breach of FD-053 | Strict property denylists verified by automated tests against analytics contracts. |
| Hard purge during queued report generation | Generating reports on purged data | Lifecycle fence evaluated immediately before every provider call aborts with `REPORT_PROFILE_PURGED` without provider dispatch. |

### 13.4 Unresolved Questions

- **Founder Lãm:** None for planning. FD-078 is fully approved. The visual placement and UI styling wait for the approved UI artifact / LSV-21 under FD-024 and FD-056.
- **Technical Owner An:** Explicit written technical approval of this implementation plan before implementation slices begin.
