# LSV60 owned report-ready subscriptions

## Bounded brief

Implement the phase07 waiting-room request already approved: a verified account can register, inspect or cancel a notification subscription for its exact pending immutable report. Preserve existing automatic purchase-completion notices. Reuse their `report-ready-email:{reportVersionId}:{ownerId}` dedup key; canceling the additional subscription does not cancel automatic transactional messages.

The current owner decision FD112 authorizes capture-only notification testing. This slice ships disabled by default; its only opt-in runtime mode is capture. No new subscriber may cause live outbound mail. Capture records must remain distinct from sent/delivered mail. Do not change production environment values, commerce activation, held writers/products, automatic notice policy or paid generation.

Scope: subscription contracts and database migration; backend owned-report service/capture runner with deletion coordination; private API and same-origin browser BFF; waiting-room component with vi/en copy parity; route-registry private entry and coverage; focused frozen-clock PG/HTTP/component acceptance and this verification record. No third-party packages or public routes. All state follows verified ownership, current authorized purchase and profile/deletion authority; transitions are serialized and replay-safe. Delivery/capture rechecks readiness, ownership, revocation and deletion; registration never starts generation, spends La or changes reports.

## Release gates

Rebuild changed dist producers; focused checks; `pnpm i18n:check && pnpm lint && pnpm typecheck`; exact-head independent Sol review and CI; merge into master; deploy exact images, record smoke and isolated published-image capture/cleanup evidence. Full LSV60 remains In Review while the annual campaign and approved outbound/cohort acceptance are deferred.
