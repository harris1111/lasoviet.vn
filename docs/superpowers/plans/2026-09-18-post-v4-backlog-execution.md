# Post-V4 Backlog Execution Plan

Date: 2026-09-18

## Status And Scope

V4.1.1 is deployed on production at commit
`963c98c121b3fe67ec30f06effcbae1de5793cc7`.

The release is runtime-safe, but the activation gate is still open. Campaign
`prod-20260918-05` stopped at run 1/20 after `keyConfigurations` failed its
bounded quality/evidence gate. The provider lineage was Claude-only, the
failed run was restored through the audited ledger path, and no immutable
report or PDF was created. This run does not count toward the 20 consecutive
successes.

This plan covers:

- closure of the V4 production evidence gate;
- the remaining ReadingContext and UI artifact work;
- the order for the remaining public experience tickets;
- review, release, deployment, smoke, and Kaneo evidence requirements.

This plan does not authorize payment activation, top-up, provider, webhook,
invoice, public paid-resolver, DNS, or other external configuration changes.

## Binding Constraints

1. Keep the current production provider boundary: `9router-an` with resolved
   model `claude-sonnet-4-6`; do not use Gemini.
2. Do not lower V4 quality thresholds, raise token caps, or change prompt,
   provider, or resolver behavior based on one failed campaign. Repeated
   evidence must be reviewed by Terra high before any bounded correction.
3. Every failed real campaign run stops the campaign, restores the spend
   through the audited/idempotent ledger command, and leaves the 20-run
   counter unchanged.
4. Do not move LSV-15, LSV-29, or LSV-36 to `Done` until the 20 consecutive
   real sectioned generations, immutable report/PDF evidence, and deployment
   smoke evidence are recorded.
5. User-facing visual work belongs on dedicated UI artifact branches. Backend,
   BFF, contracts, localized messages, and headless tests may proceed only
   when they do not invent unresolved visual design.
6. A milestone is complete only after Terra high review, integration and
   release PRs, production deployment, smoke evidence, and a Kaneo update.

## Execution Order

### Phase 0: V4 Gate Recovery And Closure

Owners: LSV-15, LSV-29, LSV-36

1. Run a new campaign with a fresh campaign ID and the deployed V4.1.1 tuple.
2. Capture the structured CLI output, report version IDs, section checkpoint
   statuses, terminal findings, AI lineage, spend receipt/audit evidence,
   restoration evidence when applicable, and the final wallet balance.
3. Stop immediately at the first failure. Do not start the next run.
4. Send each completed campaign bundle to an independent Terra high review.
5. If a repeated failure demonstrates a product or correctness defect, create
   one narrowly scoped Terra medium correction brief. Do not treat provider
   variance as permission to weaken the gate.
6. After 20 consecutive passes, record all immutable report/PDF IDs and exact
   lineage, then request the final founder/activation decision. Paid resolver
   activation remains outside this plan.

Exit criteria:

- 20 consecutive real sectioned generations pass;
- every run has complete checkpoint, immutable, PDF, and ledger evidence;
- no Gemini lineage or payment/provider activation;
- all three Kaneo tickets contain the final evidence and deployment SHA.

### Phase 1: ReadingContext And Wizard Completion

Tickets: LSV-17 and LSV-21, with the existing LSV-6 autosave contract.

1. Verify the already integrated ReadingContext contract, privacy boundary,
   ownership transfer, deletion, export, and report freezing in the target
   deployment.
2. Implement the dedicated UI artifact for the two enum-only context questions:
   optional, skippable, keyboard accessible, and usable at 320-430px.
3. Reuse the existing wizard/autosave contract. Do not place context inside
   `BirthProfileV1`, and never send free text or analytics context to a
   third-party provider.
4. Test omission, save/update/clear, authentication continuation, deletion,
   export, and provider payload redaction.

Exit criteria:

- fixture charts retain identical chart/evidence keys when context changes;
- examples can differ while chart facts remain identical;
- both questions can be skipped;
- UI artifact screenshots are founder-approved;
- deployment smoke covers wizard submit and autosave.

### Phase 2: Shared Homepage And Form Surface

Tickets: LSV-20, using LSV-19 as the completed foundation.

1. Implement the approved homepage artifact with the form as the first mobile
   viewport signal.
2. Reuse the Phase 1 form/wizard component and context chips.
3. Preserve the no-price homepage decision, approved copy, route registry,
   canonical/robots behavior, and FD-081 events.
4. Validate 320, 375, 390, 768, 1024, and 1440 pixel screenshots, no
   horizontal overflow, accessibility, and page-length limits.

Exit criteria:

- homepage and wizard use one consistent form surface;
- mobile shows the first three form fields in the first viewport;
- all required CTA/chip/carousel events are emitted;
- browser production smoke passes on the deployed route.

### Phase 3: Result And Sample Reading Experience

Tickets: LSV-22, then LSV-24.

1. Before implementation, verify the owner of the 12-palace mobile chart
   surface (LSV-8 or its successor) and document the boundary.
2. Implement result tabs, URL state, accessible accordion/preview behavior,
   server-side locked-content projection, evidence matrix, and real reading
   progress.
3. Build the sample report from the same result components with fixed,
   anonymous, approved data. Remove all legacy VND pricing from the sample
   route.
4. Verify route registry state, SEO metadata, canonical, indexability, and
   locale integrity.

Exit criteria:

- refresh/back/auth return preserve tab and open-item state;
- locked content is absent from browser source and public API payloads;
- sample page exposes no personal data or VND claim;
- mobile and desktop screenshots are approved;
- production smoke covers result, sample, tab, preview, and CTA flows.

### Phase 4: Paid Reader Surface Without Payment Activation

Ticket: LSV-25.

1. Implement the reader for already-owned entitlements and existing report
   data only.
2. Add reading position, progress, locked excerpts, and the upgrade surface
   behind the existing authorization boundary.
3. Keep purchase/top-up calls disabled in production. The UI may represent a
   disabled or read-only state and must not imply that a payment succeeded.
4. Validate owner authorization, no locked-content leakage, focus handling,
   cross-device reading position, and event privacy.

Exit criteria:

- an owner can read the content already granted to the account;
- non-owners see only the approved server-cut preview;
- no payment/provider/webhook side effect occurs;
- the disabled state is explicit in browser and API tests.

### Phase 5: Pricing And Wallet Presentation

Ticket: LSV-23.

This phase is intentionally after the reader surface and remains
provider-independent.

1. Implement the approved pricing/read-only wallet presentation behind a
   disabled feature flag.
2. Show Lá denominations and truthful package metadata only.
3. Do not expose a live top-up CTA, payment redirect, webhook confirmation,
   invoice activation, or public paid resolver.
4. Keep VND content confined to the disabled/read-only offer representation
   required by the approved artifact; do not create a purchase path.

Exit criteria:

- disabled state is testable and obvious;
- no state-changing payment request can be issued from the UI;
- feature flag removal requires a separate founder-authorized release.

### Phase 6: Support, Free-Tool Cross-Sell, And Knowledge Hub

Tickets: LSV-26, LSV-27, and LSV-28.

These can be implemented in separate bounded milestones after Phase 2, but
LSV-28 waits until the core result/reader surfaces are stable.

1. LSV-26: add the configured email support card and footer. Do not claim
   delivery or priority handling without notification evidence. Keep Zalo,
   phone, address, and legal-entity fields disabled.
2. LSV-27: add the post-result free-tool cross-sell with source attribution,
   safe copy, and no deterministic/fear-based claims.
3. LSV-28: add the knowledge hub and article cards, reuse approved content
   sources, preserve route registry/SEO rules, and keep card layouts
   un-nested and responsive.

Exit criteria for each ticket:

- all target routes are deployed and smoke-tested;
- support copy matches the actual configured channel;
- analytics events contain no birth data or sensitive context;
- content and locale-integrity checks pass;
- founder visual/content approval is recorded before `Done`.

## Milestone Workflow

For every phase that changes code:

1. Sol writes a bounded brief naming owned files, behavior, exclusions, and
   focused checks.
2. Terra medium implements only that brief on a dedicated branch.
3. Terra high independently reviews scope, behavior, privacy, security,
   tests, and release boundaries.
4. Terra medium receives only evidence-backed must-fix corrections.
5. Push an integration PR to `product/experience-spec-v1`, merge only after
   explicit founder authorization, then open the release PR to `master`.
6. Deploy through the approved pipeline, run browser/API/worker smoke, and
   record the immutable release SHA.
7. Update the related Kaneo ticket with review, PR, deploy, smoke, and open
   blockers. Keep the ticket in `In Review` until deployment evidence exists.

## Current Blockers

- FD-082 remains open because campaign `prod-20260918-05` failed at run 1.
- LSV-15, LSV-29, and LSV-36 therefore remain open.
- LSV-23 cannot activate top-up/payment behavior under this plan.
- UI work requiring an unresolved artifact or another ticket's owned surface
  must wait for that artifact or dependency; do not duplicate the design.

## Evidence Retention

Store or reference:

- campaign NDJSON;
- report version and checkpoint/terminal-finding projection;
- provider/model/requested-model lineage;
- immutable report and PDF IDs for successful runs;
- spend receipt, spend audit, and restoration receipt/audit when applicable;
- release state, deployed SHA, readiness responses, migration evidence, and
  feature-flag state;
- Terra high verdict and Kaneo comment IDs.

No evidence bundle may contain credentials, full environment maps, raw
provider secrets, or unnecessary personal data.
