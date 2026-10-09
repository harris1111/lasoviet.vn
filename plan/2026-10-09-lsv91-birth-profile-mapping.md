# LSV91 private normalized birth-profile mapping

Bounded brief: connect stored normalized birth profiles to the deployed Bazi
calculator for supported core inputs: solar/lunar dates (including real leap
months), exact minutes with fixed offsets or uniquely resolved IANA zones, and
explicit unknown hours with fixed offsets. Use pinned lunar-typescript1.8.6 and
runtime Intl facts. Preserve local-midnight/sect2 and UTC+8 solar-term calculation.
Never choose a representative branch/range hour or unknown-hour timezone offset.
Unsupported precision, timezone ambiguity/gaps/non-minute historical offsets,
invalid lunar dates and inconsistent normalized/original/UTC bindings fail closed.

Allowed: private engine mapping/helper/export and focused actual-vendor/Intl
tests, this brief and verification receipt. Return a redacted normalized chart;
resolved private date/time inputs are not a browser/API DTO. Equivalent solar and
lunar inputs share the existing deterministic calculation key. Callers still
authorize stored ownership and retain immutable profile/calculation provenance.

No persistence/migration, API/route/runtime composition, public projection,
provider, writer, luck cycles, compatibility scores, SKU/pricing, sale activation,
FE, operator or customer-send changes. Branch/range and unknown-hour IANA support
remain explicit future source work; do not claim all birth-time modes supported
or full LSV91 Done. No settled owner/API/model/budget decision is reopened.

Verify actual calendar equivalence/leap rejection, known and unknown source
behavior, IANA offset/DST fold/gap/skipped-date and historical-second rejection,
cross-profile and UTC binding, redacted errors/output, existing Bazi independent
reference and structural suites, producer rebuild and i18n/lint/typecheck.
Independent exact-head review and fresh CI precede merge; audited target
deployment and installed compiled smoke precede a deployed claim.

## Local verification receipt

179 checks pass across five Bazi suites:20 new real calendar/Intl/profile
checks plus159 existing pillar, normalized-chart, structure and independent
reference checks. Independent working-diff review replayed20/20 and found no
correctness/calendar/timezone/privacy/binding blocker. Initial five failures
were fixture expectations inventing a version field on the actual versionless
BaziFactsInputV1; expected shapes now match the existing schema, with no source
change or gate relaxation. Production-consumed producer builds and required
i18n/lint/typecheck pass; four existing unrelated lint warnings remain.

Actual supported modes are solar/lunar (including leap month), exact minute
fixed/IANA unique offset, and unknown fixed offset. Branch/range, unknown IANA,
DST gap/fold/skipped dates and historical second offsets are refused. Private
input resolution contains birth date/time; the normalized chart returned by the
calculation wrapper is redacted. Neither function is exposed to a browser/API
or wired to persistence. Authorizing stored ownership and saving original profile
plus resolved-input/mapping provenance remain server-caller responsibilities.
Physical provider calls, customer sends and financial writes:0. Full91 is open.
Final exact-head review and fresh CI remain required before merge/deployment.
